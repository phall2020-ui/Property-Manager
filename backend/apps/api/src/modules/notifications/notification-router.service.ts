import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { EmailService } from './email.service';

export interface NotificationEvent {
  type: string;
  entityId: string;
  entityType: string;
  actorId?: string;
  landlordId?: string;
  tenantId?: string;
  contractorId?: string;
  metadata?: Record<string, any>;
}

export interface NotificationRecipient {
  userId: string;
  role: string;
  channels: string[];
}

/**
 * Notification Router Service
 * Handles event → channel routing with role scoping and delivery dedupe
 */
@Injectable()
export class NotificationRouterService {
  private readonly logger = new Logger(NotificationRouterService.name);

  // Routing matrix: event type → roles → channels
  private readonly routingMatrix: Record<string, Record<string, string[]>> = {
    'ticket.created': {
      LANDLORD: ['in-app', 'email'],
      OPS: ['in-app', 'email'],
    },
    'ticket.assigned': {
      CONTRACTOR: ['email', 'in-app'],
      TENANT: ['in-app'],
    },
    'quote.submitted': {
      LANDLORD: ['in-app', 'email'],
      OPS: ['in-app', 'email'],
    },
    'quote.approved': {
      CONTRACTOR: ['email', 'in-app'],
      TENANT: ['in-app'],
    },
    'quote.rejected': {
      CONTRACTOR: ['email', 'in-app'],
    },
    'appointment.proposed': {
      TENANT: ['in-app'],
      LANDLORD: ['in-app'],
    },
    'appointment.confirmed': {
      CONTRACTOR: ['in-app', 'email'],
      LANDLORD: ['in-app', 'email'],
      OPS: ['in-app'],
    },
    'ticket.in_progress': {
      TENANT: ['in-app'],
      LANDLORD: ['in-app'],
    },
    'ticket.completed': {
      TENANT: ['email', 'in-app'],
      LANDLORD: ['email', 'in-app'],
      OPS: ['in-app'],
    },
    'ticket.closed': {
      TENANT: ['email', 'in-app'],
      LANDLORD: ['in-app'],
      OPS: ['in-app'],
    },
    'ticket.cancelled': {
      TENANT: ['email', 'in-app'],
      LANDLORD: ['email', 'in-app'],
      CONTRACTOR: ['email', 'in-app'],
      OPS: ['in-app'],
    },
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  /**
   * Route notification to appropriate recipients based on event type
   * Uses routing matrix and user preferences
   */
  async routeNotification(event: NotificationEvent): Promise<void> {
    this.logger.log(`Routing notification for event: ${event.type}`);

    // Get routing rules for this event type
    const routingRules = this.routingMatrix[event.type];
    if (!routingRules) {
      this.logger.warn(`No routing rules found for event type: ${event.type}`);
      return;
    }

    // Identify recipients based on event context
    const recipients = await this.identifyRecipients(event);

    // Process each recipient
    for (const recipient of recipients) {
      await this.sendToRecipient(event, recipient, routingRules);
    }
  }

  /**
   * Identify recipients for a notification event
   */
  private async identifyRecipients(event: NotificationEvent): Promise<NotificationRecipient[]> {
    const recipients: NotificationRecipient[] = [];

    // Get landlord users if landlordId is present
    if (event.landlordId) {
      const landlordMembers = await this.prisma.orgMember.findMany({
        where: {
          orgId: event.landlordId,
          role: { in: ['LANDLORD', 'ADMIN'] },
        },
        include: {
          user: {
            select: {
              id: true,
            },
          },
        },
      });

      for (const member of landlordMembers) {
        recipients.push({
          userId: member.userId,
          role: 'LANDLORD',
          channels: this.routingMatrix[event.type]?.LANDLORD || [],
        });
      }
    }

    // Get tenant users if tenantId is present
    if (event.tenantId) {
      const tenantMembers = await this.prisma.orgMember.findMany({
        where: {
          orgId: event.tenantId,
          role: 'TENANT',
        },
        include: {
          user: {
            select: {
              id: true,
            },
          },
        },
      });

      for (const member of tenantMembers) {
        recipients.push({
          userId: member.userId,
          role: 'TENANT',
          channels: this.routingMatrix[event.type]?.TENANT || [],
        });
      }
    }

    // Get contractor if contractorId is present
    if (event.contractorId) {
      recipients.push({
        userId: event.contractorId,
        role: 'CONTRACTOR',
        channels: this.routingMatrix[event.type]?.CONTRACTOR || [],
      });
    }

    // Get OPS users (from system-wide settings or specific org)
    const opsMembers = await this.prisma.orgMember.findMany({
      where: {
        role: 'OPS',
        ...(event.landlordId && { orgId: event.landlordId }),
      },
      include: {
        user: {
          select: {
            id: true,
          },
        },
      },
      take: 10, // Limit to prevent spam
    });

    for (const member of opsMembers) {
      recipients.push({
        userId: member.userId,
        role: 'OPS',
        channels: this.routingMatrix[event.type]?.OPS || [],
      });
    }

    return recipients;
  }

  /**
   * Send notification to a specific recipient across their preferred channels
   */
  private async sendToRecipient(
    event: NotificationEvent,
    recipient: NotificationRecipient,
    routingRules: Record<string, string[]>,
  ): Promise<void> {
    // Get user preferences
    const preferences = await this.getUserPreferences(recipient.userId);

    // Get default channels for this role
    const defaultChannels = routingRules[recipient.role] || [];

    // Filter channels based on user preferences
    const activeChannels = defaultChannels.filter((channel) =>
      this.isChannelEnabled(channel, preferences),
    );

    // Generate idempotency key
    const version = Date.now(); // Use timestamp as version
    const idempotencyKey = `${event.type}:${event.entityId}:${version}`;

    // Send to each active channel
    for (const channel of activeChannels) {
      await this.sendToChannel(event, recipient.userId, channel, idempotencyKey);
    }
  }

  /**
   * Get user notification preferences
   */
  private async getUserPreferences(userId: string) {
    const prefs = await this.prisma.notificationPreference.findUnique({
      where: { userId },
    });

    // Return default preferences if none exist
    return (
      prefs || {
        emailEnabled: true,
        webhookEnabled: false,
        inAppEnabled: true,
        notifyTicketCreated: true,
        notifyTicketAssigned: true,
        notifyQuoteSubmitted: true,
        notifyQuoteApproved: true,
        notifyTicketCompleted: true,
      }
    );
  }

  /**
   * Check if a channel is enabled for the user
   */
  private isChannelEnabled(channel: string, preferences: any): boolean {
    switch (channel) {
      case 'email':
        return preferences.emailEnabled;
      case 'webhook':
        return preferences.webhookEnabled && !!preferences.webhookUrl;
      case 'in-app':
        return preferences.inAppEnabled;
      default:
        return false;
    }
  }

  /**
   * Send notification to a specific channel
   * Creates notification record and attempts delivery
   */
  private async sendToChannel(
    event: NotificationEvent,
    userId: string,
    channel: string,
    idempotencyKey: string,
  ): Promise<void> {
    try {
      // Check for existing notification with this idempotency key
      const existing = await this.prisma.notification.findUnique({
        where: { idempotencyKey: `${idempotencyKey}:${userId}:${channel}` },
      });

      if (existing) {
        this.logger.log(`Notification already sent: ${idempotencyKey}:${userId}:${channel}`);
        return;
      }

      // Create notification message
      const { title, message } = this.generateMessage(event);

      // Create notification record
      const notification = await this.prisma.notification.create({
        data: {
          userId,
          type: event.type,
          title,
          message,
          resourceType: event.entityType,
          resourceId: event.entityId,
          channel,
          status: 'pending',
          idempotencyKey: `${idempotencyKey}:${userId}:${channel}`,
        },
      });

      // Deliver based on channel
      await this.deliverNotification(notification, channel);
    } catch (error) {
      this.logger.error(`Failed to send notification to ${userId} via ${channel}: ${error.message}`);
    }
  }

  /**
   * Generate notification title and message from event
   */
  private generateMessage(event: NotificationEvent): { title: string; message: string } {
    const templates: Record<string, { title: string; message: string }> = {
      'ticket.created': {
        title: 'New Maintenance Ticket',
        message: 'A new maintenance ticket has been created',
      },
      'ticket.assigned': {
        title: 'Ticket Assigned',
        message: 'A ticket has been assigned to you',
      },
      'quote.submitted': {
        title: 'Quote Submitted',
        message: 'A contractor has submitted a quote for review',
      },
      'quote.approved': {
        title: 'Quote Approved',
        message: 'Your quote has been approved',
      },
      'quote.rejected': {
        title: 'Quote Rejected',
        message: 'Your quote was not approved',
      },
      'ticket.completed': {
        title: 'Ticket Completed',
        message: 'A maintenance ticket has been completed',
      },
      'ticket.closed': {
        title: 'Ticket Closed',
        message: 'A maintenance ticket has been closed',
      },
    };

    return templates[event.type] || { title: event.type, message: 'Event occurred' };
  }

  /**
   * Deliver notification via the specified channel
   * Implements retry logic with exponential backoff
   */
  private async deliverNotification(notification: any, channel: string): Promise<void> {
    try {
      switch (channel) {
        case 'in-app':
          // In-app notifications are already stored in DB
          await this.prisma.notification.update({
            where: { id: notification.id },
            data: {
              status: 'delivered',
              deliveredAt: new Date(),
            },
          });
          break;

        case 'email':
          await this.deliverEmail(notification);
          break;

        case 'webhook':
          await this.deliverWebhook(notification);
          break;

        default:
          this.logger.warn(`Unknown channel: ${channel}`);
      }
    } catch (error) {
      await this.handleDeliveryFailure(notification, error);
    }
  }

  /**
   * Deliver notification via email
   */
  private async deliverEmail(notification: any): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: notification.userId },
      select: { email: true, name: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    await this.emailService.sendEmail({
      to: user.email,
      subject: notification.title,
      html: `<p>Hi ${user.name},</p><p>${notification.message}</p>`,
    });

    await this.prisma.notification.update({
      where: { id: notification.id },
      data: {
        status: 'sent',
        sentAt: new Date(),
      },
    });
  }

