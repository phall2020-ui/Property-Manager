import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma/prisma.service';

/**
 * Notifications Processor - Handles background email/notification delivery
 * 
 * Queue: 'notifications'
 * Concurrency: 5 jobs at a time
 * Retry strategy: 3 attempts with exponential backoff (configured in jobs.module.ts)
 */
@Processor('notifications', {
  concurrency: 5, // Process up to 5 notification jobs concurrently
})
@Injectable()
export class NotificationsProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationsProcessor.name);
  private readonly notificationsEnabled: boolean;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    super();
    this.notificationsEnabled = this.configService.get<boolean>(
      'NOTIFICATIONS_ENABLED',
      true, // Default to true in all environments
    );
    
    if (!this.notificationsEnabled) {
      this.logger.warn('⚠️  Notifications are disabled via NOTIFICATIONS_ENABLED=false');
    }
  }

  /**
   * Main job processing entry point
   * Routes to appropriate handler based on job name
   */
  async process(job: Job): Promise<unknown> {
    this.logger.log(`[Job ${job.id}] Processing ${job.name} job`);
    
    try {
      switch (job.name) {
        case 'send':
          return await this.handleSend(job);
        case 'ticket-event':
          return await this.handleTicketEvent(job);
        default:
          this.logger.warn(`[Job ${job.id}] Unknown job type: ${job.name}`);
          return { skipped: true, reason: 'unknown_job_type' };
      }
    } catch (error) {
      this.logger.error(
        `[Job ${job.id}] Error processing job: ${error.message}`,
        error.stack,
      );
      throw error; // Re-throw to trigger retry
    }
  }

  /**
   * Process notification send jobs
   * Handles email notifications and updates the database status
   */
  private async handleSend(job: Job<{ userId: string; title: string; message: string; type?: string }>) {
    const { userId, title, message, type = 'email' } = job.data;
    
    this.logger.log(`[Job ${job.id}] Processing ${type} notification to user ${userId}: ${title}`);

    // Graceful no-op if notifications are disabled
    if (!this.notificationsEnabled) {
      this.logger.debug(`[Job ${job.id}] Skipping notification (disabled by config)`);
      return { skipped: true, reason: 'notifications_disabled' };
    }

    try {
      // In real implementation, integrate with SendGrid, AWS SES, or another provider
      // For now, we log to console to simulate sending
      this.logger.log(`[Job ${job.id}] Sending ${type} to user ${userId}: ${title}`);
      
      // Simulate async operation (network call to email provider)
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Update notification status in database
      const updated = await this.prisma.notification.updateMany({
        where: { 
          userId, 
          title, 
          message, 
          sentAt: null 
        },
        data: { 
          sentAt: new Date(), 
          status: 'sent' 
        },
      });

      this.logger.log(
        `[Job ${job.id}] ✅ Successfully sent ${type} notification (${updated.count} records updated)`,
      );

      return { 
        success: true, 
        recordsUpdated: updated.count,
        userId,
        title,
      };
    } catch (error) {
      this.logger.error(
        `[Job ${job.id}] ❌ Failed to send notification: ${error.message}`,
        error.stack,
      );
      // Re-throw to trigger retry mechanism
      throw error;
    }
  }

  /**
   * Process ticket event notifications
   * Handles ticket status changes, appointments, etc.
   */
  private async handleTicketEvent(
    job: Job<{ 
      ticketId: string; 
      eventType: string; 
      recipientUserIds: string[];
      eventData?: any;
    }>,
  ) {
    const { ticketId, eventType, recipientUserIds, eventData } = job.data;

    this.logger.log(
      `[Job ${job.id}] Processing ticket event notification: ${eventType} for ticket ${ticketId}`,
    );

    // Graceful no-op if notifications are disabled
    if (!this.notificationsEnabled) {
      this.logger.debug(`[Job ${job.id}] Skipping ticket notification (disabled by config)`);
      return { skipped: true, reason: 'notifications_disabled' };
    }

    try {
      // Create notification records for all recipients
      const notifications = await Promise.all(
        recipientUserIds.map(async (userId) => {
          const title = this.getTicketEventTitle(eventType, ticketId);
          const message = this.getTicketEventMessage(eventType, eventData);

          return this.prisma.notification.create({
            data: {
              userId,
              title,
              message,
              type: 'ticket_update',
              status: 'pending',
            },
          });
        }),
      );

      this.logger.log(
        `[Job ${job.id}] ✅ Created ${notifications.length} notification(s) for ticket event ${eventType}`,
      );

      return {
        success: true,
        notificationsCreated: notifications.length,
        eventType,
        ticketId,
      };
    } catch (error) {
      this.logger.error(
        `[Job ${job.id}] ❌ Failed to process ticket event: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  private getTicketEventTitle(eventType: string, ticketId: string): string {
    const titles: Record<string, string> = {
      created: `New Ticket Created`,
      status_changed: `Ticket Status Updated`,
      appointment_proposed: `Appointment Proposed`,
      appointment_confirmed: `Appointment Confirmed`,
      quote_submitted: `Quote Submitted`,
      quote_approved: `Quote Approved`,
    };
    return titles[eventType] || `Ticket Update`;
  }

  private getTicketEventMessage(eventType: string, eventData?: any): string {
    const messages: Record<string, string> = {
      created: `A new maintenance ticket has been created and requires your attention.`,
      status_changed: `Ticket status has been updated to: ${eventData?.newStatus || 'unknown'}`,
      appointment_proposed: `An appointment has been proposed for ${eventData?.proposedDate || 'soon'}`,
      appointment_confirmed: `Appointment confirmed for ${eventData?.confirmedDate || 'soon'}`,
      quote_submitted: `A quote has been submitted for your review.`,
      quote_approved: `The quote has been approved. Work can begin.`,
    };
    return messages[eventType] || `Your ticket has been updated.`;
  }
}
