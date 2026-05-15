import {
  Body, Controller, Delete, Get, Module, Param, Patch, Post, Query,
  UseGuards, NotFoundException, ConflictException, BadRequestException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiProperty, ApiTags } from '@nestjs/swagger';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import { UserRole, UserStatus, Prisma, AuditAction } from '@prisma/client';
import { IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';

import { PrismaService } from '../prisma/prisma.module';
import { AuditService } from '../audit/audit.module';
import { EmailService } from '../email/email.module';
import { AuthService } from '../auth/auth.service';
import { AuthModule } from '../auth/auth.module';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles, CurrentUser, JwtPayload } from '../auth/decorators/roles.decorator';

// ─── DTOs ─────────────────────────────────────────────────────────

class InviteUserDto {
  @ApiProperty() @IsEmail() email: string;
  @ApiProperty() @IsString() @MinLength(2) fullName: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() companyName?: string;
  @ApiProperty({ enum: UserRole }) @IsEnum(UserRole) role: UserRole;
  @ApiProperty({ required: false }) @IsOptional() @IsString() notes?: string;
}

class CreateUserWithPasswordDto {
  @ApiProperty() @IsEmail() email: string;
  @ApiProperty() @IsString() @MinLength(2) fullName: string;
  @ApiProperty() @IsString() @MinLength(10) password: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() companyName?: string;
  @ApiProperty({ enum: UserRole }) @IsEnum(UserRole) role: UserRole;
  @ApiProperty({ required: false }) @IsOptional() @IsString() notes?: string;
}

class UpdateUserDto {
  @ApiProperty({ required: false }) @IsOptional() @IsString() fullName?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() companyName?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() notes?: string;
  @ApiProperty({ required: false, enum: UserRole }) @IsOptional() @IsEnum(UserRole) role?: UserRole;
  @ApiProperty({ required: false }) @IsOptional() @IsString() @MinLength(10) newPassword?: string;
}

