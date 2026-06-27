import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import * as speakeasy from 'speakeasy';
import * as qrcode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';
import { createHash } from 'crypto';

import { PrismaService } from '../prisma/prisma.module';
import { AuditService } from '../audit/audit.module';
import { EmailService } from '../email/email.module';
import { AuditAction, UserStatus, UserRole } from '@prisma/client';

interface Ctx {
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
    private readonly email: EmailService,
  ) {}

  // ─── Password hashing ──────────────────────────────────────

  async hashPassword(plain: string): Promise<string> {
    return bcrypt.hash(plain, 12);
  }

  async verifyPassword(hash: string, plain: string): Promise<boolean> {
    try { return await bcrypt.compare(plain, hash); }
    catch { return false; }
  }

  // ─── Login ────────────────────────────────────────────────

  async login(email: string, password: string, mfaCode: string | undefined, ctx: Ctx) {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user || !user.passwordHash || user.status !== UserStatus.ACTIVE) {
      await this.audit.log({
        action: AuditAction.LOGIN_FAILURE,
        metadata: { email, reason: 'user-not-active' },
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      });
      throw new UnauthorizedException('Invalid email or password');
    }

    const ok = await this.verifyPassword(user.passwordHash, password);
    if (!ok) {
      await this.audit.log({
        action: AuditAction.LOGIN_FAILURE,
        actorId: user.id,
        metadata: { reason: 'bad-password' },
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      });
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.mfaEnabled) {
      if (!mfaCode) {
        // Special signal so frontend prompts for MFA code
        throw new UnauthorizedException({ message: 'MFA required', code: 'MFA_REQUIRED' });
      }
      const valid = speakeasy.totp.verify({
        secret: user.mfaSecret!,
        encoding: 'base32',
        token: mfaCode,
        window: 1,
      });
      if (!valid) {
        await this.audit.log({
          action: AuditAction.LOGIN_FAILURE,
          actorId: user.id,
          metadata: { reason: 'bad-mfa' },
          ipAddress: ctx.ipAddress,
          userAgent: ctx.userAgent,
        });
        throw new UnauthorizedException({ message: 'Invalid MFA code', code: 'MFA_REQUIRED' });
      }
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    await this.audit.log({
      action: AuditAction.LOGIN_SUCCESS,
      actorId: user.id,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    const tokens = await this.issueTokens(user.id, user.email, user.role, ctx);
    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        companyName: user.companyName,
        mfaEnabled: user.mfaEnabled,
      },
    };
  }

  // ─── Token issue + refresh ────────────────────────────────

  private async issueTokens(userId: string, email: string, role: UserRole, ctx: Ctx) {
    const accessToken = await this.jwt.signAsync(
      { sub: userId, email, role },
      {
        secret: this.config.get('JWT_ACCESS_SECRET'),
        expiresIn: this.config.get('JWT_ACCESS_TTL') ?? '15m',
      },
    );

    const refreshTokenRaw = uuidv4() + uuidv4();
    const refreshTokenHash = createHash('sha256').update(refreshTokenRaw).digest('hex');

    const ttlDays = Number((this.config.get('JWT_REFRESH_TTL') ?? '7d').replace('d', ''));
    const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);

    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: refreshTokenHash,
        expiresAt,
        userAgent: ctx.userAgent,
        ipAddress: ctx.ipAddress,
      },
    });

    return { accessToken, refreshToken: refreshTokenRaw, expiresAt };
  }

  async refresh(refreshTokenRaw: string, ctx: Ctx) {
    const tokenHash = createHash('sha256').update(refreshTokenRaw).digest('hex');
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    if (stored.user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Account disabled');
    }

    // Rotate: revoke current, issue new pair
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    return this.issueTokens(stored.user.id, stored.user.email, stored.user.role, ctx);
  }

  async logout(userId: string) {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await this.audit.log({ action: AuditAction.LOGOUT, actorId: userId });
  }

  // ─── Password reset (self-service) ────────────────────────

  async requestPasswordReset(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });
    if (!user || user.status !== UserStatus.ACTIVE) return; // silently ignore — no enumeration

    const token = uuidv4() + uuidv4();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { resetToken: token, resetExpiresAt: expiresAt },
    });

    await this.audit.log({ action: AuditAction.PASSWORD_RESET_REQUESTED, actorId: user.id });

    const url = `${this.config.get('FRONTEND_URL')}/reset-password?token=${token}`;
    await this.email.sendPasswordReset(user.email, user.fullName, url);
  }

  async completePasswordReset(token: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { resetToken: token } });
    if (!user || !user.resetExpiresAt || user.resetExpiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired token');
    }

    const passwordHash = await this.hashPassword(newPassword);
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        resetToken: null,
        resetExpiresAt: null,
        status: UserStatus.ACTIVE,
      },
    });

    // Sign out everywhere
    await this.prisma.refreshToken.updateMany({
      where: { userId: user.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    await this.audit.log({ action: AuditAction.PASSWORD_RESET_COMPLETED, actorId: user.id });
  }

  // ─── Invite acceptance ────────────────────────────────────

  async acceptInvite(token: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { inviteToken: token } });
    if (!user || !user.inviteExpiresAt || user.inviteExpiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired invite');
    }

    const passwordHash = await this.hashPassword(password);
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        status: UserStatus.ACTIVE,
        inviteToken: null,
        inviteExpiresAt: null,
      },
    });

    await this.audit.log({ action: AuditAction.PASSWORD_CHANGED, actorId: user.id });
  }

  // ─── Change password (authenticated) ──────────────────────

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.passwordHash) throw new UnauthorizedException();

    const ok = await this.verifyPassword(user.passwordHash, currentPassword);
    if (!ok) throw new UnauthorizedException('Current password is incorrect');

    const passwordHash = await this.hashPassword(newPassword);
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash } });

    await this.audit.log({ action: AuditAction.PASSWORD_CHANGED, actorId: userId });
  }

  // ─── MFA setup ────────────────────────────────────────────

  async setupMfa(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();

    const secret = speakeasy.generateSecret({
      name: `Prima Data Portal (${user.email})`,
      issuer: 'Prima Data Portal',
    });

    await this.prisma.user.update({
      where: { id: userId },
      data: { mfaSecret: secret.base32, mfaEnabled: false },
    });

    const qrDataUrl = await qrcode.toDataURL(secret.otpauth_url!);
    return { secret: secret.base32, qrDataUrl, otpauthUrl: secret.otpauth_url };
  }

  async confirmMfa(userId: string, code: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.mfaSecret) throw new BadRequestException('MFA not initialised');

    const valid = speakeasy.totp.verify({
      secret: user.mfaSecret,
      encoding: 'base32',
      token: code,
      window: 1,
    });
    if (!valid) throw new BadRequestException('Invalid code');

    await this.prisma.user.update({
      where: { id: userId },
      data: { mfaEnabled: true },
    });

    await this.audit.log({ action: AuditAction.MFA_ENABLED, actorId: userId });
  }

  async disableMfa(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { mfaEnabled: false, mfaSecret: null },
    });
    await this.audit.log({ action: AuditAction.MFA_DISABLED, actorId: userId });
  }

  // ─── Whoami ───────────────────────────────────────────────

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, email: true, fullName: true, role: true,
        companyName: true, mfaEnabled: true, lastLoginAt: true, createdAt: true,
      },
    });
    return user;
  }
}
