import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { NotificationRouterService } from './notification-router.service';
import { EmailService } from './email.service';
import { PrismaModule } from '../../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationRouterService, EmailService],
  exports: [NotificationsService, NotificationRouterService, EmailService],
})
export class NotificationsModule {}
