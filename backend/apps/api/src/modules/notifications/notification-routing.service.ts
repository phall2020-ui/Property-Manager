import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

export interface NotificationEvent {
  type: string; // 'ticket.created', 'quote.submitted', etc.
  entityId: string;
  entityVersion?: number;
  actorId?: string;
  actorRole?: string;
  landlordId?: string;
  tenantId?: string;
  contractorId?: string;
  payload?: any;
}

export interface NotificationRecipient {
  userId: string;
  channels: string[]; // ['email', 'in-app', 'webhook']
}

/**
 * NotificationRoutingService
 * 
 * Implements the notification routing matrix that determines:
 * 1. Which users receive notifications for which events
 * 2. Which channels (email, webhook, in-app) are used per user
 * 3. Deduplication via idempotency keys
 * 4. Retry logic with exponential backoff
 */
@Injectable()
export class NotificationRoutingService {
  private readonly logger = new Logger(NotificationRoutingService.name);

  // Notification routing matrix
  private readonly routingMatrix: Record<string, { roles: string[]; channels: string[] }> = {
    'ticket.created': {
      roles: ['LANDLORD', 'OPS'],
      channels: ['in-app', 'email'],
    },
    'ticket.assigned': {
      roles: ['CONTRACTOR', 'TENANT'],
      channels: ['email', 'in-app'], // Contractor gets both, tenant gets in-app only
    },
    'quote.submitted': {
      roles: ['LANDLORD', 'OPS'],
      channels: ['in-app', 'email'],
    },
    'quote.approved': {
      roles: ['CONTRACTOR', 'TENANT'],
      channels: ['in-app'],
    },
    'appointment.proposed': {
      roles: ['TENANT', 'LANDLORD'],
      channels: ['in-app', 'email'],
    },
    'appointment.confirmed': {
      roles: ['CONTRACTOR'],
      channels: ['email', 'in-app'],
    },
    'ticket.in_progress': {
      roles: ['TENANT', 'LANDLORD'],
      channels: ['in-app'],
    },
    'ticket.completed': {
      roles: ['TENANT', 'LANDLORD', 'OPS'],
      channels: ['in-app', 'email'],
    },
    'ticket.closed': {
      roles: ['TENANT', 'LANDLORD', 'OPS'],
      channels: ['in-app'],
    },
    'ticket.cancelled': {
      roles: ['TENANT', 'LANDLORD', 'CONTRACTOR', 'OPS'],
      channels: ['in-app', 'email'],
    },
  };

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Route an event to appropriate recipients with correct channels
   */
  async routeEvent(event: NotificationEvent): Promise<void> {
    const routing = this.routingMatrix[event.type];
    if (!routing) {
      this.logger.warn(`No routing configuration for event type: ${event.type}`);
      return;
    }

    // Get recipients based on event context
    const recipients = await this.getRecipients(event, routing.roles);

    // Apply user preferences to determine final channels
    const recipientsWithChannels = await this.applyUserPreferences(
      recipients,
      event.type,
      routing.channels,
    );

    // Create outbox entries for each recipient/channel combination
    await this.createOutboxEntries(event, recipientsWithChannels);

    this.logger.log({
      action: 'event.routed',
      eventType: event.type,
      entityId: event.entityId,
      recipientCount: recipientsWithChannels.length,
    });
  }

  /**
   * Get list of users who should receive notification based on their roles
   */
  private async getRecipients(
    event: NotificationEvent,
    allowedRoles: string[],
  ): Promise<string[]> {
    const userIds: Set<string> = new Set();

    // Get landlord users
    if (allowedRoles.includes('LANDLORD') && event.landlordId) {
      const landlordUsers = await this.prisma.orgMember.findMany({
        where: {
          orgId: event.landlordId,
          role: { in: ['LANDLORD', 'ADMIN'] },
        },
        select: { userId: true },
      });
      landlordUsers.forEach((u) => userIds.add(u.userId));
    }

    // Get tenant users
    if (allowedRoles.includes('TENANT') && event.tenantId) {
      const tenantUsers = await this.prisma.orgMember.findMany({
        where: {
          orgId: event.tenantId,
          role: 'TENANT',
        },
        select: { userId: true },
      });
      tenantUsers.forEach((u) => userIds.add(u.userId));
    }

    // Get contractor users
    if (allowedRoles.includes('CONTRACTOR') && event.contractorId) {
      userIds.add(event.contractorId);
    }

    // Get OPS users
    if (allowedRoles.includes('OPS')) {
      const opsUsers = await this.prisma.orgMember.findMany({
        where: {
          role: 'OPS',
        },
        select: { userId: true },
      });
      opsUsers.forEach((u) => userIds.add(u.userId));
    }

    return Array.from(userIds);
  }

