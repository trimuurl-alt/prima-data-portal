import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, IsOptional, MinLength, Matches } from 'class-validator';

const STRONG_PASSWORD = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{10,}$/;

export class LoginDto {
  @ApiProperty() @IsEmail() email: string;
  @ApiProperty() @IsString() @MinLength(1) password: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() mfaCode?: string;
}

export class RefreshDto {
  @ApiProperty() @IsString() refreshToken: string;
}

export class RequestResetDto {
  @ApiProperty() @IsEmail() email: string;
}

export class CompleteResetDto {
  @ApiProperty() @IsString() token: string;
  @ApiProperty() @IsString() @Matches(STRONG_PASSWORD, {
    message: 'Password must be 10+ chars with upper, lower, and a number',
  })
  newPassword: string;
}

export class AcceptInviteDto {
  @ApiProperty() @IsString() token: string;
  @ApiProperty() @IsString() @Matches(STRONG_PASSWORD, {
    message: 'Password must be 10+ chars with upper, lower, and a number',
  })
  password: string;
}

export class ChangePasswordDto {
  @ApiProperty() @IsString() currentPassword: string;
  @ApiProperty() @IsString() @Matches(STRONG_PASSWORD, {
    message: 'Password must be 10+ chars with upper, lower, and a number',
  })
  newPassword: string;
}

export class ConfirmMfaDto {
  @ApiProperty() @IsString() code: string;
}
