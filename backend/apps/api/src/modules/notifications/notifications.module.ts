import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule } from '@nestjs/config';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { NotificationRouterService } from './notification-router.service';
import { EmailService } from './email.service';
import { NotificationsProcessor } from './notifications.processor';
import { PrismaModule } from '../../common/prisma/prisma.module';

/**
 * Notifications Module - Handles notification delivery and queue processing
 * 
 * Features:
 * - REST API for managing notifications
 * - Background job processing via BullMQ (notifications queue)
 * - Email delivery with retry logic
 * - Ticket event notifications
 * - Feature flag support via NOTIFICATIONS_ENABLED
 */
@Module({
  imports: [
    PrismaModule,
    ConfigModule,
    BullModule.registerQueue({
      name: 'notifications',
    }),
  ],
  controllers: [NotificationsController],
  providers: [
    NotificationsService, 
    NotificationRouterService, 
    EmailService,
    NotificationsProcessor,
  ],
  exports: [
    NotificationsService, 
    NotificationRouterService, 
    EmailService,
  ],
})
export class NotificationsModule {}