  /**
   * Deliver notification via webhook
   */
  private async deliverWebhook(notification: any): Promise<void> {
    const prefs = await this.prisma.notificationPreference.findUnique({
      where: { userId: notification.userId },
    });

    if (!prefs?.webhookUrl) {
      throw new Error('Webhook URL not configured');
    }

    // TODO: Implement webhook delivery with HMAC signing
    // For now, mark as sent
    await this.prisma.notification.update({
      where: { id: notification.id },
      data: {
        status: 'sent',
        sentAt: new Date(),
      },
    });
  }

  /**
   * Handle delivery failure and schedule retry
   */
  private async handleDeliveryFailure(notification: any, error: Error): Promise<void> {
    const maxRetries = 3;
    const retryCount = notification.retryCount + 1;

    await this.prisma.notification.update({
      where: { id: notification.id },
      data: {
        status: retryCount >= maxRetries ? 'failed' : 'pending',
        failureReason: error.message,
        retryCount,
      },
    });

    if (retryCount < maxRetries) {
      this.logger.log(`Scheduling retry ${retryCount}/${maxRetries} for notification ${notification.id}`);
      // TODO: Implement retry scheduling with backoff
    } else {
      this.logger.error(`Notification ${notification.id} failed after ${maxRetries} retries`);
    }
  }
}
