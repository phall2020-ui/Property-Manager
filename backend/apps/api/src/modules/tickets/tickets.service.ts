import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { EventsService } from '../events/events.service';
import { NotificationsService } from '../notifications/notifications.service';
import { JobsService } from '../jobs/jobs.service';

@Injectable()
export class TicketsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventsService: EventsService,
    private readonly notificationsService: NotificationsService,
    private readonly jobsService: JobsService,
  ) {}

  async create(data: {
    landlordId: string;
    propertyId?: string;
    tenancyId?: string;
    title: string;
    description: string;
    priority: string;
    createdById: string;
    category?: string;
  }) {
    const ticket = await this.prisma.ticket.create({
      data: {
        ...data,
        status: 'OPEN',
      },
      include: {
        property: true,
        tenancy: true,
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Create timeline event
    await this.prisma.ticketTimeline.create({
      data: {
        ticketId: ticket.id,
        eventType: 'created',
        actorId: data.createdById,
        details: JSON.stringify({
          title: ticket.title,
          priority: ticket.priority,
          category: ticket.category,
        }),
      },
    });

    // Emit SSE event
    this.eventsService.emit({
      type: 'ticket.created',
      actorRole: 'TENANT',
      landlordId: ticket.landlordId,
      tenantId: ticket.tenancy?.tenantOrgId,
      resources: [
        { type: 'ticket', id: ticket.id },
        ...(ticket.propertyId ? [{ type: 'property', id: ticket.propertyId }] : []),
      ],
    });

    // Enqueue background job for notifications
    await this.jobsService.enqueueTicketCreated({
      ticketId: ticket.id,
      propertyId: ticket.propertyId || '',
      createdById: data.createdById,
      landlordId: ticket.landlordId,
    });

    // Create notifications for landlord users
    // TODO: Get landlord users from orgMembers
    
    return ticket;
  }

  async findOne(id: string, userOrgIds: string[]) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id },
      include: {
        property: true,
        tenancy: {
          include: {
            tenantOrg: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        quotes: {
          include: {
            contractor: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        attachmentFiles: true,
      },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    // Check access - now using landlordId for tenant isolation
    const hasAccess = userOrgIds.includes(ticket.landlordId) ||
      (ticket.property && userOrgIds.includes(ticket.property.ownerOrgId)) ||
      (ticket.tenancy && userOrgIds.includes(ticket.tenancy.tenantOrgId));

    if (!hasAccess) {
      throw new ForbiddenException('Access denied');
    }

    return ticket;
  }

  async findMany(
    userOrgIds: string[],
    role: string,
    filters?: { propertyId?: string; status?: string },
  ) {
    const where: any = {};

    if (role === 'LANDLORD') {
      where.property = {
        ownerOrgId: { in: userOrgIds },
      };
    } else if (role === 'TENANT') {
      where.tenancy = {
        tenantOrgId: { in: userOrgIds },
      };
    } else if (role === 'CONTRACTOR') {
      // Contractors see tickets assigned to them
      where.assignedToId = { not: null };
    }

    // Apply filters
    if (filters?.propertyId) {
      where.propertyId = filters.propertyId;
    }
    if (filters?.status) {
      where.status = filters.status;
    }

    return this.prisma.ticket.findMany({
      where,
      include: {
        property: true,
        tenancy: true,
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        quotes: true,
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async createQuote(
    ticketId: string,
    contractorId: string,
    amount: number,
    notes?: string,
  ) {
    // Verify ticket exists
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        tenancy: true,
      },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    // Create quote
    const quote = await this.prisma.quote.create({
      data: {
        ticketId,
        contractorId,
        amount,
        notes,
        status: 'PROPOSED',
      },
    });

    // Update ticket status to QUOTED
    await this.prisma.ticket.update({
      where: { id: ticketId },
      data: { status: 'QUOTED' },
    });

    // Create timeline event
    await this.prisma.ticketTimeline.create({
      data: {
        ticketId,
        eventType: 'quote_submitted',
        actorId: contractorId,
        details: JSON.stringify({
          quoteId: quote.id,
          amount,
        }),
      },
    });

    // Emit SSE event
    this.eventsService.emit({
      type: 'ticket.quote_submitted',
      actorRole: 'CONTRACTOR',
      landlordId: ticket.landlordId,
      tenantId: ticket.tenancy?.tenantOrgId,
      resources: [
        { type: 'ticket', id: ticketId },
        { type: 'quote', id: quote.id },
      ],
      payload: { amount },
    });

    // Enqueue background job for notifications
    await this.jobsService.enqueueTicketQuoted({
      ticketId,
      quoteId: quote.id,
      contractorId,
      amount,
      landlordId: ticket.landlordId,
    });

    return quote;
  }

  async approveQuote(quoteId: string, userOrgIds: string[]) {
    const quote = await this.prisma.quote.findUnique({
      where: { id: quoteId },
      include: {
        ticket: {
          include: {
            property: true,
            tenancy: true,
          },
        },
      },
    });

    if (!quote) {
      throw new NotFoundException('Quote not found');
    }

    // Verify user is landlord of property
    if (!userOrgIds.includes(quote.ticket.property.ownerOrgId)) {
      throw new ForbiddenException('Only property owner can approve quotes');
    }

    // Update quote
    await this.prisma.quote.update({
      where: { id: quoteId },
      data: {
        status: 'APPROVED',
        approvedAt: new Date(),
      },
    });

    // Update ticket status to APPROVED
    await this.prisma.ticket.update({
      where: { id: quote.ticketId },
      data: { status: 'APPROVED' },
    });

    // Create timeline event
    await this.prisma.ticketTimeline.create({
      data: {
        ticketId: quote.ticketId,
        eventType: 'quote_approved',
        actorId: null, // TODO: Get from context
        details: JSON.stringify({
          quoteId,
          amount: quote.amount,
        }),
      },
    });

    // Emit SSE event
    this.eventsService.emit({
      type: 'ticket.approved',
      actorRole: 'LANDLORD',
      landlordId: quote.ticket.landlordId,
      tenantId: quote.ticket.tenancy?.tenantOrgId,
      resources: [
        { type: 'ticket', id: quote.ticketId },
        { type: 'quote', id: quoteId },
      ],
      payload: { amount: quote.amount },
    });

    // Enqueue background job for notifications
    await this.jobsService.enqueueTicketApproved({
      ticketId: quote.ticketId,
      quoteId,
      approvedBy: 'landlord', // TODO: Get from context
      landlordId: quote.ticket.landlordId,
    });

    return { message: 'Quote approved successfully' };
  }

  async completeTicket(
    ticketId: string,
    contractorId: string,
    completionNotes?: string,
  ) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        quotes: {
          where: {
            contractorId,
            status: 'APPROVED',
          },
        },
        tenancy: true,
      },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    if (ticket.quotes.length === 0) {
      throw new ForbiddenException('No approved quote found for this contractor');
    }

    // Update quote
    await this.prisma.quote.updateMany({
      where: {
        ticketId,
        contractorId,
        status: 'APPROVED',
      },
      data: {
        completedAt: new Date(),
        completionNotes,
      },
    });

    // Update ticket to COMPLETED
    await this.prisma.ticket.update({
      where: { id: ticketId },
      data: { status: 'COMPLETED' },
    });

    // Create timeline event
    await this.prisma.ticketTimeline.create({
      data: {
        ticketId,
        eventType: 'completed',
        actorId: contractorId,
        details: JSON.stringify({
          completionNotes,
        }),
      },
    });

    // Emit SSE event
    this.eventsService.emit({
      type: 'ticket.completed',
      actorRole: 'CONTRACTOR',
      landlordId: ticket.landlordId,
      tenantId: ticket.tenancy?.tenantOrgId,
      resources: [{ type: 'ticket', id: ticketId }],
    });

    return { message: 'Ticket marked as complete' };
  }

  async uploadAttachment(
    ticketId: string,
    filename: string,
    filepath: string,
    mimetype: string,
    size: number,
    userOrgIds: string[],
  ) {
    // Verify access
    await this.findOne(ticketId, userOrgIds);

    return this.prisma.ticketAttachment.create({
      data: {
        ticketId,
        filename,
        filepath,
        mimetype,
        size,
      },
    });
  }

  async findProperty(propertyId: string) {
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
      select: { id: true, ownerOrgId: true },
    });

    if (!property) {
      throw new NotFoundException('Property not found');
    }

    return property;
  }

  async findTenancy(tenancyId: string) {
    const tenancy = await this.prisma.tenancy.findUnique({
      where: { id: tenancyId },
      include: {
        property: {
          select: { id: true, ownerOrgId: true },
        },
      },
    });

    if (!tenancy) {
      throw new NotFoundException('Tenancy not found');
    }

    return tenancy;
  }

  /**
   * Update ticket status with state machine validation
   */
  async updateStatus(
    ticketId: string,
    newStatus: string,
    actorId: string,
    userOrgIds: string[],
  ) {
    // Verify access
    const ticket = await this.findOne(ticketId, userOrgIds);

    // Validate state transition
    const validTransitions: Record<string, string[]> = {
      OPEN: ['TRIAGED', 'CANCELLED'],
      TRIAGED: ['QUOTED', 'CANCELLED'],
      QUOTED: ['APPROVED', 'CANCELLED'],
      APPROVED: ['SCHEDULED', 'IN_PROGRESS', 'CANCELLED'],
      SCHEDULED: ['IN_PROGRESS', 'CANCELLED'],
      IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
      COMPLETED: ['AUDITED'],
      AUDITED: [],
      CANCELLED: [],
    };

    const allowedNext = validTransitions[ticket.status] || [];
    if (!allowedNext.includes(newStatus)) {
      throw new ForbiddenException(
        `Invalid transition from ${ticket.status} to ${newStatus}`,
      );
    }

    // Update ticket
    const updated = await this.prisma.ticket.update({
      where: { id: ticketId },
      data: { status: newStatus },
    });

    // Create timeline event
    await this.prisma.ticketTimeline.create({
      data: {
        ticketId,
        eventType: 'status_changed',
        actorId,
        details: JSON.stringify({
          from: ticket.status,
          to: newStatus,
        }),
      },
    });

    // Emit SSE event
    this.eventsService.emit({
      type: 'ticket.status_changed',
      actorRole: 'LANDLORD', // TODO: Determine from user
      landlordId: ticket.landlordId,
      tenantId: ticket.tenancy?.tenantOrgId,
      resources: [{ type: 'ticket', id: ticketId }],
      payload: { status: newStatus },
    });

    return updated;
  }

  /**
   * Get ticket timeline
   */
  async getTimeline(ticketId: string, userOrgIds: string[]) {
    // Verify access
    await this.findOne(ticketId, userOrgIds);

    return this.prisma.ticketTimeline.findMany({
      where: { ticketId },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Approve ticket (wrapper that finds and approves the quote)
   */
  async approveTicket(
    ticketId: string,
    userId: string,
    userOrgIds: string[],
    idempotencyKey?: string,
  ) {
    // Verify access
    const ticket = await this.findOne(ticketId, userOrgIds);

    // Find an approved or pending quote
    const quote = await this.prisma.quote.findFirst({
      where: {
        ticketId,
        status: { in: ['PENDING', 'PROPOSED'] },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!quote) {
      throw new NotFoundException('No pending quote found for this ticket');
    }

    // TODO: Check idempotency key if provided

    // Approve the quote
    return this.approveQuote(quote.id, userOrgIds);
  }

  /**
   * Create a ticket by a landlord
   */
  async createByLandlord(data: {
    landlordId: string;
    propertyId: string;
    tenancyId?: string;
    title: string;
    description: string;
    priority: string;
    createdById: string;
    category?: string;
  }) {
    // Verify property ownership
    const property = await this.prisma.property.findUnique({
      where: { id: data.propertyId },
      include: {
        tenancies: {
          where: {
            status: 'ACTIVE',
          },
          orderBy: {
            start: 'desc',
          },
          take: 1,
        },
      },
    });

    if (!property) {
      throw new NotFoundException('Property not found');
    }

    if (property.ownerOrgId !== data.landlordId) {
      throw new ForbiddenException('You do not own this property');
    }

    // Derive tenancy if not provided
    let tenancyId = data.tenancyId;
    if (!tenancyId && property.tenancies.length > 0) {
      tenancyId = property.tenancies[0].id;
    }

    // Verify tenancy if provided
    if (tenancyId) {
      const tenancy = await this.prisma.tenancy.findUnique({
        where: { id: tenancyId },
      });

      if (!tenancy || tenancy.propertyId !== data.propertyId) {
        throw new ForbiddenException('Invalid tenancy for this property');
      }
    }

    // Create ticket with createdByRole = LANDLORD
    const ticket = await this.prisma.ticket.create({
      data: {
        landlordId: data.landlordId,
        propertyId: data.propertyId,
        tenancyId,
        title: data.title,
        description: data.description,
        priority: data.priority,
        category: data.category,
        createdById: data.createdById,
        createdByRole: 'LANDLORD',
        status: 'OPEN',
      },
      include: {
        property: true,
        tenancy: true,
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Create timeline event
    await this.prisma.ticketTimeline.create({
      data: {
        ticketId: ticket.id,
        eventType: 'created',
        actorId: data.createdById,
        details: JSON.stringify({
          title: ticket.title,
          priority: ticket.priority,
          category: ticket.category,
          createdByRole: 'LANDLORD',
        }),
      },
    });

    // Emit SSE event
    this.eventsService.emit({
      type: 'ticket.created',
      actorRole: 'LANDLORD',
      landlordId: ticket.landlordId,
      tenantId: ticket.tenancy?.tenantOrgId,
      resources: [
        { type: 'ticket', id: ticket.id },
        { type: 'property', id: ticket.propertyId },
      ],
    });

    // Enqueue background job for notifications
    await this.jobsService.enqueueTicketCreated({
      ticketId: ticket.id,
      propertyId: ticket.propertyId || '',
      createdById: data.createdById,
      landlordId: ticket.landlordId,
    });

    return ticket;
  }

  /**
   * Propose an appointment for a ticket (contractor action)
   */
  async proposeAppointment(
    ticketId: string,
    contractorId: string,
    startAt: Date,
    endAt: Date | null,
    notes?: string,
  ) {
    // Verify ticket exists and contractor is assigned
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        tenancy: true,
      },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    if (ticket.assignedToId !== contractorId) {
      throw new ForbiddenException('Only assigned contractor can propose appointments');
    }

    // Verify ticket is in APPROVED status
    if (ticket.status !== 'APPROVED') {
      throw new ForbiddenException('Can only propose appointments for approved tickets');
    }

    // Check for existing proposed or confirmed appointments
    const existingAppointments = await this.prisma.appointment.findMany({
      where: {
        ticketId,
        status: { in: ['PROPOSED', 'CONFIRMED'] },
      },
    });

    if (existingAppointments.length > 0) {
      throw new ForbiddenException(
        'Cannot propose new appointment while pending or confirmed appointment exists. Cancel existing appointment first.',
      );
    }

    // Create appointment
    const appointment = await this.prisma.appointment.create({
      data: {
        ticketId,
        contractorId,
        startAt,
        endAt,
        status: 'PROPOSED',
        proposedBy: contractorId,
        notes,
      },
      include: {
        ticket: true,
        contractor: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Create timeline event
    await this.prisma.ticketTimeline.create({
      data: {
        ticketId,
        eventType: 'appointment_proposed',
        actorId: contractorId,
        details: JSON.stringify({
          appointmentId: appointment.id,
          startAt: appointment.startAt,
          endAt: appointment.endAt,
        }),
      },
    });

    // Emit SSE event
    this.eventsService.emit({
      type: 'appointment.proposed',
      actorRole: 'CONTRACTOR',
      landlordId: ticket.landlordId,
      tenantId: ticket.tenancy?.tenantOrgId,
      resources: [
        { type: 'ticket', id: ticketId },
        { type: 'appointment', id: appointment.id },
      ],
    });

    return appointment;
  }

  /**
   * Confirm an appointment (tenant or landlord action)
   */
  async confirmAppointment(
    appointmentId: string,
    confirmedBy: string,
    userRole: string,
  ) {
    // Verify appointment exists
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
      throw new NotFoundException('Appointment not found');
    }

    if (appointment.status !== 'PROPOSED') {
      throw new ForbiddenException('Can only confirm proposed appointments');
    }

    // Only tenant or landlord/ops can confirm
    if (!['TENANT', 'LANDLORD', 'OPS'].includes(userRole)) {
      throw new ForbiddenException('Only tenant or landlord can confirm appointments');
    }

    // Update appointment
    const confirmed = await this.prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        status: 'CONFIRMED',
        confirmedBy,
        confirmedAt: new Date(),
      },
      include: {
        ticket: {
          include: {
            tenancy: true,
          },
        },
      },
    });

    // Update ticket status to SCHEDULED and denormalize window
    await this.prisma.ticket.update({
      where: { id: appointment.ticketId },
      data: {
        status: 'SCHEDULED',
        scheduledWindowStart: appointment.startAt,
        scheduledWindowEnd: appointment.endAt,
      },
    });

    // Create timeline event
    await this.prisma.ticketTimeline.create({
      data: {
        ticketId: appointment.ticketId,
        eventType: 'appointment_confirmed',
        actorId: confirmedBy,
        details: JSON.stringify({
          appointmentId: appointment.id,
          startAt: appointment.startAt,
          endAt: appointment.endAt,
        }),
      },
    });

    // Emit SSE event
    this.eventsService.emit({
      type: 'appointment.confirmed',
      actorRole: userRole,
      landlordId: confirmed.ticket.landlordId,
      tenantId: confirmed.ticket.tenancy?.tenantOrgId,
      resources: [
        { type: 'ticket', id: appointment.ticketId },
        { type: 'appointment', id: appointment.id },
      ],
    });

    // Schedule auto-transition job
    await this.jobsService.enqueueAppointmentStart({
      appointmentId: appointment.id,
      ticketId: appointment.ticketId,
      startAt: appointment.startAt.toISOString(),
    });

    return confirmed;
  }

  /**
   * Find an appointment by ID
   */
  async findAppointment(appointmentId: string) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        ticket: {
          include: {
            property: true,
            tenancy: true,
          },
        },
        contractor: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    return appointment;
  }

  /**
   * Get appointments for a ticket
   */
  async getTicketAppointments(ticketId: string) {
    return this.prisma.appointment.findMany({
      where: { ticketId },
      include: {
        contractor: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
