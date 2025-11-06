import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';

/**
 * Ticket Jobs Processor - Processes background jobs for ticket lifecycle events
 * 
 * Jobs handled:
 * - ticket.created - Notify landlord and ops team
 * - ticket.quoted - Notify landlord of new quote
 * - ticket.approved - Notify contractor to start work
 * - ticket.assigned - Notify contractor of assignment
 */
@Processor('tickets')
export class TicketJobsProcessor extends WorkerHost {
  private readonly logger = new Logger(TicketJobsProcessor.name);

  async process(job: Job): Promise<unknown> {
    this.logger.log(`Processing job ${job.name} with ID ${job.id}`);
    this.logger.debug(`Job data: ${JSON.stringify(job.data)}`);

    try {
      switch (job.name) {
        case 'ticket.created':
          return await this.handleTicketCreated(job);
        case 'ticket.quoted':
          return await this.handleTicketQuoted(job);
        case 'ticket.approved':
          return await this.handleTicketApproved(job);
        case 'ticket.assigned':
          return await this.handleTicketAssigned(job);
        default:
          this.logger.warn(`Unknown job type: ${job.name}`);
          return { status: 'skipped', reason: 'unknown job type' };
      }
    } catch (error) {
      this.logger.error(`Job ${job.id} failed: ${error.message}`, error.stack);
      throw error; // Re-throw to trigger retry
    }
  }

  /**
   * Handle ticket.created event
   * In production: send email/webhook to landlord and ops team
   */
  private async handleTicketCreated(job: Job) {
    const { ticketId, propertyId, createdById, landlordId } = job.data;
    
    this.logger.log(`[ticket.created] Ticket ${ticketId} created by ${createdById}`);
    this.logger.log(`[ticket.created] Property: ${propertyId}, Landlord: ${landlordId}`);
    
    // TODO: Send actual notifications when email service is integrated
    // await this.emailService.send({
    //   to: landlordEmail,
    //   subject: 'New Maintenance Ticket',
    //   template: 'ticket-created',
    //   data: { ticketId, propertyId }
    // });

    return {
      status: 'success',
      event: 'ticket.created',
      ticketId,
      notificationsSent: ['landlord', 'ops'], // Mock for now
    };
  }

  /**
   * Handle ticket.quoted event
   * In production: notify landlord of new quote for approval
   */
  private async handleTicketQuoted(job: Job) {
    const { ticketId, quoteId, contractorId, amount, landlordId } = job.data;
    
    this.logger.log(`[ticket.quoted] Quote ${quoteId} submitted for ticket ${ticketId}`);
    this.logger.log(`[ticket.quoted] Contractor: ${contractorId}, Amount: £${amount}`);
    
    // TODO: Send quote notification to landlord
    // await this.emailService.send({
    //   to: landlordEmail,
    //   subject: `New Quote for Ticket #${ticketId}`,
    //   template: 'quote-submitted',
    //   data: { ticketId, quoteId, amount }
    // });

    return {
      status: 'success',
      event: 'ticket.quoted',
      ticketId,
      quoteId,
      notificationsSent: ['landlord'],
    };
  }

  /**
   * Handle ticket.approved event
   * In production: notify contractor to begin work, notify tenant
   */
  private async handleTicketApproved(job: Job) {
    const { ticketId, quoteId, approvedBy, landlordId } = job.data;
    
    this.logger.log(`[ticket.approved] Quote ${quoteId} approved for ticket ${ticketId}`);
    this.logger.log(`[ticket.approved] Approved by: ${approvedBy}`);
    
    // TODO: Notify contractor and tenant
    // await Promise.all([
    //   this.emailService.send({
    //     to: contractorEmail,
    //     subject: 'Quote Approved - Start Work',
    //     template: 'quote-approved',
    //     data: { ticketId, quoteId }
    //   }),
    //   this.emailService.send({
    //     to: tenantEmail,
    //     subject: 'Maintenance Work Scheduled',
    //     template: 'work-scheduled',
    //     data: { ticketId }
    //   })
    // ]);

    return {
      status: 'success',
      event: 'ticket.approved',
      ticketId,
      quoteId,
      notificationsSent: ['contractor', 'tenant'],
    };
  }

  /**
   * Handle ticket.assigned event
   * In production: notify contractor of new assignment
   */
  private async handleTicketAssigned(job: Job) {
    const { ticketId, assignedToId, assignedBy, landlordId } = job.data;
    
    this.logger.log(`[ticket.assigned] Ticket ${ticketId} assigned to ${assignedToId}`);
    this.logger.log(`[ticket.assigned] Assigned by: ${assignedBy}`);
    
    // TODO: Notify contractor
    // await this.emailService.send({
    //   to: contractorEmail,
    //   subject: 'New Job Assignment',
    //   template: 'job-assigned',
    //   data: { ticketId }
    // });

    return {
      status: 'success',
      event: 'ticket.assigned',
      ticketId,
      assignedToId,
      notificationsSent: ['contractor'],
    };
  }
}
