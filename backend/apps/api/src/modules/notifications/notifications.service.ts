import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

export interface CreateNotificationDto {
  userId: string;
  type: string;
  title: string;
  message: string;
  resourceType?: string;
  resourceId?: string;
}

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a notification for a user
   */
  async create(dto: CreateNotificationDto) {
    return this.prisma.notification.create({
      data: dto,
    });
  }

  /**
   * Create notifications for multiple users
   */
  async createMany(userIds: string[], notificationData: Omit<CreateNotificationDto, 'userId'>) {
    const notifications = userIds.map((userId) => ({
      userId,
      ...notificationData,
    }));

    await this.prisma.notification.createMany({
      data: notifications,
    });
  }

  /**
   * Get notifications for a user
   */
  async findByUser(userId: string, limit = 50, onlyUnread = false) {
    const where: any = { userId };
    
    if (onlyUnread) {
      where.isRead = false;
    }

    return this.prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Get unread count for a user
   */
  async getUnreadCount(userId: string): Promise<number> {
    return this.prisma.notification.count({
      where: {
        userId,
        isRead: false,
      },
    });
  }

  /**
   * Mark notifications as read
   */
  async markAsRead(userId: string, notificationIds: string[]) {
    // Verify all notifications belong to the user
    const notifications = await this.prisma.notification.findMany({
      where: {
        id: { in: notificationIds },
        userId,
      },
    });

    if (notifications.length !== notificationIds.length) {
      throw new NotFoundException('Some notifications not found or do not belong to user');
    }

    return this.prisma.notification.updateMany({
      where: {
        id: { in: notificationIds },
        userId,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  }

  /**
   * Delete old read notifications (cleanup job)
   */
  async deleteOldNotifications(daysOld = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    return this.prisma.notification.deleteMany({
      where: {
        isRead: true,
        readAt: {
          lt: cutoffDate,
        },
      },
    });
  }
}
