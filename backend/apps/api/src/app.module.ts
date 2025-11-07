import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import configuration from './common/configuration';
import { PrismaModule } from './common/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { PropertiesModule } from './modules/properties/properties.module';
import { TenanciesModule } from './modules/tenancies/tenancies.module';
import { TicketsModule } from './modules/tickets/tickets.module';
import { LandlordModule } from './modules/landlord/landlord.module';
import { FinanceModule } from './modules/finance/finance.module';
import { ComplianceModule } from './modules/compliance/compliance.module';
import { BankingModule } from './modules/banking/banking.module';
import { FlagsModule } from './modules/flags/flags.module';
import { EventsModule } from './modules/events/events.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { JobsModule } from './modules/jobs/jobs.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { QueueModule } from './modules/queue/queue.module';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { TimeoutInterceptor } from './common/interceptors/timeout.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { AuthGuard } from './common/guards/auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { TraceIdMiddleware } from './common/middleware/trace-id.middleware';
import { TenantMiddleware } from './common/middleware/tenant.middleware';
import { IdempotencyMiddleware } from './common/middleware/idempotency.middleware';
import { AppController } from './app.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    // Rate limiting (Step 1: Throttle login by IP and email)
    ThrottlerModule.forRoot([{
      ttl: 60000, // 60 seconds
      limit: 10, // 10 requests per minute
    }]),
    PrismaModule,
    AuthModule,
    UsersModule,
    PropertiesModule,
    TenanciesModule,
    TicketsModule,
    LandlordModule,
    FinanceModule,
    ComplianceModule,
    BankingModule,
    FlagsModule,
    EventsModule,
    NotificationsModule,
    JobsModule.forRoot(),
    DocumentsModule,
    QueueModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TimeoutInterceptor,
    },
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard, // Step 1: Rate limiting guard
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard, // Role-based access control for org-based multi-tenancy
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(TraceIdMiddleware, TenantMiddleware)
      .forRoutes('*');
    
    // Apply idempotency middleware to critical finance endpoints
    consumer
      .apply(IdempotencyMiddleware)
      .forRoutes(
        'finance/invoices',
        'finance/payments',
        'finance/mandates',
      );
  }
}