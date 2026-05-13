import {
  Body, Controller, Get, HttpCode, HttpStatus, Post, Req, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';

import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from './decorators/roles.decorator';
import {
  LoginDto, RefreshDto, RequestResetDto, CompleteResetDto,
  AcceptInviteDto, ConfirmMfaDto, ChangePasswordDto,
} from './dto/auth.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto, @Req() req: Request) {
    return this.auth.login(dto.email, dto.password, dto.mfaCode, {
      ipAddress: req.ip, userAgent: req.get('user-agent') ?? undefined,
    });
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Body() dto: RefreshDto, @Req() req: Request) {
    return this.auth.refresh(dto.refreshToken, {
      ipAddress: req.ip, userAgent: req.get('user-agent') ?? undefined,
    });
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  logout(@CurrentUser() user: JwtPayload) {
    return this.auth.logout(user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('me')
  me(@CurrentUser() user: JwtPayload) {
    return this.auth.me(user.sub);
  }

  @Post('password/reset/request')
  @HttpCode(HttpStatus.NO_CONTENT)
  async requestReset(@Body() dto: RequestResetDto) {
    await this.auth.requestPasswordReset(dto.email);
  }

  @Post('password/reset/complete')
  @HttpCode(HttpStatus.NO_CONTENT)
  async completeReset(@Body() dto: CompleteResetDto) {
    await this.auth.completePasswordReset(dto.token, dto.newPassword);
  }

  @Post('invite/accept')
  @HttpCode(HttpStatus.NO_CONTENT)
  async acceptInvite(@Body() dto: AcceptInviteDto) {
    await this.auth.acceptInvite(dto.token, dto.password);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('password/change')
  @HttpCode(HttpStatus.NO_CONTENT)
  async changePassword(@CurrentUser() user: JwtPayload, @Body() dto: ChangePasswordDto) {
    await this.auth.changePassword(user.sub, dto.currentPassword, dto.newPassword);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('mfa/setup')
  setupMfa(@CurrentUser() user: JwtPayload) {
    return this.auth.setupMfa(user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('mfa/confirm')
  @HttpCode(HttpStatus.NO_CONTENT)
  confirmMfa(@CurrentUser() user: JwtPayload, @Body() dto: ConfirmMfaDto) {
    return this.auth.confirmMfa(user.sub, dto.code);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('mfa/disable')
  @HttpCode(HttpStatus.NO_CONTENT)
  disableMfa(@CurrentUser() user: JwtPayload) {
    return this.auth.disableMfa(user.sub);
  }
}
