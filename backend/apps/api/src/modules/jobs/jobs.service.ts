import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

/**
 * Jobs Service - Enqueues background jobs for processing
 */
@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);

  constructor(
    @InjectQueue('tickets') private ticketsQueue: Queue,
    @InjectQueue('notifications') private notificationsQueue: Queue,
    @InjectQueue('dead-letter') private deadLetterQueue: Queue,
  ) {}

  /**
   * Enqueue a job when a ticket is created
   */
  async enqueueTicketCreated(data: {
    ticketId: string;
    propertyId: string;
    createdById: string;
    landlordId: string;
  }) {
    this.logger.log(`Enqueuing ticket.created job for ticket ${data.ticketId}`);
    await this.ticketsQueue.add('ticket.created', data, {
      jobId: `ticket-created-${data.ticketId}`,
    });
  }

  /**
   * Enqueue a job when a quote is submitted
   */
  async enqueueTicketQuoted(data: {
    ticketId: string;
    quoteId: string;
    contractorId: string;
    amount: number;
    landlordId: string;
  }) {
    this.logger.log(`Enqueuing ticket.quoted job for ticket ${data.ticketId}`);
    await this.ticketsQueue.add('ticket.quoted', data, {
      jobId: `ticket-quoted-${data.ticketId}-${data.quoteId}`,
    });
  }

  /**
   * Enqueue a job when a quote is approved
   */
  async enqueueTicketApproved(data: {
    ticketId: string;
    quoteId: string;
    approvedBy: string;
    landlordId: string;
  }) {
    this.logger.log(`Enqueuing ticket.approved job for ticket ${data.ticketId}`);
    await this.ticketsQueue.add('ticket.approved', data, {
      jobId: `ticket-approved-${data.ticketId}-${data.quoteId}`,
    });
  }

  /**
   * Enqueue a job when a ticket is assigned to a contractor
   */
  async enqueueTicketAssigned(data: {
    ticketId: string;
    assignedToId: string;
    assignedBy: string;
    landlordId: string;
  }) {
    this.logger.log(`Enqueuing ticket.assigned job for ticket ${data.ticketId}`);
    await this.ticketsQueue.add('ticket.assigned', data, {
      jobId: `ticket-assigned-${data.ticketId}-${data.assignedToId}`,
    });
  }

  /**
   * Send a notification job (email, SMS, push, etc.)
   */
  async enqueueNotification(data: {
    type: 'email' | 'sms' | 'push';
    recipientId: string;
    subject?: string;
    message: string;
    metadata?: Record<string, unknown>;
  }) {
    this.logger.log(`Enqueuing ${data.type} notification for user ${data.recipientId}`);
    await this.notificationsQueue.add('send-notification', data);
  }

  /**
   * Move a failed job to the dead letter queue for manual inspection
   */
  async moveToDeadLetter(jobData: unknown, error: string) {
    this.logger.error(`Moving job to dead letter queue: ${error}`);
    await this.deadLetterQueue.add('failed-job', {
      originalData: jobData,
      error,
      timestamp: new Date().toISOString(),
    });
  }
}
