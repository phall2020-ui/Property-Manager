import { Module, DynamicModule, Global } from '@nestjs/common';
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
 * - Gracefully handles Redis not being available (logs warnings but doesn't crash)
 */
@Global()
@Module({})
export class JobsModule {
  static forRoot(): DynamicModule {
    const imports = [ConfigModule];
    const providers = [JobsService];
    const exports = [JobsService];

    return {
      module: JobsModule,
      imports: [
        ...imports,
        BullModule.forRootAsync({
          imports: [ConfigModule],
          useFactory: async (configService: ConfigService) => {
            const redisUrl = configService.get<string>('REDIS_URL');
            
            // If no Redis URL, BullMQ won't be initialized (jobs will log but not process)
            if (!redisUrl) {
              console.warn('⚠️  REDIS_URL not configured - Background jobs will be logged but not processed');
              console.warn('⚠️  Set REDIS_URL environment variable to enable background job processing');
              // Return minimal config that won't try to connect
              return {
                connection: {
                  host: 'localhost',
                  port: 6379,
                  // Set very short timeout so it fails fast
                  connectTimeout: 1000,
                  lazyConnect: true, // Don't connect on startup
                },
              };
            }

            try {
              const url = new URL(redisUrl);
              
              return {
                connection: {
                  host: url.hostname,
                  port: parseInt(url.port) || 6379,
                  password: url.password || undefined,
                  db: parseInt(url.searchParams.get('db') || '0'),
                  lazyConnect: false,
                  enableOfflineQueue: false,
                  maxRetriesPerRequest: 3,
                  retryStrategy: (times: number) => {
                    if (times > 3) {
                      console.error('❌ Redis connection failed after 3 attempts - background jobs disabled');
                      return null; // Stop retrying
                    }
                    return Math.min(times * 1000, 3000); // 1s, 2s, 3s
                  },
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
            } catch (error) {
              console.error('❌ Invalid REDIS_URL format:', error.message);
              throw error;
            }
          },
          inject: [ConfigService],
        }),
        BullModule.registerQueue(
          { name: 'tickets' },
          { name: 'notifications' },
          { name: 'dead-letter' },
        ),
      ],
      providers: [...providers, TicketJobsProcessor],
      exports,
    };
  }
}