  /**
   * Apply user notification preferences to determine which channels to use
   */
  private async applyUserPreferences(
    userIds: string[],
    eventType: string,
    defaultChannels: string[],
  ): Promise<NotificationRecipient[]> {
    const recipients: NotificationRecipient[] = [];

    for (const userId of userIds) {
      // Get user preferences
      const preferences = await this.prisma.notificationPreference.findUnique({
        where: { userId },
      });

      let channels: string[];

      if (preferences) {
        // Use user-specific preferences
        const eventKey = this.eventTypeToPreferenceKey(eventType);
        const preferenceValue = preferences[eventKey] || '';
        channels = preferenceValue.split(',').filter(Boolean);

        // Apply global channel enables/disables
        if (!preferences.emailEnabled) {
          channels = channels.filter((c) => c !== 'email');
        }
        if (!preferences.webhookEnabled) {
          channels = channels.filter((c) => c !== 'webhook');
        }
        if (!preferences.inAppEnabled) {
          channels = channels.filter((c) => c !== 'in-app');
        }

        // Add webhook if configured and enabled
        if (preferences.webhookEnabled && preferences.webhookUrl) {
          if (!channels.includes('webhook')) {
            channels.push('webhook');
          }
        }
      } else {
        // Use default channels for event type
        channels = [...defaultChannels];
      }

      if (channels.length > 0) {
        recipients.push({ userId, channels });
      }
    }

    return recipients;
  }

  /**
   * Convert event type to preference key
   */
  private eventTypeToPreferenceKey(eventType: string): string {
    const map: Record<string, string> = {
      'ticket.created': 'ticketCreated',
      'ticket.assigned': 'ticketAssigned',
      'quote.submitted': 'quoteSubmitted',
      'quote.approved': 'quoteApproved',
      'appointment.proposed': 'appointmentProposed',
      'appointment.confirmed': 'appointmentConfirmed',
      'ticket.completed': 'ticketCompleted',
      'ticket.closed': 'ticketClosed',
    };
    return map[eventType] || 'ticketCreated';
  }

  /**
   * Create notification outbox entries for reliable delivery
   */
  private async createOutboxEntries(
    event: NotificationEvent,
    recipients: NotificationRecipient[],
  ): Promise<void> {
    const version = event.entityVersion || 1;
    const entries = [];

    for (const recipient of recipients) {
      for (const channel of recipient.channels) {
        const idempotencyKey = `${event.type}:${event.entityId}:${version}:${recipient.userId}:${channel}`;

        // Check if already exists (deduplication)
        const existing = await this.prisma.notificationOutbox.findUnique({
          where: { idempotencyKey },
        });

        if (existing) {
          this.logger.debug(`Duplicate notification skipped: ${idempotencyKey}`);
          continue;
        }

        entries.push({
          eventType: event.type,
          entityId: event.entityId,
          entityVersion: version,
          idempotencyKey,
          channel,
          recipientId: recipient.userId,
          payload: JSON.stringify(event.payload || {}),
          status: 'PENDING',
          nextAttemptAt: new Date(),
        });
      }
    }

    if (entries.length > 0) {
      await this.prisma.notificationOutbox.createMany({
        data: entries,
      });

      this.logger.log(`Created ${entries.length} notification outbox entries`);
    }
  }

  /**
   * Process pending notifications from outbox
   */
  async processPendingNotifications(limit = 100): Promise<void> {
    const pending = await this.prisma.notificationOutbox.findMany({
      where: {
        status: { in: ['PENDING', 'FAILED'] },
        nextAttemptAt: { lte: new Date() },
        attempts: { lt: this.prisma.notificationOutbox.fields.maxAttempts },
      },
      take: limit,
      orderBy: { nextAttemptAt: 'asc' },
    });

    for (const entry of pending) {
      try {
        await this.deliverNotification(entry);
      } catch (error) {
        this.logger.error(`Failed to process notification ${entry.id}:`, error);
      }
    }
  }

