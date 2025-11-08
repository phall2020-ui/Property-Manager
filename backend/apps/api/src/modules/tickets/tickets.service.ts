import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { EventsService } from '../events/events.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationRouterService } from '../notifications/notification-router.service';
import { JobsService } from '../jobs/jobs.service';

@Injectable()
export class TicketsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventsService: EventsService,
    private readonly notificationsService: NotificationsService,
    private readonly notificationRouter: NotificationRouterService,
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

    // Route notifications using notification router
    await this.notificationRouter.routeNotification({
      type: 'ticket.created',
      entityId: ticket.id,
      entityType: 'ticket',
      actorId: data.createdById,
      landlordId: ticket.landlordId,
      tenantId: ticket.tenancy?.tenantOrgId,
      metadata: {
        title: ticket.title,
        priority: ticket.priority,
        category: ticket.category,
      },
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
    filters?: { 
      q?: string;
      id?: string;
      dateFrom?: string;
      dateTo?: string;
      category?: string;
      contractorId?: string;
      status?: string;
      priority?: string;
      page?: number;
      pageSize?: number;
      sortBy?: string;
      sortDir?: 'asc' | 'desc';
    },
  ) {
    const where: any = {};

    // Role-based scoping
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

    // Filter by specific ticket ID
    if (filters?.id) {
      where.id = filters.id;
    }

    // Apply other filters
    if (filters?.status) {
      where.status = filters.status;
    }
    if (filters?.category) {
      where.category = filters.category;
    }
    if (filters?.priority) {
      where.priority = filters.priority;
    }
    if (filters?.contractorId) {
      where.assignedToId = filters.contractorId;
    }

    // Date range filtering
    if (filters?.dateFrom || filters?.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) {
        where.createdAt.gte = new Date(filters.dateFrom);
      }
      if (filters.dateTo) {
        // Include the entire end date (set to end of day)
        const endDate = new Date(filters.dateTo);
        endDate.setHours(23, 59, 59, 999);
        where.createdAt.lte = endDate;
      }
    }

    // Full-text search filter on title and description
    if (filters?.q) {
      where.OR = [
        { title: { contains: filters.q, mode: 'insensitive' } },
        { description: { contains: filters.q, mode: 'insensitive' } },
      ];
    }

    // Pagination defaults
    const page = filters?.page || 1;
    const pageSize = Math.min(filters?.pageSize || 25, 100); // Max 100 per page
    const skip = (page - 1) * pageSize;

    // Sorting
    const sortBy = filters?.sortBy || 'created_at';
    const sortDir = filters?.sortDir || 'desc';
    
    // Map sort field names to Prisma field names
    const sortFieldMap: Record<string, string> = {
      'created_at': 'createdAt',
      'updated_at': 'updatedAt',
      'status': 'status',
      'priority': 'priority',
      'category': 'category',
    };
    const prismaSort = sortFieldMap[sortBy] || 'createdAt';

    const [tickets, total] = await Promise.all([
      this.prisma.ticket.findMany({
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
          assignedTo: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          quotes: true,
        },
        orderBy: { [prismaSort]: sortDir },
        skip,
        take: pageSize,
      }),
      this.prisma.ticket.count({ where }),
    ]);

    return {
      items: tickets,
      page,
      page_size: pageSize,
      total,
      has_next: skip + pageSize < total,
    };
  }

  async createQuote(
    ticketId: string,
    contractorId: string,
    amount: number,
    notes?: string,
  ) {
    // Validate quote amount (min/max thresholds)
    const MIN_QUOTE_AMOUNT = 10; // $10 minimum
    const MAX_QUOTE_AMOUNT = 50000; // $50,000 maximum

    if (amount < MIN_QUOTE_AMOUNT) {
      throw new ForbiddenException(`Quote amount must be at least $${MIN_QUOTE_AMOUNT}`);
    }
    if (amount > MAX_QUOTE_AMOUNT) {
      throw new ForbiddenException(`Quote amount cannot exceed $${MAX_QUOTE_AMOUNT}`);
    }

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

  async approveQuote(quoteId: string, userId: string, userOrgIds: string[]) {
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
        actorId: userId,
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
      approvedBy: userId,
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
    userId: string,
  ) {
    // Verify access to the ticket
    const ticket = await this.findOne(ticketId, userOrgIds);

    if (!ticket) {
      throw new NotFoundException(`Ticket with ID ${ticketId} not found`);
    }

    // Validate file size (additional server-side check)
    const maxSizeBytes = 10 * 1024 * 1024; // 10MB
    if (size > maxSizeBytes) {
      throw new ForbiddenException(
        `File size ${(size / 1024 / 1024).toFixed(2)}MB exceeds maximum allowed size of 10MB`
      );
    }

    try {
      const attachment = await this.prisma.ticketAttachment.create({
        data: {
          ticketId,
          filename,
          filepath,
          mimetype,
          size,
        },
      });

      // Create timeline event for attachment upload
      await this.prisma.ticketTimeline.create({
        data: {
          ticketId,
          eventType: 'attachment_added',
          actorId: userId, // Use the actual user who uploaded the file
          details: JSON.stringify({
            filename,
            size,
            mimetype,
          }),
        },
      });

      return attachment;
    } catch (error) {
      // Distinguish between different error types
      if (error.code === 'P2002') {
        throw new ForbiddenException('Attachment with this filename already exists');
      }
      if (error.code === 'P2003') {
        throw new NotFoundException('Ticket not found');
      }
      throw new BadRequestException(`Failed to upload attachment: ${error.message}`);
    }
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
    userRole?: string,
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

    // Role-based status transition restrictions
    const roleTransitionRules: Record<string, Record<string, string[]>> = {
      TENANT: {
        OPEN: ['CANCELLED'], // Tenants can only cancel their own open tickets
      },
      LANDLORD: {
        OPEN: ['TRIAGED', 'CANCELLED'],
        TRIAGED: ['CANCELLED'],
        QUOTED: ['APPROVED', 'CANCELLED'],
        APPROVED: ['CANCELLED'],
        SCHEDULED: ['CANCELLED'],
        COMPLETED: ['AUDITED'],
      },
      OPS: {
        // OPS can perform all transitions
        OPEN: ['TRIAGED', 'CANCELLED'],
        TRIAGED: ['QUOTED', 'CANCELLED'],
        QUOTED: ['APPROVED', 'CANCELLED'],
        APPROVED: ['SCHEDULED', 'IN_PROGRESS', 'CANCELLED'],
        SCHEDULED: ['IN_PROGRESS', 'CANCELLED'],
        IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
        COMPLETED: ['AUDITED'],
      },
      CONTRACTOR: {
        TRIAGED: ['QUOTED'], // Contractors can submit quotes
        APPROVED: ['SCHEDULED', 'IN_PROGRESS'],
        SCHEDULED: ['IN_PROGRESS'],
        IN_PROGRESS: ['COMPLETED'],
      },
    };

    if (userRole && roleTransitionRules[userRole]) {
      const allowedForRole = roleTransitionRules[userRole][ticket.status] || [];
      if (!allowedForRole.includes(newStatus)) {
        throw new ForbiddenException(
          `Role ${userRole} cannot transition ticket from ${ticket.status} to ${newStatus}`,
        );
      }
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
      actorRole: userRole || 'LANDLORD',
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
    _idempotencyKey?: string,
  ) {
    // Verify access
    const _ticket = await this.findOne(ticketId, userOrgIds);

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
    return this.approveQuote(quote.id, userId, userOrgIds);
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

  /**
   * Bulk update ticket status (OPS role only)
   */
  async bulkUpdateStatus(
    ticketIds: string[],
    newStatus: string,
    actorId: string,
    userRole: string,
  ) {
    if (userRole !== 'OPS') {
      throw new ForbiddenException('Only OPS role can perform bulk operations');
    }

    if (ticketIds.length === 0) {
      throw new ForbiddenException('No ticket IDs provided');
    }

    if (ticketIds.length > 50) {
      throw new ForbiddenException('Cannot update more than 50 tickets at once');
    }

    const results = [];
    const errors = [];

    for (const ticketId of ticketIds) {
      try {
        // Get ticket to check current status
        const ticket = await this.prisma.ticket.findUnique({
          where: { id: ticketId },
          include: { tenancy: true },
        });

        if (!ticket) {
          errors.push({ ticketId, error: 'Ticket not found' });
          continue;
        }

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
          errors.push({
            ticketId,
            error: `Invalid transition from ${ticket.status} to ${newStatus}`,
          });
          continue;
        }

        // Update ticket (we don't need the result, just the mutation)
        await this.prisma.ticket.update({
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
              bulkOperation: true,
            }),
          },
        });

        // Emit SSE event
        this.eventsService.emit({
          type: 'ticket.status_changed',
          actorRole: userRole,
          landlordId: ticket.landlordId,
          tenantId: ticket.tenancy?.tenantOrgId,
          resources: [{ type: 'ticket', id: ticketId }],
          payload: { status: newStatus },
        });

        results.push({ ticketId, status: 'success' });
      } catch (error) {
        errors.push({ ticketId, error: error.message });
      }
    }

    return {
      success: results.length,
      failed: errors.length,
      results,
      errors,
    };
  }

  /**
   * Bulk assign tickets to contractor (OPS role only)
   */
  async bulkAssign(
    ticketIds: string[],
    contractorId: string,
    actorId: string,
    userRole: string,
  ) {
    if (userRole !== 'OPS') {
      throw new ForbiddenException('Only OPS role can perform bulk operations');
    }

    if (ticketIds.length === 0) {
      throw new ForbiddenException('No ticket IDs provided');
    }

    if (ticketIds.length > 50) {
      throw new ForbiddenException('Cannot assign more than 50 tickets at once');
    }

    // Verify contractor exists
    const contractor = await this.prisma.user.findUnique({
      where: { id: contractorId },
    });

    if (!contractor) {
      throw new NotFoundException('Contractor not found');
    }

    const results = [];
    const errors = [];

    for (const ticketId of ticketIds) {
      try {
        const ticket = await this.prisma.ticket.findUnique({
          where: { id: ticketId },
          include: { tenancy: true },
        });

        if (!ticket) {
          errors.push({ ticketId, error: 'Ticket not found' });
          continue;
        }

        // Update ticket
        await this.prisma.ticket.update({
          where: { id: ticketId },
          data: { assignedToId: contractorId },
        });

        // Create timeline event
        await this.prisma.ticketTimeline.create({
          data: {
            ticketId,
            eventType: 'assigned',
            actorId,
            details: JSON.stringify({
              contractorId,
              bulkOperation: true,
            }),
          },
        });

        // Emit SSE event
        this.eventsService.emit({
          type: 'ticket.assigned',
          actorRole: userRole,
          landlordId: ticket.landlordId,
          tenantId: ticket.tenancy?.tenantOrgId,
          resources: [{ type: 'ticket', id: ticketId }],
          payload: { contractorId },
        });

        results.push({ ticketId, status: 'success' });
      } catch (error) {
        errors.push({ ticketId, error: error.message });
      }
    }

    return {
      success: results.length,
      failed: errors.length,
      results,
      errors,
    };
  }

  /**
   * Assign a single ticket to a contractor (LANDLORD or OPS role)
   */
  async assignTicket(
    ticketId: string,
    contractorId: string,
    actorId: string,
    userOrgIds: string[],
    userRole: string,
  ) {
    // Verify ticket exists
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      include: { 
        property: true,
        tenancy: true,
      },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    // Check permissions: OPS can assign any ticket, LANDLORD only their properties
    if (userRole !== 'OPS') {
      const hasAccess = userOrgIds.includes(ticket.landlordId) ||
        (ticket.property && userOrgIds.includes(ticket.property.ownerOrgId));
      
      if (!hasAccess) {
        throw new ForbiddenException('You can only assign tickets for your properties');
      }
    }

    // Verify contractor exists
    const contractor = await this.prisma.user.findUnique({
      where: { id: contractorId },
      include: {
        orgMemberships: true,
      },
    });

    if (!contractor) {
      throw new NotFoundException('Contractor not found');
    }

    // Verify contractor has CONTRACTOR role
    const isContractor = contractor.orgMemberships.some(
      (m) => m.role === 'CONTRACTOR'
    );

    if (!isContractor) {
      throw new ForbiddenException('User must have CONTRACTOR role');
    }

    // Update ticket
    const updated = await this.prisma.ticket.update({
      where: { id: ticketId },
      data: { assignedToId: contractorId },
      include: {
        property: true,
        tenancy: true,
        assignedTo: {
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
        eventType: 'assigned',
        actorId,
        details: JSON.stringify({
          contractorId,
          contractorName: contractor.name,
        }),
      },
    });

    // Emit SSE event
    this.eventsService.emit({
      type: 'ticket.assigned',
      actorRole: userRole,
      landlordId: ticket.landlordId,
      tenantId: ticket.tenancy?.tenantOrgId,
      resources: [{ type: 'ticket', id: ticketId }],
      payload: { contractorId, contractorName: contractor.name },
    });

    return updated;
  }

  /**
   * Bulk close tickets (OPS role only)
   */
  async bulkClose(
    ticketIds: string[],
    actorId: string,
    userRole: string,
    resolutionNote?: string,
    idempotencyKey?: string,
  ) {
    if (userRole !== 'OPS') {
      throw new ForbiddenException('Only OPS role can perform bulk operations');
    }

    if (ticketIds.length === 0) {
      throw new BadRequestException('No ticket IDs provided');
    }

    if (ticketIds.length > 50) {
      throw new BadRequestException('Cannot close more than 50 tickets at once');
    }

    const ok: string[] = [];
    const failed: Array<{ id: string; error: string }> = [];

    for (const ticketId of ticketIds) {
      try {
        const ticket = await this.prisma.ticket.findUnique({
          where: { id: ticketId },
          include: { tenancy: true },
        });

        if (!ticket) {
          failed.push({ id: ticketId, error: 'Ticket not found' });
          continue;
        }

        if (ticket.status === 'COMPLETED' || ticket.status === 'CANCELLED') {
          failed.push({ id: ticketId, error: 'Already closed' });
          continue;
        }

        // Update ticket to COMPLETED status
        await this.prisma.ticket.update({
          where: { id: ticketId },
          data: { status: 'COMPLETED' },
        });

        // Create timeline event
        await this.prisma.ticketTimeline.create({
          data: {
            ticketId,
            eventType: 'completed',
            actorId,
            details: JSON.stringify({
              bulkOperation: true,
              resolutionNote: resolutionNote || 'Bulk closure',
              idempotencyKey,
            }),
          },
        });

        // Emit SSE event
        this.eventsService.emit({
          type: 'ticket.completed',
          actorRole: userRole,
          landlordId: ticket.landlordId,
          tenantId: ticket.tenancy?.tenantOrgId,
          resources: [{ type: 'ticket', id: ticketId }],
        });

        ok.push(ticketId);
      } catch (error) {
        failed.push({ id: ticketId, error: error.message });
      }
    }

    return { ok, failed };
  }

  /**
   * Bulk reassign tickets (OPS role only)
   */
  async bulkReassign(
    ticketIds: string[],
    contractorId: string,
    actorId: string,
    userRole: string,
    idempotencyKey?: string,
  ) {
    if (userRole !== 'OPS') {
      throw new ForbiddenException('Only OPS role can perform bulk operations');
    }

    if (ticketIds.length === 0) {
      throw new BadRequestException('No ticket IDs provided');
    }

    if (ticketIds.length > 50) {
      throw new BadRequestException('Cannot reassign more than 50 tickets at once');
    }

    // Verify contractor exists
    const contractor = await this.prisma.user.findUnique({
      where: { id: contractorId },
    });

    if (!contractor) {
      throw new NotFoundException('Contractor not found');
    }

    const ok: string[] = [];
    const failed: Array<{ id: string; error: string }> = [];

    for (const ticketId of ticketIds) {
      try {
        const ticket = await this.prisma.ticket.findUnique({
          where: { id: ticketId },
          include: { tenancy: true },
        });

        if (!ticket) {
          failed.push({ id: ticketId, error: 'Ticket not found' });
          continue;
        }

        if (ticket.status === 'COMPLETED' || ticket.status === 'CANCELLED') {
          failed.push({ id: ticketId, error: 'Cannot reassign closed ticket' });
          continue;
        }

        // Update ticket
        await this.prisma.ticket.update({
          where: { id: ticketId },
          data: { assignedToId: contractorId },
        });

        // Create timeline event
        await this.prisma.ticketTimeline.create({
          data: {
            ticketId,
            eventType: 'assigned',
            actorId,
            details: JSON.stringify({
              contractorId,
              contractorName: contractor.name,
              bulkOperation: true,
              idempotencyKey,
            }),
          },
        });

        // Emit SSE event
        this.eventsService.emit({
          type: 'ticket.assigned',
          actorRole: userRole,
          landlordId: ticket.landlordId,
          tenantId: ticket.tenancy?.tenantOrgId,
          resources: [{ type: 'ticket', id: ticketId }],
          payload: { contractorId, contractorName: contractor.name },
        });

        ok.push(ticketId);
      } catch (error) {
        failed.push({ id: ticketId, error: error.message });
      }
    }

    return { ok, failed };
  }

  /**
   * Bulk add/remove tags (OPS role only)
   */
  async bulkTag(
    ticketIds: string[],
    actorId: string,
    userRole: string,
    tagsToAdd?: string[],
    tagsToRemove?: string[],
    idempotencyKey?: string,
  ) {
    if (userRole !== 'OPS') {
      throw new ForbiddenException('Only OPS role can perform bulk operations');
    }

    if (ticketIds.length === 0) {
      throw new BadRequestException('No ticket IDs provided');
    }

    if (ticketIds.length > 50) {
      throw new BadRequestException('Cannot tag more than 50 tickets at once');
    }

    if (!tagsToAdd && !tagsToRemove) {
      throw new BadRequestException('Must specify tags to add or remove');
    }

    const ok: string[] = [];
    const failed: Array<{ id: string; error: string }> = [];

    for (const ticketId of ticketIds) {
      try {
        const ticket = await this.prisma.ticket.findUnique({
          where: { id: ticketId },
          include: { tenancy: true },
        });

        if (!ticket) {
          failed.push({ id: ticketId, error: 'Ticket not found' });
          continue;
        }

        // Parse existing tags
        let currentTags: string[] = [];
        if (ticket.tags) {
          try {
            currentTags = JSON.parse(ticket.tags);
          } catch (e) {
            currentTags = [];
          }
        }

        // Add new tags
        if (tagsToAdd) {
          currentTags = [...new Set([...currentTags, ...tagsToAdd])];
        }

        // Remove tags
        if (tagsToRemove) {
          currentTags = currentTags.filter(tag => !tagsToRemove.includes(tag));
        }

        // Update ticket
        await this.prisma.ticket.update({
          where: { id: ticketId },
          data: { tags: JSON.stringify(currentTags) },
        });

        // Create timeline event
        await this.prisma.ticketTimeline.create({
          data: {
            ticketId,
            eventType: 'tags_updated',
            actorId,
            details: JSON.stringify({
              added: tagsToAdd,
              removed: tagsToRemove,
              bulkOperation: true,
              idempotencyKey,
            }),
          },
        });

        ok.push(ticketId);
      } catch (error) {
        failed.push({ id: ticketId, error: error.message });
      }
    }

    return { ok, failed };
  }

  /**
   * Bulk update category (OPS role only)
   */
  async bulkCategory(
    ticketIds: string[],
    category: string,
    actorId: string,
    userRole: string,
    idempotencyKey?: string,
  ) {
    if (userRole !== 'OPS') {
      throw new ForbiddenException('Only OPS role can perform bulk operations');
    }

    if (ticketIds.length === 0) {
      throw new BadRequestException('No ticket IDs provided');
    }

    if (ticketIds.length > 50) {
      throw new BadRequestException('Cannot update more than 50 tickets at once');
    }

    const ok: string[] = [];
    const failed: Array<{ id: string; error: string }> = [];

    for (const ticketId of ticketIds) {
      try {
        const ticket = await this.prisma.ticket.findUnique({
          where: { id: ticketId },
          include: { tenancy: true },
        });

        if (!ticket) {
          failed.push({ id: ticketId, error: 'Ticket not found' });
          continue;
        }

        // Update ticket category
        await this.prisma.ticket.update({
          where: { id: ticketId },
          data: { category },
        });

        // Create timeline event
        await this.prisma.ticketTimeline.create({
          data: {
            ticketId,
            eventType: 'category_updated',
            actorId,
            details: JSON.stringify({
              oldCategory: ticket.category,
              newCategory: category,
              bulkOperation: true,
              idempotencyKey,
            }),
          },
        });

        // Emit SSE event
        this.eventsService.emit({
          type: 'ticket.category_updated',
          actorRole: userRole,
          landlordId: ticket.landlordId,
          tenantId: ticket.tenancy?.tenantOrgId,
          resources: [{ type: 'ticket', id: ticketId }],
          payload: { category },
        });

        ok.push(ticketId);
      } catch (error) {
        failed.push({ id: ticketId, error: error.message });
      }
    }

    return { ok, failed };
  }
}
