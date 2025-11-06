import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TicketJobsProcessor } from './processors/ticket-jobs.processor';
import { JobsService } from './jobs.service';

/**
 * Jobs Module - Handles background job processing with BullMQ
 * 
 * Features:
 * - Ticket lifecycle event processing
 * - Notifications (email/SMS triggers)
 * - Exponential retry with 3 attempts
 * - Dead letter queue for failed jobs
 */
@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const redisUrl = configService.get<string>('REDIS_URL') || 'redis://localhost:6379';
        const url = new URL(redisUrl);
        
        return {
          connection: {
            host: url.hostname,
            port: parseInt(url.port) || 6379,
            password: url.password || undefined,
            db: parseInt(url.searchParams.get('db') || '0'),
          },
          defaultJobOptions: {
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 2000, // Start with 2 seconds, then 4s, 8s
            },
            removeOnComplete: {
              age: 3600, // Keep completed jobs for 1 hour
              count: 1000,
            },
            removeOnFail: {
              age: 86400, // Keep failed jobs for 24 hours
              count: 100,
            },
          },
        };
      },
      inject: [ConfigService],
    }),
    BullModule.registerQueue(
      { name: 'tickets' },
      { name: 'notifications' },
      { name: 'dead-letter' },
    ),
  ],
  providers: [JobsService, TicketJobsProcessor],
  exports: [JobsService, BullModule],
})
export class JobsModule {}
