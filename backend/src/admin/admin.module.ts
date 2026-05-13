import { Controller, Get, Module, Injectable, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole, UserStatus, DatasetStatus } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.module';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async stats() {
    const [
      totalUsers, activeUsers, totalDatasets, publishedDatasets,
      totalDownloads, recentDownloads, recentEvents, topDatasets,
    ] = await this.prisma.$transaction([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { status: UserStatus.ACTIVE, role: UserRole.CLIENT } }),
      this.prisma.dataset.count(),
      this.prisma.dataset.count({ where: { status: DatasetStatus.PUBLISHED } }),
      this.prisma.download.count(),
      this.prisma.download.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { email: true, fullName: true, companyName: true } },
          dataset: { select: { name: true } },
        },
      }),
      this.prisma.auditEvent.findMany({
        take: 8,
        orderBy: { createdAt: 'desc' },
        include: { actor: { select: { email: true, fullName: true } } },
      }),
      this.prisma.dataset.findMany({
        take: 5,
        orderBy: { downloads: { _count: 'desc' } },
        where: { status: DatasetStatus.PUBLISHED },
        include: { _count: { select: { downloads: true } } },
      }),
    ]);

    return {
      counts: { totalUsers, activeUsers, totalDatasets, publishedDatasets, totalDownloads },
      recentDownloads,
      recentEvents,
      topDatasets,
    };
  }
}

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.DATA_MANAGER)
@Controller('admin')
export class AdminController {
  constructor(private readonly svc: AdminService) {}

  @Get('stats')
  stats() { return this.svc.stats(); }
}

@Module({
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
