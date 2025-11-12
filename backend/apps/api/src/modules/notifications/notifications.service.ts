import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { EmailService } from './email.service';

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
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

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

  /**
   * Route notification to appropriate channels based on event type and user preferences
   */
  async routeNotification(
    userId: string,
    eventType: string,
    notificationData: Omit<CreateNotificationDto, 'userId'>,
    entityId?: string,
    version?: string,
  ) {
    // Generate idempotency key
    const idempotencyKey = `${eventType}:${entityId || 'none'}:${version || Date.now()}`;

    // Check if notification already sent
    const existing = await this.prisma.notification.findUnique({
      where: { idempotencyKey },
    });

    if (existing) {
      return { status: 'duplicate', notification: existing };
    }

    // Get user preferences (fallback to defaults if not set)
    const preferences = await this.prisma.notificationPreference.findUnique({
      where: { userId },
    });

    // Determine which channels to use based on preferences
    const channels = this.getChannelsForEvent(eventType, preferences);

    // Create notifications for each channel
    const notifications = [];
    for (const channel of channels) {
      const notification = await this.prisma.notification.create({
        data: {
          ...notificationData,
          userId,
          channel,
          idempotencyKey: channel === 'in-app' ? idempotencyKey : undefined, // Only in-app needs idempotency
          status: 'pending',
        },
      });
      notifications.push(notification);
    }

    return { status: 'created', notifications };
  }

  /**
   * Get channels for a specific event type based on user preferences
   */
  private getChannelsForEvent(
    eventType: string,
    preferences?: any,
  ): string[] {
    const channels: string[] = [];

    // Check event-specific preferences
    const eventPreferenceMap: Record<string, string> = {
      'ticket.created': 'notifyTicketCreated',
      'ticket.assigned': 'notifyTicketAssigned',
      'quote.submitted': 'notifyQuoteSubmitted',
      'quote.approved': 'notifyQuoteApproved',
      'ticket.completed': 'notifyTicketCompleted',
    };

    const eventPreferenceKey = eventPreferenceMap[eventType];
    
    // If user has explicitly disabled this event, return empty
    if (preferences && eventPreferenceKey && preferences[eventPreferenceKey] === false) {
      return [];
    }

    // Add in-app by default (if enabled)
    if (!preferences || preferences.inAppEnabled !== false) {
      channels.push('in-app');
    }

    // Add email if enabled
    if (!preferences || preferences.emailEnabled !== false) {
      channels.push('email');
    }

    // Add webhook if enabled and URL is configured
    if (preferences?.webhookEnabled && preferences.webhookUrl) {
      channels.push('webhook');
    }

    return channels;
  }

  /**
   * Get role-based recipients for an event
   */
  async getRolesForEvent(eventType: string, orgId: string, additionalRoles?: string[]): Promise<string[]> {
    // Define routing matrix
    const routingMatrix: Record<string, string[]> = {
      'ticket.created': ['LANDLORD', 'OPS'],
      'ticket.assigned': ['CONTRACTOR', 'TENANT'],
      'quote.submitted': ['LANDLORD', 'OPS'],
      'quote.approved': ['CONTRACTOR', 'TENANT'],
      'quote.rejected': ['CONTRACTOR'],
      'ticket.completed': ['TENANT', 'LANDLORD', 'OPS'],
      'ticket.cancelled': ['TENANT', 'LANDLORD', 'OPS', 'CONTRACTOR'],
    };

    const roles = routingMatrix[eventType] || [];
    
    // Add any additional roles passed in
    if (additionalRoles) {
      roles.push(...additionalRoles);
    }

    // Get users with these roles in the org
    const orgMembers = await this.prisma.orgMember.findMany({
      where: {
        orgId,
        role: { in: [...new Set(roles)] }, // Dedupe roles
      },
      select: {
        userId: true,
      },
    });

    return orgMembers.map(member => member.userId);
  }

  /**
   * Process notification delivery with retry logic
   */
  async processNotificationDelivery(notificationId: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    if (notification.status === 'delivered' || notification.status === 'sent') {
      return { status: 'already_delivered' };
    }

    try {
      switch (notification.channel) {
        case 'in-app':
          // In-app notifications are already "delivered" when created
          await this.prisma.notification.update({
            where: { id: notificationId },
            data: {
              status: 'delivered',
              deliveredAt: new Date(),
            },
          });
          break;

        case 'email':
          // TODO: Implement email sending logic
          await this.sendEmail(notification);
          await this.prisma.notification.update({
            where: { id: notificationId },
            data: {
              status: 'sent',
              sentAt: new Date(),
            },
          });
          break;

        case 'webhook':
          // TODO: Implement webhook delivery
          await this.sendWebhook(notification);
          await this.prisma.notification.update({
            where: { id: notificationId },
            data: {
              status: 'sent',
              sentAt: new Date(),
            },
          });
          break;
      }

      return { status: 'success' };
    } catch (error) {
      // Update retry count and failure reason
      await this.prisma.notification.update({
        where: { id: notificationId },
        data: {
          status: 'failed',
          failureReason: error.message,
          retryCount: notification.retryCount + 1,
        },
      });

      // If retry count is below threshold, schedule retry
      if (notification.retryCount < 3) {
        // TODO: Implement exponential backoff retry scheduling
        return { status: 'retry_scheduled', retryCount: notification.retryCount + 1 };
      }

      return { status: 'failed', error: error.message };
    }
  }

  /**
   * Send email notification using EmailService
   */
  private async sendEmail(notification: any) {
    // Get user details for email
    const user = await this.prisma.user.findUnique({
      where: { id: notification.userId },
      select: { email: true, name: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Send email using EmailService with a generic template
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #4F46E5; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9fafb; }
          .notification-body { background-color: white; padding: 15px; margin: 20px 0; border-radius: 5px; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>${notification.title}</h2>
          </div>
          <div class="content">
            <p>Dear ${user.name},</p>
            <div class="notification-body">
              <p>${notification.message}</p>
            </div>
          </div>
          <div class="footer">
            <p>This is an automated notification from Property Manager.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
      ${notification.title}
      
      Dear ${user.name},
      
      ${notification.message}
      
      ---
      This is an automated notification from Property Manager.
    `;

    await this.emailService.sendEmail({
      to: user.email,
      subject: notification.title,
      html,
      text,
    });
  }

  /**
   * Send webhook notification (placeholder)
   */
  private async sendWebhook(notification: any) {
    // TODO: Implement webhook delivery with HMAC signing
    console.log(`Sending webhook notification: ${notification.title}`);
    // For now, just log
    return Promise.resolve();
  }

  /**
   * Get or create notification preferences for user
   */
  async getPreferences(userId: string) {
    let preferences = await this.prisma.notificationPreference.findUnique({
      where: { userId },
    });

    if (!preferences) {
      // Create default preferences
      preferences = await this.prisma.notificationPreference.create({
        data: { userId },
      });
    }

    return preferences;
  }

  /**
   * Update notification preferences for user
   */
  async updatePreferences(userId: string, data: Partial<any>) {
    const preferences = await this.prisma.notificationPreference.upsert({
      where: { userId },
      update: data,
      create: {
        userId,
        ...data,
      },
    });

    return preferences;
  }
}
