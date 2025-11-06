import { Controller, Get } from '@nestjs/common';
import { Public } from './common/decorators/public.decorator';
import { PrismaService } from './common/prisma/prisma.service';

@Controller()
export class AppController {
  constructor(private prisma: PrismaService) {}

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
    const health: any = {
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

    // Note: Redis check would go here if Redis is configured
    health.redis = process.env.REDIS_URL ? 'not_implemented' : 'not_configured';

    return health;
  }
}
