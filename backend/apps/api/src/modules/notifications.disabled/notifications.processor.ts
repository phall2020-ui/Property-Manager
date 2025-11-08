import { Process, Processor } from '@nestjs/bullmq';
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
export class NotificationsProcessor {
  private readonly logger = new Logger(NotificationsProcessor.name);
  private readonly notificationsEnabled: boolean;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.notificationsEnabled = this.configService.get<boolean>(
      'NOTIFICATIONS_ENABLED',
      true, // Default to true in all environments
    );
    
    if (!this.notificationsEnabled) {
      this.logger.warn('⚠️  Notifications are disabled via NOTIFICATIONS_ENABLED=false');
    }
  }

  /**
   * Process notification send jobs
   * Handles email notifications and updates the database status
   */
  @Process('send')
  async handleSend(job: Job<{ userId: string; subject: string; body: string; type?: string }>) {
    const { userId, subject, body, type = 'email' } = job.data;
    
    this.logger.log(`[Job ${job.id}] Processing ${type} notification to user ${userId}: ${subject}`);

    // Graceful no-op if notifications are disabled
    if (!this.notificationsEnabled) {
      this.logger.debug(`[Job ${job.id}] Skipping notification (disabled by config)`);
      return { skipped: true, reason: 'notifications_disabled' };
    }

    try {
      // In real implementation, integrate with SendGrid, AWS SES, or another provider
      // For now, we log to console to simulate sending
      this.logger.log(`[Job ${job.id}] Sending ${type} to user ${userId}: ${subject}`);
      
      // Simulate async operation (network call to email provider)
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Update notification status in database
      const updated = await this.prisma.notification.updateMany({
        where: { 
          userId, 
          subject, 
          body, 
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
        subject,
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
  @Process('ticket-event')
  async handleTicketEvent(
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
          const subject = this.getTicketEventSubject(eventType, ticketId);
          const body = this.getTicketEventBody(eventType, eventData);

          return this.prisma.notification.create({
            data: {
              userId,
              subject,
              body,
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

  private getTicketEventSubject(eventType: string, ticketId: string): string {
    const subjects: Record<string, string> = {
      created: `New Ticket Created - ${ticketId}`,
      status_changed: `Ticket Status Updated - ${ticketId}`,
      appointment_proposed: `Appointment Proposed - ${ticketId}`,
      appointment_confirmed: `Appointment Confirmed - ${ticketId}`,
      quote_submitted: `Quote Submitted - ${ticketId}`,
      quote_approved: `Quote Approved - ${ticketId}`,
    };
    return subjects[eventType] || `Ticket Update - ${ticketId}`;
  }

  private getTicketEventBody(eventType: string, eventData?: any): string {
    const bodies: Record<string, string> = {
      created: `A new maintenance ticket has been created.`,
      status_changed: `Ticket status has been updated to: ${eventData?.newStatus || 'unknown'}`,
      appointment_proposed: `An appointment has been proposed for ${eventData?.proposedDate || 'soon'}`,
      appointment_confirmed: `Appointment confirmed for ${eventData?.confirmedDate || 'soon'}`,
      quote_submitted: `A quote has been submitted for review.`,
      quote_approved: `The quote has been approved. Work can begin.`,
    };
    return bodies[eventType] || `Your ticket has been updated.`;
  }
}
