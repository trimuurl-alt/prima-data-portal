import { Module, Injectable, Logger, Global } from '@nestjs/common';
import { Prisma, AuditAction, UserRole } from '@prisma/client';
import {
  Controller, Get, Query, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { PrismaService } from '../prisma/prisma.module';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

interface LogOptions {
  action: AuditAction;
  actorId?: string;
  targetType?: string;
  targetId?: string;
  metadata?: Prisma.InputJsonValue;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async log(opts: LogOptions): Promise<void> {
    try {
      await this.prisma.auditEvent.create({
        data: {
          action: opts.action,
          actorId: opts.actorId,
          targetType: opts.targetType,
          targetId: opts.targetId,
          metadata: opts.metadata,
          ipAddress: opts.ipAddress,
          userAgent: opts.userAgent,
        },
      });
    } catch (err) {
      // Audit failure must never block primary operation
      this.logger.error(`Audit write failed: ${(err as Error).message}`);
    }
  }

  async list(params: {
    skip?: number;
    take?: number;
    action?: AuditAction;
    actorId?: string;
    search?: string;
    sortBy?: 'createdAt' | 'actor' | 'action';
    sortOrder?: 'asc' | 'desc';
  }) {
    const { skip = 0, take = 50, action, actorId, search,
            sortBy = 'createdAt', sortOrder = 'desc' } = params;
    const where: Prisma.AuditEventWhereInput = {};
    if (action) where.action = action;
    if (actorId) where.actorId = actorId;
    if (search) {
      where.OR = [
        { actor: { email: { contains: search, mode: 'insensitive' } } },
        { actor: { fullName: { contains: search, mode: 'insensitive' } } },
        { actor: { companyName: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const orderBy: Prisma.AuditEventOrderByWithRelationInput =
      sortBy === 'actor'  ? { actor: { fullName: sortOrder } } :
      sortBy === 'action' ? { action: sortOrder } :
                            { createdAt: sortOrder };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.auditEvent.findMany({
        where,
        skip,
        take: Math.min(take, 200),
        orderBy,
        include: {
          actor: { select: { id: true, email: true, fullName: true, companyName: true, role: true } },
        },
      }),
      this.prisma.auditEvent.count({ where }),
    ]);

    // Enrich with target dataset names where applicable
    const datasetIds = items
      .filter((e) => e.targetType === 'Dataset' && e.targetId)
      .map((e) => e.targetId!) as string[];

    let datasetMap: Map<string, string> = new Map();
    if (datasetIds.length > 0) {
      const datasets = await this.prisma.dataset.findMany({
        where: { id: { in: datasetIds } },
        select: { id: true, name: true },
      });
      datasetMap = new Map(datasets.map((d) => [d.id, d.name]));
    }

    const enriched = items.map((e) => ({
      ...e,
      targetName:
        e.targetType === 'Dataset' && e.targetId && datasetMap.has(e.targetId)
          ? datasetMap.get(e.targetId)
          : (e.metadata as any)?.name ?? null,
    }));

    return { items: enriched, total, skip, take };
  }
}

@ApiTags('audit')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('audit')
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  list(
    @Query('skip') skip?: string,
    @Query('take') take?: string,
    @Query('action') action?: AuditAction,
    @Query('actorId') actorId?: string,
    @Query('search') search?: string,
    @Query('sortBy') sortBy?: 'createdAt' | 'actor' | 'action',
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ) {
    return this.audit.list({
      skip: skip ? Number(skip) : undefined,
      take: take ? Number(take) : undefined,
      action, actorId, search, sortBy, sortOrder,
    });
  }
}

@Global()
@Module({
  controllers: [AuditController],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
