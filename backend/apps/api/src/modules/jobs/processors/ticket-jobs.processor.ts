import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger, Inject, forwardRef } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { EventsService } from '../../events/events.service';
import { NotificationsService } from '../../notifications/notifications.service';

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
    private readonly notificationsService: NotificationsService,
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
        case 'ticket.escalate':
          return await this.handleTicketEscalation(job);
        case 'appointment.reminder':
          return await this.handleAppointmentReminder(job);
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
   * Send notifications to landlord and ops team
   */
  private async handleTicketCreated(job: Job) {
    const { ticketId, propertyId, createdById, landlordId } = job.data;
    
    this.logger.log(`[ticket.created] Ticket ${ticketId} created by ${createdById}`);
    this.logger.log(`[ticket.created] Property: ${propertyId}, Landlord: ${landlordId}`);
    
    try {
      // Get ticket details for notification
      const ticket = await this.prisma.ticket.findUnique({
        where: { id: ticketId },
        include: {
          property: true,
          createdBy: true,
        },
      });

      if (!ticket) {
        this.logger.error(`[ticket.created] Ticket ${ticketId} not found`);
        return { status: 'error', reason: 'ticket not found' };
      }

      // Find landlord users to notify
      const landlordUsers = await this.prisma.orgMember.findMany({
        where: {
          orgId: landlordId,
          role: { in: ['LANDLORD', 'OPS'] },
        },
        include: {
          user: true,
        },
      });

      const userIds = landlordUsers.map(member => member.userId);

      // Create notifications for landlord and ops users
      if (userIds.length > 0) {
        await this.notificationsService.createMany(userIds, {
          type: 'TICKET_CREATED',
          title: 'New Maintenance Ticket',
          message: `New ticket: ${ticket.title} at ${ticket.property?.addressLine1 || 'property'}`,
          resourceType: 'ticket',
          resourceId: ticketId,
        });

        this.logger.log(`[ticket.created] Notifications sent to ${userIds.length} users`);
      }

      return {
        status: 'success',
        event: 'ticket.created',
        ticketId,
        notificationsSent: userIds.length,
      };
    } catch (error) {
      this.logger.error(`[ticket.created] Failed to send notifications: ${error.message}`);
      throw error;
    }
  }

  /**
   * Handle ticket.quoted event
   * Send notification to landlord for quote approval
   */
  private async handleTicketQuoted(job: Job) {
    const { ticketId, quoteId, contractorId, amount, landlordId } = job.data;
    
    this.logger.log(`[ticket.quoted] Quote ${quoteId} submitted for ticket ${ticketId}`);
    this.logger.log(`[ticket.quoted] Contractor: ${contractorId}, Amount: £${amount}`);
    
    try {
      // Get quote and ticket details
      const quote = await this.prisma.quote.findUnique({
        where: { id: quoteId },
        include: {
          ticket: {
            include: {
              property: true,
            },
          },
          contractor: true,
        },
      });

      if (!quote) {
        this.logger.error(`[ticket.quoted] Quote ${quoteId} not found`);
        return { status: 'error', reason: 'quote not found' };
      }

      // Find landlord users to notify
      const landlordUsers = await this.prisma.orgMember.findMany({
        where: {
          orgId: landlordId,
          role: 'LANDLORD',
        },
        include: {
          user: true,
        },
      });

      const userIds = landlordUsers.map(member => member.userId);

      // Create notifications for landlord users
      if (userIds.length > 0) {
        await this.notificationsService.createMany(userIds, {
          type: 'QUOTE_SUBMITTED',
          title: 'New Quote for Approval',
          message: `Quote of £${amount} submitted by ${quote.contractor?.name || 'contractor'} for ticket: ${quote.ticket.title}`,
          resourceType: 'quote',
          resourceId: quoteId,
        });

        this.logger.log(`[ticket.quoted] Notifications sent to ${userIds.length} landlord users`);
      }

      return {
        status: 'success',
        event: 'ticket.quoted',
        ticketId,
        quoteId,
        notificationsSent: userIds.length,
      };
    } catch (error) {
      this.logger.error(`[ticket.quoted] Failed to send notifications: ${error.message}`);
      throw error;
    }
  }

  /**
   * Handle ticket.approved event
   * Send notifications to contractor and tenant
   */
  private async handleTicketApproved(job: Job) {
    const { ticketId, quoteId, approvedBy, landlordId } = job.data;
    
    this.logger.log(`[ticket.approved] Quote ${quoteId} approved for ticket ${ticketId}`);
    this.logger.log(`[ticket.approved] Approved by: ${approvedBy}`);
    
    try {
      // Get ticket and quote details
      const ticket = await this.prisma.ticket.findUnique({
        where: { id: ticketId },
        include: {
          property: true,
          assignedTo: true,
          createdBy: true,
        },
      });

      if (!ticket) {
        this.logger.error(`[ticket.approved] Ticket ${ticketId} not found`);
        return { status: 'error', reason: 'ticket not found' };
      }

      // Get the quote details
      const quote = await this.prisma.quote.findUnique({
        where: { id: quoteId },
        include: {
          contractor: true,
        },
      });

      const userIdsToNotify: string[] = [];

      // Notify contractor (quote creator)
      if (quote?.contractorId) {
        userIdsToNotify.push(quote.contractorId);
        await this.notificationsService.create({
          userId: quote.contractorId,
          type: 'QUOTE_APPROVED',
          title: 'Quote Approved',
          message: `Your quote for "${ticket.title}" has been approved. You can now start work.`,
          resourceType: 'ticket',
          resourceId: ticketId,
        });
      }

      // Notify ticket creator (tenant)
      if (ticket.createdById && ticket.createdById !== quote?.contractorId) {
        userIdsToNotify.push(ticket.createdById);
        await this.notificationsService.create({
          userId: ticket.createdById,
          type: 'WORK_SCHEDULED',
          title: 'Maintenance Work Scheduled',
          message: `Maintenance work for "${ticket.title}" has been approved and scheduled.`,
          resourceType: 'ticket',
          resourceId: ticketId,
        });
      }

      this.logger.log(`[ticket.approved] Notifications sent to ${userIdsToNotify.length} users`);

      return {
        status: 'success',
        event: 'ticket.approved',
        ticketId,
        quoteId,
        notificationsSent: userIdsToNotify.length,
      };
    } catch (error) {
      this.logger.error(`[ticket.approved] Failed to send notifications: ${error.message}`);
      throw error;
    }
  }

  /**
   * Handle ticket.assigned event
   * Send notification to contractor about new assignment
   */
  private async handleTicketAssigned(job: Job) {
    const { ticketId, assignedToId, assignedBy, landlordId } = job.data;
    
    this.logger.log(`[ticket.assigned] Ticket ${ticketId} assigned to ${assignedToId}`);
    this.logger.log(`[ticket.assigned] Assigned by: ${assignedBy}`);
    
    try {
      // Get ticket details
      const ticket = await this.prisma.ticket.findUnique({
        where: { id: ticketId },
        include: {
          property: true,
          assignedTo: true,
        },
      });

      if (!ticket) {
        this.logger.error(`[ticket.assigned] Ticket ${ticketId} not found`);
        return { status: 'error', reason: 'ticket not found' };
      }

      // Notify assigned contractor
      if (assignedToId) {
        await this.notificationsService.create({
          userId: assignedToId,
          type: 'JOB_ASSIGNED',
          title: 'New Job Assignment',
          message: `You have been assigned to work on: ${ticket.title} at ${ticket.property?.addressLine1 || 'property'}`,
          resourceType: 'ticket',
          resourceId: ticketId,
        });

        this.logger.log(`[ticket.assigned] Notification sent to contractor ${assignedToId}`);
      }

      return {
        status: 'success',
        event: 'ticket.assigned',
        ticketId,
        assignedToId,
        notificationsSent: assignedToId ? 1 : 0,
      };
    } catch (error) {
      this.logger.error(`[ticket.assigned] Failed to send notification: ${error.message}`);
      throw error;
    }
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

      // Send notifications to relevant parties
      try {
        const userIdsToNotify: string[] = [];

        // Notify tenant (ticket creator)
        if (ticket.createdById) {
          userIdsToNotify.push(ticket.createdById);
          await this.notificationsService.create({
            userId: ticket.createdById,
            type: 'WORK_STARTED',
            title: 'Maintenance Work Started',
            message: `Work has started on: ${ticket.title}`,
            resourceType: 'ticket',
            resourceId: ticketId,
          });
        }

        // Notify assigned contractor
        if (ticket.assignedToId) {
          userIdsToNotify.push(ticket.assignedToId);
          await this.notificationsService.create({
            userId: ticket.assignedToId,
            type: 'WORK_STARTED',
            title: 'Job Started',
            message: `Your scheduled appointment for "${ticket.title}" has begun.`,
            resourceType: 'ticket',
            resourceId: ticketId,
          });
        }

        // Notify landlord users
        const landlordUsers = await this.prisma.orgMember.findMany({
          where: {
            orgId: ticket.landlordId,
            role: 'LANDLORD',
          },
        });

        const landlordUserIds = landlordUsers.map(member => member.userId);
        userIdsToNotify.push(...landlordUserIds);
        
        // Batch create notifications for landlord users
        if (landlordUserIds.length > 0) {
          await this.notificationsService.createMany(landlordUserIds, {
            type: 'WORK_STARTED',
            title: 'Maintenance Work Started',
            message: `Work has started on ticket: ${ticket.title}`,
            resourceType: 'ticket',
            resourceId: ticketId,
          });
        }

        this.logger.log(`[appointment.start] Notifications sent to ${userIdsToNotify.length} users`);
      } catch (notificationError) {
        this.logger.error(`[appointment.start] Failed to send notifications: ${notificationError.message}`);
        // Don't throw - notifications are not critical for the job to succeed
      }

      return {
        status: 'success',
        event: 'appointment.start',
        ticketId,
        appointmentId,
        transitionedAt: now,
      };
    } catch (error) {
      this.logger.error(`[appointment.start] Error processing job: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Handle ticket escalation (Critical Priority #3)
   * Auto-escalate stale tickets
   */
  private async handleTicketEscalation(job: Job) {
    this.logger.log(`[ticket.escalate] Processing ticket escalation`);
    
    const staleThreshold = 24 * 60 * 60 * 1000; // 24 hours
    const now = new Date();
    
    try {
      // Find tickets in OPEN/TRIAGED for > 24 hours
      const staleTickets = await this.prisma.ticket.findMany({
        where: {
          status: { in: ['OPEN', 'TRIAGED'] },
          createdAt: { lt: new Date(now.getTime() - staleThreshold) },
          priority: { not: 'URGENT' }, // Don't escalate already urgent
        },
        include: {
          property: true,
          tenancy: true,
        },
      });

      let escalatedCount = 0;

      for (const ticket of staleTickets) {
        // Determine new priority
        let newPriority: string;
        switch (ticket.priority) {
          case 'LOW':
            newPriority = 'STANDARD';
            break;
          case 'STANDARD':
            newPriority = 'HIGH';
            break;
          case 'HIGH':
            newPriority = 'URGENT';
            break;
          default:
            newPriority = ticket.priority;
        }

        // Update ticket priority
        await this.prisma.ticket.update({
          where: { id: ticket.id },
          data: { priority: newPriority },
        });

        // Create timeline event
        await this.prisma.ticketTimeline.create({
          data: {
            ticketId: ticket.id,
            eventType: 'auto_escalated',
            actorId: null, // System action
            details: JSON.stringify({
              oldPriority: ticket.priority,
              newPriority,
              reason: 'Ticket open for 24+ hours',
            }),
          },
        });

        // Find OPS users to notify
        const opsUsers = await this.prisma.orgMember.findMany({
          where: {
            orgId: ticket.landlordId,
            role: 'OPS',
          },
        });

        const opsUserIds = opsUsers.map(member => member.userId);

        // Notify OPS team
        if (opsUserIds.length > 0) {
          await this.notificationsService.createMany(opsUserIds, {
            type: 'TICKET_ESCALATED',
            title: 'Ticket Auto-Escalated',
            message: `Ticket "${ticket.title}" has been open for 24+ hours and escalated to ${newPriority} priority`,
            resourceType: 'ticket',
            resourceId: ticket.id,
          });
        }

        // Emit SSE event
        this.eventsService.emit({
          type: 'ticket.escalated',
          actorRole: 'SYSTEM',
          landlordId: ticket.landlordId,
          tenantId: ticket.tenancy?.tenantOrgId,
          resources: [{ type: 'ticket', id: ticket.id }],
          payload: { oldPriority: ticket.priority, newPriority },
        });

        escalatedCount++;
      }

      this.logger.log(`[ticket.escalate] Escalated ${escalatedCount} tickets`);

      return {
        status: 'success',
        event: 'ticket.escalate',
        escalatedCount,
      };
    } catch (error) {
      this.logger.error(`[ticket.escalate] Error processing job: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Handle appointment reminder (Medium Priority #11)
   * Send reminders 24h and 2h before appointment
   */
  private async handleAppointmentReminder(job: Job) {
    const { appointmentId, reminderType } = job.data; // '24h' or '2h'
    
    this.logger.log(`[appointment.reminder] Sending ${reminderType} reminder for appointment ${appointmentId}`);
    
    try {
      const appointment = await this.prisma.appointment.findUnique({
        where: { id: appointmentId },
        include: {
          ticket: {
            include: {
              tenancy: true,
              property: true,
            },
          },
          contractor: true,
        },
      });

      if (!appointment) {
        this.logger.warn(`[appointment.reminder] Appointment ${appointmentId} not found`);
        return { status: 'skipped', reason: 'appointment not found' };
      }

      if (appointment.status !== 'CONFIRMED') {
        this.logger.warn(`[appointment.reminder] Appointment ${appointmentId} is not confirmed`);
        return { status: 'skipped', reason: 'appointment not confirmed' };
      }

      const userIdsToNotify: string[] = [];

      // Notify tenant
      if (appointment.ticket.createdById) {
        userIdsToNotify.push(appointment.ticket.createdById);
        await this.notificationsService.create({
          userId: appointment.ticket.createdById,
          type: 'APPOINTMENT_REMINDER',
          title: `Appointment Reminder (${reminderType})`,
          message: `Reminder: Appointment for "${appointment.ticket.title}" is scheduled for ${appointment.startAt.toLocaleString()}`,
          resourceType: 'appointment',
          resourceId: appointmentId,
        });
      }

      // Notify contractor
      userIdsToNotify.push(appointment.contractorId);
      await this.notificationsService.create({
        userId: appointment.contractorId,
        type: 'APPOINTMENT_REMINDER',
        title: `Appointment Reminder (${reminderType})`,
        message: `Reminder: You have an appointment for "${appointment.ticket.title}" at ${appointment.startAt.toLocaleString()}`,
        resourceType: 'appointment',
        resourceId: appointmentId,
      });

      // Notify landlord users
      const landlordUsers = await this.prisma.orgMember.findMany({
        where: {
          orgId: appointment.ticket.landlordId,
          role: 'LANDLORD',
        },
      });

      const landlordUserIds = landlordUsers.map(member => member.userId);
      userIdsToNotify.push(...landlordUserIds);

      if (landlordUserIds.length > 0) {
        await this.notificationsService.createMany(landlordUserIds, {
          type: 'APPOINTMENT_REMINDER',
          title: `Appointment Reminder (${reminderType})`,
          message: `Reminder: Appointment for ticket "${appointment.ticket.title}" is scheduled for ${appointment.startAt.toLocaleString()}`,
          resourceType: 'appointment',
          resourceId: appointmentId,
        });
      }

      this.logger.log(`[appointment.reminder] Sent ${reminderType} reminders to ${userIdsToNotify.length} users`);

      return {
        status: 'success',
        event: 'appointment.reminder',
        appointmentId,
        reminderType,
        notificationsSent: userIdsToNotify.length,
      };
    } catch (error) {
      this.logger.error(`[appointment.reminder] Error processing job: ${error.message}`, error.stack);
      throw error;
    }
  }
}
