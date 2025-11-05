import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async sendEmail(userId: string, subject: string, body: string) {
    // Log email instead of sending (no BullMQ in SQLite version)
    this.logger.log(`Email to ${userId}: ${subject}`);
    await this.prisma.notification.create({ data: { userId, channel: 'email', subject, body } });
  }

  async getUserNotifications(userId: string) {
    return this.prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
  }
}