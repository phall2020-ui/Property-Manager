import { Controller, Get } from '@nestjs/common';
import { Public } from './common/decorators/public.decorator';
import { PrismaService } from './common/prisma/prisma.service';
import { JobsService } from './modules/jobs/jobs.service';

@Controller()
export class AppController {
  constructor(
    private prisma: PrismaService,
    private jobsService: JobsService,
  ) {}

  @Public()
  @Get()
  getHealth() {
    return {
      status: 'ok',
      message: 'Property Management API',
      timestamp: new Date().toISOString(),
    };
  }

  @Public()
  @Get('health')
  async getHealthCheck() {
    const health: {
      status: string;
      timestamp: string;
      version: string;
      environment: string;
      database?: string;
      redis?: string;
    } = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: process.env.BUILD_SHA || 'dev',
      environment: process.env.NODE_ENV || 'development',
    };

    // Check database connectivity
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      health.database = 'connected';
    } catch (error) {
      health.database = 'error';
      health.status = 'degraded';
    }

    // Check Redis/Jobs connectivity
    if (process.env.REDIS_URL) {
      health.redis = this.jobsService.isRedisAvailable() ? 'connected' : 'disconnected';
      if (!this.jobsService.isRedisAvailable()) {
        health.status = 'degraded';
      }
    } else {
      health.redis = 'not_configured';
    }

    return health;
  }
}
