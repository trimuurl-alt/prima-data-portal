import { Controller, Get, Module, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.module';

@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}

  async check() {
    const startedAt = Date.now();
    let database: 'ok' | 'error' = 'ok';
    let dbError: string | undefined;

    try {
      // Lightweight query that touches the DB — keeps Supabase from pausing
      await this.prisma.$queryRaw`SELECT 1`;
    } catch (e) {
      database = 'error';
      dbError = (e as Error).message;
    }

    return {
      status: database === 'ok' ? 'ok' : 'degraded',
      uptime: Math.round(process.uptime()),
      database,
      ...(dbError ? { dbError } : {}),
      timestamp: new Date().toISOString(),
      responseTimeMs: Date.now() - startedAt,
    };
  }
}

@Controller('health')
export class HealthController {
  constructor(private readonly svc: HealthService) {}

  @Get()
  check() {
    return this.svc.check();
  }
}

@Module({
  controllers: [HealthController],
  providers: [HealthService],
})
export class HealthModule {}
