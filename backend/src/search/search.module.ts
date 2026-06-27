import {
  Controller, Get, Module, Injectable, Query, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { DatasetStatus, UserRole, UserStatus } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.module';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../auth/decorators/roles.decorator';

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async search(q: string, user: JwtPayload) {
    const query = q.trim();
    if (query.length < 2) {
      return { datasets: [], users: [], total: 0 };
    }

    // Datasets: same rules as listForClient — clients see only PUBLISHED
    const datasetWhere: any = {
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
        { category: { name: { contains: query, mode: 'insensitive' } } },
      ],
    };
    if (user.role === UserRole.CLIENT) {
      datasetWhere.status = DatasetStatus.PUBLISHED;
    }

    const datasets = await this.prisma.dataset.findMany({
      where: datasetWhere,
      take: 5,
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        fileType: true,
        category: { select: { id: true, name: true, slug: true } },
      },
    });

    // Users: admins only
    let users: any[] = [];
    if (user.role === UserRole.ADMIN) {
      users = await this.prisma.user.findMany({
        where: {
          OR: [
            { email: { contains: query, mode: 'insensitive' } },
            { fullName: { contains: query, mode: 'insensitive' } },
            { companyName: { contains: query, mode: 'insensitive' } },
          ],
        },
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          fullName: true,
          companyName: true,
          role: true,
          status: true,
        },
      });
    }

    return {
      datasets,
      users,
      total: datasets.length + users.length,
    };
  }
}

@ApiTags('search')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('search')
export class SearchController {
  constructor(private readonly svc: SearchService) {}

  @Get()
  search(@Query('q') q: string, @CurrentUser() user: JwtPayload) {
    return this.svc.search(q ?? '', user);
  }
}

@Module({
  controllers: [SearchController],
  providers: [SearchService],
})
export class SearchModule {}
