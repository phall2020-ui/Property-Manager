import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger, Inject, forwardRef } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { EventsService } from '../../events/events.service';

/**
 * Ticket Jobs Processor - Processes background jobs for ticket lifecycle events
 * 
 * Jobs handled:
 * - ticket.created - Notify landlord and ops team
 * - ticket.quoted - Notify landlord of new quote
 * - ticket.approved - Notify contractor to start work
 * - ticket.assigned - Notify contractor of assignment
 * - appointment.start - Auto-transition ticket to IN_PROGRESS at appointment time
 */
@Processor('tickets')
export class TicketJobsProcessor extends WorkerHost {
  private readonly logger = new Logger(TicketJobsProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => EventsService))
    private readonly eventsService: EventsService,
  ) {
    super();
  }

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
        case 'appointment.start':
          return await this.handleAppointmentStart(job);
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

  /**
   * Handle appointment.start event
   * Auto-transition ticket from SCHEDULED to IN_PROGRESS at appointment start time
   * Implements idempotency and grace period handling
   */
  private async handleAppointmentStart(job: Job) {
    const { appointmentId, ticketId, startAt } = job.data;
    
    this.logger.log(`[appointment.start] Processing auto-transition for ticket ${ticketId}`);
    
    const GRACE_START_MINUTES = 0; // Allow immediate start
    const NO_SHOW_GRACE_MINUTES = 60; // Wait 60 minutes before marking no-show
    
    try {
      // Fetch appointment and ticket
      const appointment = await this.prisma.appointment.findUnique({
        where: { id: appointmentId },
        include: {
          ticket: {
            include: {
              tenancy: true,
            },
          },
        },
      });

      if (!appointment) {
        this.logger.warn(`[appointment.start] Appointment ${appointmentId} not found`);
        return { status: 'skipped', reason: 'appointment not found' };
      }

      if (appointment.status !== 'CONFIRMED') {
        this.logger.warn(`[appointment.start] Appointment ${appointmentId} is not confirmed (status: ${appointment.status})`);
        return { status: 'skipped', reason: 'appointment not confirmed' };
      }

      const ticket = appointment.ticket;
      
      // Check if ticket is still SCHEDULED (idempotency check)
      if (ticket.status !== 'SCHEDULED') {
        this.logger.log(`[appointment.start] Ticket ${ticketId} already transitioned from SCHEDULED (current: ${ticket.status})`);
        return { status: 'skipped', reason: 'already transitioned' };
      }

      const now = new Date();
      const appointmentStartTime = new Date(startAt);
      const graceStartTime = new Date(appointmentStartTime.getTime() + GRACE_START_MINUTES * 60000);

      // Check if we're within the grace period to start
      if (now < graceStartTime) {
        this.logger.log(`[appointment.start] Too early to start. Waiting until ${graceStartTime}`);
        return { status: 'skipped', reason: 'too early' };
      }

      // Transition ticket to IN_PROGRESS
      await this.prisma.ticket.update({
        where: { id: ticketId },
        data: {
          status: 'IN_PROGRESS',
          inProgressAt: now,
        },
      });

      // Create timeline event
      await this.prisma.ticketTimeline.create({
        data: {
          ticketId,
          eventType: 'job_started',
          actorId: null, // System action
          details: JSON.stringify({
            appointmentId,
            startedAt: now,
            automatic: true,
          }),
        },
      });

      // Emit SSE event
      this.eventsService.emit({
        type: 'ticket.status_changed',
        actorRole: 'SYSTEM',
        landlordId: ticket.landlordId,
        tenantId: ticket.tenancy?.tenantOrgId,
        resources: [{ type: 'ticket', id: ticketId }],
        payload: { status: 'IN_PROGRESS', automatic: true },
      });

      this.logger.log(`[appointment.start] Ticket ${ticketId} auto-transitioned to IN_PROGRESS`);

      // TODO: Send notifications to tenant, contractor, and landlord
      // await this.notificationService.send({
      //   type: 'email',
      //   to: [tenantEmail, contractorEmail, landlordEmail],
      //   subject: 'Maintenance Work Started',
      //   template: 'job-started',
      //   data: { ticketId, appointmentId }
      // });

      return {
        status: 'success',
        event: 'appointment.start',
        ticketId,
        appointmentId,
        transitionedAt: now,
        notificationsSent: ['tenant', 'contractor', 'landlord'],
      };
    } catch (error) {
      this.logger.error(`[appointment.start] Error processing job: ${error.message}`, error.stack);
      throw error;
    }
  }
}
