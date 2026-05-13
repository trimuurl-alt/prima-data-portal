import {
  Body, Controller, Delete, Get, Module, Param, Post, UseGuards,
  Injectable, ConflictException, NotFoundException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiProperty, ApiTags } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';
import { AuditAction, UserRole } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.module';
import { AuditService } from '../audit/audit.module';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles, CurrentUser, JwtPayload } from '../auth/decorators/roles.decorator';

class GrantAccessDto {
  @ApiProperty() @IsUUID() userId: string;
  @ApiProperty() @IsUUID() datasetId: string;
}

@Injectable()
export class AccessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async grant(userId: string, datasetId: string, grantedById: string) {
    const existing = await this.prisma.datasetAccess.findUnique({
      where: { userId_datasetId: { userId, datasetId } },
    });
    if (existing) throw new ConflictException('Access already granted');

    const row = await this.prisma.datasetAccess.create({
      data: { userId, datasetId, grantedById },
    });

    await this.audit.log({
      action: AuditAction.ACCESS_GRANTED,
      actorId: grantedById,
      targetType: 'DatasetAccess',
      targetId: row.id,
      metadata: { userId, datasetId },
    });

    return row;
  }

  async revoke(userId: string, datasetId: string, actorId: string) {
    const existing = await this.prisma.datasetAccess.findUnique({
      where: { userId_datasetId: { userId, datasetId } },
    });
    if (!existing) throw new NotFoundException('No access grant found');

    await this.prisma.datasetAccess.delete({ where: { id: existing.id } });

    await this.audit.log({
      action: AuditAction.ACCESS_REVOKED,
      actorId, targetType: 'DatasetAccess', targetId: existing.id,
      metadata: { userId, datasetId },
    });
  }

  async usersWithAccess(datasetId: string) {
    return this.prisma.datasetAccess.findMany({
      where: { datasetId },
      include: {
        user: { select: { id: true, email: true, fullName: true, companyName: true, role: true, status: true } },
      },
      orderBy: { grantedAt: 'desc' },
    });
  }
}

@ApiTags('access')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('access')
export class AccessController {
  constructor(private readonly svc: AccessService) {}

  @Post()
  grant(@Body() dto: GrantAccessDto, @CurrentUser() actor: JwtPayload) {
    return this.svc.grant(dto.userId, dto.datasetId, actor.sub);
  }

  @Delete(':userId/:datasetId')
  revoke(
    @Param('userId') userId: string,
    @Param('datasetId') datasetId: string,
    @CurrentUser() actor: JwtPayload,
  ) {
    return this.svc.revoke(userId, datasetId, actor.sub);
  }

  @Get('dataset/:datasetId')
  forDataset(@Param('datasetId') datasetId: string) {
    return this.svc.usersWithAccess(datasetId);
  }
}

@Module({
  controllers: [AccessController],
  providers: [AccessService],
  exports: [AccessService],
})
export class AccessModule {}
