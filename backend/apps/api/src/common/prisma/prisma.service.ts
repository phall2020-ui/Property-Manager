import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { tenantMiddleware } from './tenant.middleware';
import { TenantContext } from '../context/tenant.context';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super();
    // Register tenant middleware to automatically scope queries by tenantId
    this.$use(tenantMiddleware(() => TenantContext.current()));
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Prisma client connected with tenant middleware');
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Prisma client disconnected');
  }
}