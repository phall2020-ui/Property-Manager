import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { NotificationRoutingService } from './notification-routing.service';
import { EmailService } from './email.service';
import { PrismaModule } from '../../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationRoutingService, EmailService],
  exports: [NotificationsService, NotificationRoutingService, EmailService],
})
export class NotificationsModule {}