  /**
   * Deliver a single notification
   */
  private async deliverNotification(entry: any): Promise<void> {
    // Mark as processing
    await this.prisma.notificationOutbox.update({
      where: { id: entry.id },
      data: {
        status: 'PROCESSING',
        attempts: entry.attempts + 1,
        lastAttemptAt: new Date(),
      },
    });

    try {
      switch (entry.channel) {
        case 'in-app':
          await this.deliverInApp(entry);
          break;
        case 'email':
          await this.deliverEmail(entry);
          break;
        case 'webhook':
          await this.deliverWebhook(entry);
          break;
        default:
          throw new Error(`Unknown channel: ${entry.channel}`);
      }

      // Mark as delivered
      await this.prisma.notificationOutbox.update({
        where: { id: entry.id },
        data: {
          status: 'DELIVERED',
          deliveredAt: new Date(),
        },
      });

      this.logger.log(`Notification delivered: ${entry.id} via ${entry.channel}`);
    } catch (error) {
      // Calculate next retry with exponential backoff
      const backoffSeconds = Math.min(300, Math.pow(2, entry.attempts) * 10);
      const nextAttempt = new Date(Date.now() + backoffSeconds * 1000);

      await this.prisma.notificationOutbox.update({
        where: { id: entry.id },
        data: {
          status: 'FAILED',
          error: error.message,
          nextAttemptAt: nextAttempt,
        },
      });

      this.logger.warn(
        `Notification delivery failed: ${entry.id}, will retry at ${nextAttempt.toISOString()}`,
      );
    }
  }

  /**
   * Deliver in-app notification
   */
  private async deliverInApp(entry: any): Promise<void> {
    const payload = JSON.parse(entry.payload);

    await this.prisma.notification.create({
      data: {
        userId: entry.recipientId,
        type: entry.eventType,
        title: this.getNotificationTitle(entry.eventType),
        message: this.getNotificationMessage(entry.eventType, payload),
        resourceType: this.getResourceType(entry.eventType),
        resourceId: entry.entityId,
      },
    });
  }

  /**
   * Deliver email notification
   */
  private async deliverEmail(entry: any): Promise<void> {
    // TODO: Integrate with email service (NodeMailer, SendGrid, etc.)
    // For now, just log
    this.logger.log(`Email would be sent to user ${entry.recipientId} for event ${entry.eventType}`);
  }

  /**
   * Deliver webhook notification
   */
  private async deliverWebhook(entry: any): Promise<void> {
    // Get user's webhook configuration
    const preferences = await this.prisma.notificationPreference.findUnique({
      where: { userId: entry.recipientId },
    });

    if (!preferences?.webhookUrl) {
      throw new Error('No webhook URL configured');
    }

    // TODO: Sign webhook payload with HMAC
    // TODO: Send HTTP POST to webhook URL
    // For now, just log
    this.logger.log(
      `Webhook would be sent to ${preferences.webhookUrl} for event ${entry.eventType}`,
    );
  }

  /**
   * Get human-readable notification title
   */
  private getNotificationTitle(eventType: string): string {
    const titles: Record<string, string> = {
      'ticket.created': 'New Maintenance Ticket',
      'ticket.assigned': 'Ticket Assigned',
      'quote.submitted': 'Quote Received',
      'quote.approved': 'Quote Approved',
      'appointment.proposed': 'Appointment Proposed',
      'appointment.confirmed': 'Appointment Confirmed',
      'ticket.completed': 'Work Completed',
      'ticket.closed': 'Ticket Closed',
    };
    return titles[eventType] || 'Notification';
  }

  /**
   * Get notification message
   */
  private getNotificationMessage(eventType: string, payload: any): string {
    // TODO: Generate contextual messages based on payload
    return `Event: ${eventType}`;
  }

  /**
   * Get resource type from event type
   */
  private getResourceType(eventType: string): string {
    if (eventType.startsWith('ticket.')) return 'ticket';
    if (eventType.startsWith('quote.')) return 'quote';
    if (eventType.startsWith('appointment.')) return 'appointment';
    return 'unknown';
  }
}
