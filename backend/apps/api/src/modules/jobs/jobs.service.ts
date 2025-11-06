import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

/**
 * Jobs Service - Enqueues background jobs for processing
 * Gracefully handles Redis not being available by logging instead of crashing
 */
@Injectable()
export class JobsService implements OnModuleInit {
  private readonly logger = new Logger(JobsService.name);
  private redisAvailable = false;
  private connectionChecked = false;

  constructor(
    @InjectQueue('tickets') private ticketsQueue: Queue,
    @InjectQueue('notifications') private notificationsQueue: Queue,
    @InjectQueue('dead-letter') private deadLetterQueue: Queue,
  ) {}

  async onModuleInit() {
    // Check Redis connection once on module initialization
    await this.checkRedisConnection();
  }

  private async checkRedisConnection() {
    if (this.connectionChecked) {
      return;
    }

    try {
      const client = await this.ticketsQueue.client;
      await client.ping();
      this.redisAvailable = true;
      this.connectionChecked = true;
      this.logger.log('✅ Redis connected - Background jobs enabled');
    } catch (error) {
      this.redisAvailable = false;
      this.connectionChecked = true;
      this.logger.warn('⚠️  Redis not available - Jobs will be logged but not processed');
      this.logger.warn('⚠️  To enable background jobs, start Redis and set REDIS_URL');
    }
  }

  private async enqueueOrLog<T = unknown>(
    queueName: string,
    jobName: string,
    data: T,
    options?: { jobId?: string; delay?: number; priority?: number }
  ) {
    if (!this.redisAvailable) {
      this.logger.log(`[NO REDIS] Would enqueue ${jobName}: ${JSON.stringify(data)}`);
      return null;
    }

    try {
      const queue = queueName === 'tickets' ? this.ticketsQueue : 
                    queueName === 'notifications' ? this.notificationsQueue :
                    this.deadLetterQueue;
      return await queue.add(jobName, data, options);
    } catch (error) {
      this.logger.warn(`Failed to enqueue ${jobName}, logging instead: ${error.message}`);
      this.logger.log(`[QUEUE ERROR] Job ${jobName}: ${JSON.stringify(data)}`);
      return null;
    }
  }

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
    return this.enqueueOrLog('tickets', 'ticket.created', data, {
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
    return this.enqueueOrLog('tickets', 'ticket.quoted', data, {
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
    return this.enqueueOrLog('tickets', 'ticket.approved', data, {
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
    return this.enqueueOrLog('tickets', 'ticket.assigned', data, {
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
    return this.enqueueOrLog('notifications', 'send-notification', data, undefined);
  }

  /**
   * Move a failed job to the dead letter queue for manual inspection
   */
  async moveToDeadLetter(jobData: unknown, error: string) {
    this.logger.error(`Moving job to dead letter queue: ${error}`);
    return this.enqueueOrLog('dead-letter', 'failed-job', {
      originalData: jobData,
      error,
      timestamp: new Date().toISOString(),
    }, undefined);
  }
}