// ─── Service ──────────────────────────────────────────────────────

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly email: EmailService,
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  // Invite via email — user sets their own password
  async invite(opts: InviteUserDto, invitedById: string) {
    const email = opts.email.toLowerCase().trim();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new ConflictException('A user with this email already exists');

    const inviteToken = uuidv4() + uuidv4();
    const inviteExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const user = await this.prisma.user.create({
      data: {
        email,
        fullName: opts.fullName,
        companyName: opts.companyName,
        notes: opts.notes,
        role: opts.role,
        status: UserStatus.PENDING_INVITE,
        inviteToken,
        inviteExpiresAt,
      },
    });

    await this.audit.log({
      action: AuditAction.USER_CREATED,
      actorId: invitedById,
      targetType: 'User',
      targetId: user.id,
      metadata: { email, role: opts.role, mode: 'invite' },
    });

    const url = `${this.config.get('FRONTEND_URL')}/accept-invite?token=${inviteToken}`;
    await this.email.sendInvite(user.email, user.fullName, url);
    return { user: this.publicUser(user), inviteLink: url };
  }

  // Direct create — admin sets the password (matches v3 wireframe flow)
  async createWithPassword(opts: CreateUserWithPasswordDto, createdById: string) {
    const email = opts.email.toLowerCase().trim();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new ConflictException('A user with this email already exists');

    const passwordHash = await this.authService.hashPassword(opts.password);

    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        fullName: opts.fullName,
        companyName: opts.companyName,
        notes: opts.notes,
        role: opts.role,
        status: UserStatus.ACTIVE,
      },
    });

    await this.audit.log({
      action: AuditAction.USER_CREATED,
      actorId: createdById,
      targetType: 'User',
      targetId: user.id,
      metadata: { email, role: opts.role, mode: 'direct' },
    });

    return this.publicUser(user);
  }

  async list(params: {
    skip?: number; take?: number; role?: UserRole; status?: UserStatus; search?: string;
  }) {
    const { skip = 0, take = 100, role, status, search } = params;
    const where: Prisma.UserWhereInput = {};
    if (role) where.role = role;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { fullName: { contains: search, mode: 'insensitive' } },
        { companyName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        skip,
        take: Math.min(take, 200),
        orderBy: [{ role: 'asc' }, { createdAt: 'desc' }],
        include: { _count: { select: { datasetAccess: true } } },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      items: items.map((u) => ({ ...this.publicUser(u), datasetCount: u._count.datasetAccess })),
      total,
      skip,
      take,
    };
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException();
    return this.publicUser(user);
  }

  async update(id: string, dto: UpdateUserDto, actorId: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException();

    // Last-admin guard
    if (dto.role && dto.role !== UserRole.ADMIN && user.role === UserRole.ADMIN) {
      const adminCount = await this.prisma.user.count({
        where: { role: UserRole.ADMIN, status: UserStatus.ACTIVE },
      });
      if (adminCount <= 1) {
        throw new BadRequestException('Cannot demote the only active admin');
      }
    }

    const data: Prisma.UserUpdateInput = {};
    if (dto.fullName !== undefined) data.fullName = dto.fullName;
    if (dto.companyName !== undefined) data.companyName = dto.companyName;
    if (dto.notes !== undefined) data.notes = dto.notes;
    if (dto.role !== undefined) data.role = dto.role;
    if (dto.newPassword) {
      data.passwordHash = await this.authService.hashPassword(dto.newPassword);
      // Sign user out everywhere
      await this.prisma.refreshToken.updateMany({
        where: { userId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }

    const updated = await this.prisma.user.update({ where: { id }, data });

    await this.audit.log({
      action: AuditAction.USER_UPDATED,
      actorId,
      targetType: 'User',
      targetId: id,
      metadata: {
        ...(dto.role ? { newRole: dto.role } : {}),
        ...(dto.newPassword ? { passwordReset: true } : {}),
      },
    });

    return this.publicUser(updated);
  }

  async disable(id: string, actorId: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException();
    if (user.role === UserRole.ADMIN) {
      const adminCount = await this.prisma.user.count({
        where: { role: UserRole.ADMIN, status: UserStatus.ACTIVE },
      });
      if (adminCount <= 1) throw new BadRequestException('Cannot revoke the only active admin');
    }
    if (id === actorId) throw new BadRequestException('You cannot revoke your own access');

    const updated = await this.prisma.user.update({
      where: { id },
      data: { status: UserStatus.DISABLED },
    });
    await this.prisma.refreshToken.updateMany({
      where: { userId: id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await this.audit.log({
      action: AuditAction.USER_DISABLED,
      actorId, targetType: 'User', targetId: id,
    });
    return this.publicUser(updated);
  }

  async restore(id: string, actorId: string) {
    const updated = await this.prisma.user.update({
      where: { id },
      data: { status: UserStatus.ACTIVE },
    });
    await this.audit.log({
      action: AuditAction.USER_RESTORED,
      actorId, targetType: 'User', targetId: id,
    });
    return this.publicUser(updated);
  }

  async delete(id: string, actorId: string) {
  if (id === actorId) throw new BadRequestException('You cannot delete your own account');
  const user = await this.prisma.user.findUnique({ where: { id } });
  if (!user) throw new NotFoundException();

  // Last-admin guard
  if (user.role === UserRole.ADMIN) {
    const adminCount = await this.prisma.user.count({
      where: { role: UserRole.ADMIN, status: UserStatus.ACTIVE },
    });
    if (adminCount <= 1) throw new BadRequestException('Cannot delete the only active admin');
  }

  // Clear child rows in a single transaction
  await this.prisma.$transaction([
    this.prisma.refreshToken.deleteMany({ where: { userId: id } }),
    this.prisma.datasetAccess.deleteMany({ where: { userId: id } }),
    this.prisma.download.deleteMany({ where: { userId: id } }),
    // Audit events: keep the history but null-out the actor
    this.prisma.auditEvent.updateMany({
      where: { actorId: id },
      data: { actorId: null },
    }),
    this.prisma.user.delete({ where: { id } }),
  ]);

  await this.audit.log({
    action: AuditAction.USER_DELETED,
    actorId, targetType: 'User', targetId: id,
    metadata: { email: user.email, name: user.fullName },
  });
}

  async accessFor(userId: string) {
    return this.prisma.datasetAccess.findMany({
      where: { userId },
      include: {
        dataset: {
          select: { id: true, name: true, slug: true, category: true, status: true, fileType: true },
        },
      },
      orderBy: { grantedAt: 'desc' },
    });
  }

  private publicUser(u: any) {
    const { passwordHash, mfaSecret, inviteToken, resetToken, ...rest } = u;
    return rest;
  }
}

// ─── Controller ────────────────────────────────────────────────────

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  list(
    @Query('skip') skip?: string,
    @Query('take') take?: string,
    @Query('role') role?: UserRole,
    @Query('status') status?: UserStatus,
    @Query('search') search?: string,
  ) {
    return this.users.list({
      skip: skip ? Number(skip) : undefined,
      take: take ? Number(take) : undefined,
      role, status, search,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.users.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateUserWithPasswordDto, @CurrentUser() actor: JwtPayload) {
    return this.users.createWithPassword(dto, actor.sub);
  }

  @Post('invite')
  invite(@Body() dto: InviteUserDto, @CurrentUser() actor: JwtPayload) {
    return this.users.invite(dto, actor.sub);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateUserDto, @CurrentUser() actor: JwtPayload) {
    return this.users.update(id, dto, actor.sub);
  }

  @Post(':id/disable')
  disable(@Param('id') id: string, @CurrentUser() actor: JwtPayload) {
    return this.users.disable(id, actor.sub);
  }

  @Post(':id/restore')
  restore(@Param('id') id: string, @CurrentUser() actor: JwtPayload) {
    return this.users.restore(id, actor.sub);
  }

  @Delete(':id')
  delete(@Param('id') id: string, @CurrentUser() actor: JwtPayload) {
    return this.users.delete(id, actor.sub);
  }

  @Get(':id/access')
  access(@Param('id') id: string) {
    return this.users.accessFor(id);
  }
}

@Module({
  imports: [AuthModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
