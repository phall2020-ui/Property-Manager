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

  /**
   * Schedule auto-transition from SCHEDULED to IN_PROGRESS at appointment start time
   */
  async enqueueAppointmentStart(data: {
    appointmentId: string;
    ticketId: string;
    startAt: string; // ISO 8601 timestamp
  }) {
    const startTime = new Date(data.startAt);
    const now = new Date();
    const delay = Math.max(0, startTime.getTime() - now.getTime());

    this.logger.log(`Enqueuing appointment.start job for appointment ${data.appointmentId} with delay ${delay}ms`);
    return this.enqueueOrLog('tickets', 'appointment.start', data, {
      jobId: `appointment-start-${data.appointmentId}`,
      delay,
    });
  }

  // ============================================================================
  // Queue Management Methods
  // ============================================================================

  /**
   * Get all available queues with their counts
   */
  async getQueues() {
    if (!this.redisAvailable) {
      throw new Error('Redis not available');
    }

    const queues = [
      { name: 'tickets', queue: this.ticketsQueue },
      { name: 'notifications', queue: this.notificationsQueue },
      { name: 'dead-letter', queue: this.deadLetterQueue },
    ];

    const results = await Promise.all(
      queues.map(async ({ name, queue }) => {
        const [waiting, active, delayed, completed, failed] = await Promise.all([
          queue.getWaitingCount(),
          queue.getActiveCount(),
          queue.getDelayedCount(),
          queue.getCompletedCount(),
          queue.getFailedCount(),
        ]);

        return {
          name,
          waiting,
          active,
          delayed,
          completed,
          failed,
        };
      })
    );

    return results;
  }

  /**
   * Get detailed stats for a specific queue
   */
  async getQueue(name: string) {
    const queue = this.getQueueByName(name);
    if (!queue) {
      throw new Error(`Queue ${name} not found`);
    }

    const [waiting, active, delayed, completed, failed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getDelayedCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
    ]);

    return {
      name,
      waiting,
      active,
      delayed,
      completed,
      failed,
    };
  }

  /**
   * List jobs in a queue by status with pagination
   */
  async listJobs(
    queueName: string,
    status: 'waiting' | 'active' | 'delayed' | 'completed' | 'failed',
    page: number = 1,
    pageSize: number = 25
  ) {
    const queue = this.getQueueByName(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    const start = (page - 1) * pageSize;
    const end = start + pageSize - 1;

    let jobs;
    switch (status) {
      case 'waiting':
        jobs = await queue.getWaiting(start, end);
        break;
      case 'active':
        jobs = await queue.getActive(start, end);
        break;
      case 'delayed':
        jobs = await queue.getDelayed(start, end);
        break;
      case 'completed':
        jobs = await queue.getCompleted(start, end);
        break;
      case 'failed':
        jobs = await queue.getFailed(start, end);
        break;
      default:
        throw new Error(`Invalid status: ${status}`);
    }

    const jobDetails = await Promise.all(
      jobs.map(async (job) => ({
        id: job.id,
        name: job.name,
        data: job.data,
        status: await job.getState(),
        progress: job.progress,
        attemptsMade: job.attemptsMade,
        timestamp: job.timestamp,
        processedOn: job.processedOn,
        finishedOn: job.finishedOn,
        failedReason: job.failedReason,
      }))
    );

    return jobDetails;
  }

  /**
   * Get details for a specific job
   */
  async getJob(queueName: string, jobId: string) {
    const queue = this.getQueueByName(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    const job = await queue.getJob(jobId);
    if (!job) {
      return null;
    }

    return {
      id: job.id,
      name: job.name,
      data: job.data,
      status: await job.getState(),
      progress: job.progress,
      attemptsMade: job.attemptsMade,
      timestamp: job.timestamp,
      processedOn: job.processedOn,
      finishedOn: job.finishedOn,
      failedReason: job.failedReason,
      stacktrace: job.stacktrace,
      returnvalue: job.returnvalue,
      opts: job.opts,
    };
  }

  /**
   * Retry a failed job
   */
  async retryJob(queueName: string, jobId: string) {
    const queue = this.getQueueByName(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    const job = await queue.getJob(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found in queue ${queueName}`);
    }

    const state = await job.getState();
    if (state !== 'failed') {
      throw new Error(`Job ${jobId} is not in failed state (current: ${state})`);
    }

    await job.retry();
    this.logger.log(`Retried job ${jobId} in queue ${queueName}`);
    
    return { success: true };
  }

  /**
   * Remove a job from the queue
   */
  async removeJob(queueName: string, jobId: string) {
    const queue = this.getQueueByName(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    const job = await queue.getJob(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found in queue ${queueName}`);
    }

    await job.remove();
    this.logger.log(`Removed job ${jobId} from queue ${queueName}`);
    
    return { success: true };
  }

  /**
   * Fail/cancel a job
   */
  async failJob(queueName: string, jobId: string, reason: string = 'Manually cancelled') {
    const queue = this.getQueueByName(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    const job = await queue.getJob(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found in queue ${queueName}`);
    }

    await job.moveToFailed(new Error(reason), '', true);
    this.logger.log(`Failed job ${jobId} in queue ${queueName}: ${reason}`);
    
    return { success: true };
  }

  /**
   * Get queue statistics
   */
  async stats(queueName: string) {
    const queue = this.getQueueByName(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    const [counts, metrics] = await Promise.all([
      queue.getJobCounts(),
      queue.getMetrics('completed', Date.now() - 86400000, Date.now()) // Last 24 hours
    ]);

    return {
      counts,
      metrics,
    };
  }

  /**
   * Check if Redis is available
   */
  isRedisAvailable(): boolean {
    return this.redisAvailable;
  }

  /**
   * Get queue by name (helper method)
   */
  private getQueueByName(name: string): Queue | null {
    switch (name) {
      case 'tickets':
        return this.ticketsQueue;
      case 'notifications':
        return this.notificationsQueue;
      case 'dead-letter':
        return this.deadLetterQueue;
      default:
        return null;
    }
  }
}
