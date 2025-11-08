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

    // Check for category routing rule and auto-assign
    if (ticket.category) {
      const routingRule = await this.prisma.categoryRoutingRule.findUnique({
        where: {
          landlordId_category: {
            landlordId: ticket.landlordId,
            category: ticket.category,
          },
        },
      });

      if (routingRule && routingRule.contractorId) {
        // Auto-assign to contractor
        await this.prisma.ticket.update({
          where: { id: ticket.id },
          data: {
            assignedToId: routingRule.contractorId,
            priority: routingRule.priority,
          },
        });

        // Create timeline event
        await this.prisma.ticketTimeline.create({
          data: {
            ticketId: ticket.id,
            eventType: 'assigned',
            actorId: 'SYSTEM',
            details: JSON.stringify({
              contractorId: routingRule.contractorId,
              autoAssigned: true,
              category: ticket.category,
            }),
          },
        });
      }
    }

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

    // Enhanced search - includes title, description, ticket ID, contractor name, property address, and tags
    if (filters?.q) {
      const searchTerm = filters.q.trim();
      
      // Check if it's a UUID (ticket ID)
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(searchTerm);
      
      if (isUUID) {
        // Direct ID search
        where.id = searchTerm;
      } else {
        // Multi-field search
        where.OR = [
          { title: { contains: searchTerm, mode: 'insensitive' } },
          { description: { contains: searchTerm, mode: 'insensitive' } },
          { id: { contains: searchTerm, mode: 'insensitive' } },
          { tags: { contains: searchTerm, mode: 'insensitive' } },
          // Search in related data
          {
            assignedTo: {
              name: { contains: searchTerm, mode: 'insensitive' },
            },
          },
          {
            property: {
              OR: [
                { addressLine1: { contains: searchTerm, mode: 'insensitive' } },
                { addressLine2: { contains: searchTerm, mode: 'insensitive' } },
                { postcode: { contains: searchTerm, mode: 'insensitive' } },
              ],
            },
          },
        ];
      }
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

    // Update SLA fields
    await this.updateSLAFields(ticketId, newStatus);

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

    // Schedule reminder jobs (24h and 2h before)
    const appointmentTime = appointment.startAt.getTime();
    const now = Date.now();
    const hours24Before = appointmentTime - (24 * 60 * 60 * 1000);
    const hours2Before = appointmentTime - (2 * 60 * 60 * 1000);

    if (hours24Before > now) {
      await this.jobsService.enqueueAppointmentReminder({
        appointmentId: appointment.id,
        reminderType: '24h',
      }, { delay: hours24Before - now });
    }

    if (hours2Before > now) {
      await this.jobsService.enqueueAppointmentReminder({
        appointmentId: appointment.id,
        reminderType: '2h',
      }, { delay: hours2Before - now });
    }

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

  /**
   * Reject a quote (Critical Priority #1)
   */
  async rejectQuote(
    quoteId: string,
    userId: string,
    userOrgIds: string[],
    reason?: string,
  ) {
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
      throw new ForbiddenException('Only property owner can reject quotes');
    }

    // Update quote
    await this.prisma.quote.update({
      where: { id: quoteId },
      data: {
        status: 'REJECTED',
        rejectedAt: new Date(),
        rejectionReason: reason,
      },
    });

    // Update ticket status to TRIAGED to allow new quote submission
    await this.prisma.ticket.update({
      where: { id: quote.ticketId },
      data: { status: 'TRIAGED' },
    });

    // Create timeline event
    await this.prisma.ticketTimeline.create({
      data: {
        ticketId: quote.ticketId,
        eventType: 'quote_rejected',
        actorId: userId,
        details: JSON.stringify({
          quoteId,
          reason,
        }),
      },
    });

    // Emit SSE event
    this.eventsService.emit({
      type: 'ticket.quote_rejected',
      actorRole: 'LANDLORD',
      landlordId: quote.ticket.landlordId,
      tenantId: quote.ticket.tenancy?.tenantOrgId,
      resources: [
        { type: 'ticket', id: quote.ticketId },
        { type: 'quote', id: quoteId },
      ],
      payload: { reason },
    });

    return { message: 'Quote rejected successfully' };
  }

  /**
   * Cancel an appointment (Critical Priority #2)
   */
  async cancelAppointment(
    appointmentId: string,
    cancelledBy: string,
    userRole: string,
    cancellationNote?: string,
  ) {
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

    if (!['TENANT', 'LANDLORD', 'OPS', 'CONTRACTOR'].includes(userRole)) {
      throw new ForbiddenException('Cannot cancel appointment');
    }

    if (appointment.status === 'CANCELLED') {
      throw new BadRequestException('Appointment already cancelled');
    }

    if (appointment.status === 'COMPLETED') {
      throw new BadRequestException('Cannot cancel completed appointment');
    }

    await this.prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        status: 'CANCELLED',
        cancelledBy,
        cancelledAt: new Date(),
        cancellationNote,
      },
    });

    // If ticket is SCHEDULED, revert to APPROVED
    if (appointment.ticket.status === 'SCHEDULED') {
      await this.prisma.ticket.update({
        where: { id: appointment.ticketId },
        data: {
          status: 'APPROVED',
          scheduledWindowStart: null,
          scheduledWindowEnd: null,
        },
      });
    }

    // Create timeline event
    await this.prisma.ticketTimeline.create({
      data: {
        ticketId: appointment.ticketId,
        eventType: 'appointment_cancelled',
        actorId: cancelledBy,
        details: JSON.stringify({
          appointmentId: appointment.id,
          cancellationNote,
        }),
      },
    });

    // Emit SSE event
    this.eventsService.emit({
      type: 'appointment.cancelled',
      actorRole: userRole,
      landlordId: appointment.ticket.landlordId,
      tenantId: appointment.ticket.tenancy?.tenantOrgId,
      resources: [
        { type: 'ticket', id: appointment.ticketId },
        { type: 'appointment', id: appointmentId },
      ],
    });

    return { message: 'Appointment cancelled successfully' };
  }

  /**
   * Compare quotes for a ticket (Critical Priority #4)
   */
  async compareQuotes(ticketId: string, userOrgIds: string[]) {
    const ticket = await this.findOne(ticketId, userOrgIds);

    const quotes = await this.prisma.quote.findMany({
      where: {
        ticketId,
        status: { in: ['PROPOSED', 'APPROVED'] },
      },
      include: {
        contractor: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { amount: 'asc' },
    });

    const total = quotes.reduce((sum, q) => sum + q.amount, 0);
    const average = quotes.length > 0 ? total / quotes.length : 0;

    return {
      ticketId,
      quotes: quotes.map((q) => ({
        id: q.id,
        contractor: q.contractor.name,
        contractorId: q.contractorId,
        amount: q.amount,
        notes: q.notes,
        createdAt: q.createdAt,
        status: q.status,
      })),
      cheapest: quotes[0]?.id || null,
      mostExpensive: quotes[quotes.length - 1]?.id || null,
      average,
      count: quotes.length,
      total,
    };
  }

  /**
   * Check contractor availability (High Priority #6)
   */
  async checkContractorAvailability(
    contractorId: string,
    proposedStart: Date,
    proposedEnd: Date,
  ) {
    const conflicts = await this.prisma.appointment.findMany({
      where: {
        contractorId,
        status: { in: ['PROPOSED', 'CONFIRMED'] },
        OR: [
          {
            startAt: { lte: proposedEnd },
            endAt: { gte: proposedStart },
          },
          {
            startAt: { gte: proposedStart, lte: proposedEnd },
          },
        ],
      },
      include: {
        ticket: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    return {
      available: conflicts.length === 0,
      conflicts: conflicts.map((c) => ({
        appointmentId: c.id,
        ticketId: c.ticketId,
        ticketTitle: c.ticket.title,
        startAt: c.startAt,
        endAt: c.endAt,
        status: c.status,
      })),
    };
  }

  /**
   * Reopen a ticket (High Priority #10)
   */
  async reopenTicket(
    ticketId: string,
    userId: string,
    userOrgIds: string[],
    reason: string,
  ) {
    const ticket = await this.findOne(ticketId, userOrgIds);

    if (!['COMPLETED', 'CANCELLED', 'AUDITED'].includes(ticket.status)) {
      throw new ForbiddenException(
        `Cannot reopen ticket in ${ticket.status} status`,
      );
    }

    // Update ticket
    const updated = await this.prisma.ticket.update({
      where: { id: ticketId },
      data: {
        status: 'TRIAGED',
        reopenedAt: new Date(),
        reopenedBy: userId,
        reopenedReason: reason,
      },
    });

    // Create timeline event
    await this.prisma.ticketTimeline.create({
      data: {
        ticketId,
        eventType: 'reopened',
        actorId: userId,
        details: JSON.stringify({
          reason,
          previousStatus: ticket.status,
        }),
      },
    });

    // Emit SSE event
    this.eventsService.emit({
      type: 'ticket.reopened',
      actorRole: 'OPS',
      landlordId: ticket.landlordId,
      tenantId: ticket.tenancy?.tenantOrgId,
      resources: [{ type: 'ticket', id: ticketId }],
      payload: { reason },
    });

    return updated;
  }

  /**
   * Bulk approve quotes (High Priority #9)
   */
  async bulkApproveQuotes(
    quoteIds: string[],
    userId: string,
    userOrgIds: string[],
  ) {
    if (quoteIds.length === 0) {
      throw new BadRequestException('No quote IDs provided');
    }

    if (quoteIds.length > 50) {
      throw new BadRequestException('Cannot approve more than 50 quotes at once');
    }

    const results = [];
    const errors = [];

    for (const quoteId of quoteIds) {
      try {
        await this.approveQuote(quoteId, userId, userOrgIds);
        results.push({ quoteId, status: 'success' });
      } catch (error) {
        errors.push({ quoteId, error: error.message });
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
   * Create ticket from template (High Priority #7)
   */
  async createFromTemplate(
    templateId: string,
    landlordId: string,
    propertyId: string,
    tenancyId: string | undefined,
    createdById: string,
    userOrgIds: string[],
  ) {
    const template = await this.prisma.ticketTemplate.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    if (template.landlordId !== landlordId) {
      throw new ForbiddenException('Template does not belong to this landlord');
    }

    // Verify property ownership
    const property = await this.findProperty(propertyId);
    if (property.ownerOrgId !== landlordId) {
      throw new ForbiddenException('Property does not belong to this landlord');
    }

    const ticket = await this.prisma.ticket.create({
      data: {
        landlordId,
        propertyId,
        tenancyId,
        title: template.title,
        description: template.description,
        category: template.category,
        priority: template.priority,
        tags: template.tags,
        createdById,
        createdByRole: 'LANDLORD',
        status: 'OPEN',
        templateId: template.id,
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
        actorId: createdById,
        details: JSON.stringify({
          title: ticket.title,
          priority: ticket.priority,
          category: ticket.category,
          fromTemplate: true,
          templateId: template.id,
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

    return ticket;
  }

  /**
   * Create ticket template (High Priority #7)
   */
  async createTemplate(
    landlordId: string,
    title: string,
    description: string,
    category?: string,
    priority: string = 'STANDARD',
    tags?: string[],
  ) {
    const template = await this.prisma.ticketTemplate.create({
      data: {
        landlordId,
        title,
        description,
        category,
        priority,
        tags: tags ? JSON.stringify(tags) : null,
      },
    });

    return template;
  }

  /**
   * Get templates for a landlord
   */
  async getTemplates(landlordId: string) {
    return this.prisma.ticketTemplate.findMany({
      where: { landlordId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Add comment to ticket (Medium Priority #14)
   */
  async addComment(
    ticketId: string,
    userId: string,
    userOrgIds: string[],
    content: string,
    parentId?: string,
  ) {
    // Verify access
    await this.findOne(ticketId, userOrgIds);

    // If parentId provided, verify it exists and belongs to same ticket
    if (parentId) {
      const parent = await this.prisma.ticketComment.findUnique({
        where: { id: parentId },
      });

      if (!parent || parent.ticketId !== ticketId) {
        throw new NotFoundException('Parent comment not found');
      }
    }

    const comment = await this.prisma.ticketComment.create({
      data: {
        ticketId,
        userId,
        content,
        parentId,
      },
      include: {
        user: {
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
        eventType: 'comment_added',
        actorId: userId,
        details: JSON.stringify({
          commentId: comment.id,
          parentId: comment.parentId,
        }),
      },
    });

    // Emit SSE event
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      include: { tenancy: true },
    });

    this.eventsService.emit({
      type: 'ticket.comment_added',
      actorRole: 'TENANT',
      landlordId: ticket.landlordId,
      tenantId: ticket.tenancy?.tenantOrgId,
      resources: [{ type: 'ticket', id: ticketId }],
      payload: { commentId: comment.id },
    });

    return comment;
  }

  /**
   * Get comments for a ticket
   */
  async getComments(ticketId: string, userOrgIds: string[]) {
    // Verify access
    await this.findOne(ticketId, userOrgIds);

    return this.prisma.ticketComment.findMany({
      where: { ticketId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        replies: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Get contractor performance metrics (Medium Priority #12)
   */
  async getContractorMetrics(contractorId: string, periodDays: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periodDays);

    const tickets = await this.prisma.ticket.findMany({
      where: {
        assignedToId: contractorId,
        createdAt: { gte: startDate },
      },
      include: {
        quotes: {
          where: { contractorId },
        },
      },
    });

    const completedTickets = tickets.filter(
      (t) => t.status === 'COMPLETED' || t.status === 'AUDITED',
    );

    const quotes = tickets.flatMap((t) => t.quotes);
    const approvedQuotes = quotes.filter((q) => q.status === 'APPROVED');
    const rejectedQuotes = quotes.filter((q) => q.status === 'REJECTED');

    // Calculate average quote time (time from assignment to quote submission)
    const quoteTimes = approvedQuotes
      .map((q) => {
        const ticket = tickets.find((t) => t.id === q.ticketId);
        if (!ticket) return null;
        const assignmentTime = ticket.updatedAt;
        const quoteTime = q.createdAt;
        return quoteTime.getTime() - assignmentTime.getTime();
      })
      .filter((t) => t !== null) as number[];

    const avgQuoteTime =
      quoteTimes.length > 0
        ? quoteTimes.reduce((a, b) => a + b, 0) / quoteTimes.length
        : 0;

    // Calculate average completion time
    const completionTimes = completedTickets
      .map((t) => {
        if (!t.inProgressAt) return null;
        return (
          (t.actualResolutionTime || t.updatedAt).getTime() -
          t.inProgressAt.getTime()
        );
      })
      .filter((t) => t !== null) as number[];

    const avgCompletionTime =
      completionTimes.length > 0
        ? completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length
        : 0;

    return {
      contractorId,
      periodDays,
      totalTickets: tickets.length,
      completedTickets: completedTickets.length,
      completionRate:
        tickets.length > 0
          ? (completedTickets.length / tickets.length) * 100
          : 0,
      totalQuotes: quotes.length,
      approvedQuotes: approvedQuotes.length,
      rejectedQuotes: rejectedQuotes.length,
      acceptanceRate:
        quotes.length > 0
          ? (approvedQuotes.length / quotes.length) * 100
          : 0,
      averageQuoteTimeHours: avgQuoteTime / (1000 * 60 * 60),
      averageCompletionTimeHours: avgCompletionTime / (1000 * 60 * 60),
    };
  }

  /**
   * Create or update category routing rule (Medium Priority #13)
   */
  async upsertCategoryRoutingRule(
    landlordId: string,
    category: string,
    contractorId: string | null,
    priority: string = 'STANDARD',
  ) {
    return this.prisma.categoryRoutingRule.upsert({
      where: {
        landlordId_category: {
          landlordId,
          category,
        },
      },
      update: {
        contractorId,
        priority,
      },
      create: {
        landlordId,
        category,
        contractorId,
        priority,
      },
    });
  }

  /**
   * Get category routing rules for a landlord
   */
  async getCategoryRoutingRules(landlordId: string) {
    return this.prisma.categoryRoutingRule.findMany({
      where: { landlordId },
      include: {
        contractor: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  /**
   * Update quote with actual cost (Medium Priority #16)
   */
  async updateQuoteActualCost(
    quoteId: string,
    contractorId: string,
    actualAmount: number,
  ) {
    const quote = await this.prisma.quote.findUnique({
      where: { id: quoteId },
    });

    if (!quote) {
      throw new NotFoundException('Quote not found');
    }

    if (quote.contractorId !== contractorId) {
      throw new ForbiddenException('Only quote creator can update actual cost');
    }

    const variance = actualAmount - quote.amount;

    const updated = await this.prisma.quote.update({
      where: { id: quoteId },
      data: {
        actualAmount,
        variance,
        estimatedAmount: quote.amount, // Store original as estimate
      },
    });

    // Create timeline event
    await this.prisma.ticketTimeline.create({
      data: {
        ticketId: quote.ticketId,
        eventType: 'quote_cost_updated',
        actorId: contractorId,
        details: JSON.stringify({
          quoteId,
          estimatedAmount: quote.amount,
          actualAmount,
          variance,
        }),
      },
    });

    return updated;
  }

  /**
   * Calculate and update SLA fields when status changes
   */
  async updateSLAFields(ticketId: string, newStatus: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) return;

    const updates: any = {};

    // Set target times if not set (based on priority)
    if (!ticket.targetResponseTime) {
      const responseHours = {
        URGENT: 2,
        HIGH: 4,
        STANDARD: 24,
        LOW: 48,
      };
      const hours = responseHours[ticket.priority as keyof typeof responseHours] || 24;
      updates.targetResponseTime = new Date(
        ticket.createdAt.getTime() + hours * 60 * 60 * 1000,
      );
    }

    if (!ticket.targetResolutionTime) {
      const resolutionHours = {
        URGENT: 24,
        HIGH: 72,
        STANDARD: 168, // 7 days
        LOW: 336, // 14 days
      };
      const hours =
        resolutionHours[ticket.priority as keyof typeof resolutionHours] || 168;
      updates.targetResolutionTime = new Date(
        ticket.createdAt.getTime() + hours * 60 * 60 * 1000,
      );
    }

    // Update actual times
    if (newStatus === 'TRIAGED' && !ticket.actualResponseTime) {
      updates.actualResponseTime = new Date();
    }

    if (newStatus === 'COMPLETED' && !ticket.actualResolutionTime) {
      updates.actualResolutionTime = new Date();
    }

    // Check SLA breaches
    if (ticket.targetResponseTime && updates.actualResponseTime) {
      if (updates.actualResponseTime > ticket.targetResponseTime) {
        updates.slaBreached = true;
      }
    }

    if (ticket.targetResolutionTime && updates.actualResolutionTime) {
      if (updates.actualResolutionTime > ticket.targetResolutionTime) {
        updates.slaBreached = true;
      }
    }

    if (Object.keys(updates).length > 0) {
      await this.prisma.ticket.update({
        where: { id: ticketId },
        data: updates,
      });
    }
  }

  /**
   * Export tickets to CSV format (Medium Priority #18)
   */
  async exportTickets(
    userOrgIds: string[],
    role: string,
    filters?: {
      status?: string;
      category?: string;
      dateFrom?: string;
      dateTo?: string;
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
    }

    if (filters?.status) {
      where.status = filters.status;
    }
    if (filters?.category) {
      where.category = filters.category;
    }

    if (filters?.dateFrom || filters?.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) {
        where.createdAt.gte = new Date(filters.dateFrom);
      }
      if (filters.dateTo) {
        const endDate = new Date(filters.dateTo);
        endDate.setHours(23, 59, 59, 999);
        where.createdAt.lte = endDate;
      }
    }

    const tickets = await this.prisma.ticket.findMany({
      where,
      include: {
        property: {
          select: {
            addressLine1: true,
            postcode: true,
          },
        },
        assignedTo: {
          select: {
            name: true,
            email: true,
          },
        },
        createdBy: {
          select: {
            name: true,
            email: true,
          },
        },
        quotes: {
          where: {
            status: 'APPROVED',
          },
          select: {
            amount: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Generate CSV
    const headers = [
      'Ticket ID',
      'Title',
      'Status',
      'Priority',
      'Category',
      'Property Address',
      'Assigned To',
      'Created By',
      'Created At',
      'Completed At',
      'Total Cost',
      'SLA Breached',
    ];

    const rows = tickets.map((ticket) => {
      const totalCost = ticket.quotes.reduce((sum, q) => sum + q.amount, 0);
      return [
        ticket.id,
        ticket.title,
        ticket.status,
        ticket.priority,
        ticket.category || '',
        ticket.property
          ? `${ticket.property.addressLine1}, ${ticket.property.postcode}`
          : '',
        ticket.assignedTo?.name || '',
        ticket.createdBy?.name || '',
        ticket.createdAt.toISOString(),
        ticket.actualResolutionTime?.toISOString() || '',
        totalCost.toString(),
        ticket.slaBreached ? 'Yes' : 'No',
      ];
    });

    const csv = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
    ].join('\n');

    return csv;
  }

  /**
   * Get ticket summary report (Medium Priority #18)
   */
  async getTicketReport(
    userOrgIds: string[],
    role: string,
    period: 'day' | 'week' | 'month' | 'year' = 'month',
  ) {
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'day':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'year':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
    }

    const where: any = {
      createdAt: { gte: startDate },
    };

    // Role-based scoping
    if (role === 'LANDLORD') {
      where.property = {
        ownerOrgId: { in: userOrgIds },
      };
    } else if (role === 'TENANT') {
      where.tenancy = {
        tenantOrgId: { in: userOrgIds },
      };
    }

    const tickets = await this.prisma.ticket.findMany({
      where,
      include: {
        quotes: {
          where: {
            status: 'APPROVED',
          },
        },
      },
    });

    const byStatus = tickets.reduce((acc, ticket) => {
      acc[ticket.status] = (acc[ticket.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byCategory = tickets.reduce((acc, ticket) => {
      const cat = ticket.category || 'Uncategorized';
      acc[cat] = (acc[cat] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byPriority = tickets.reduce((acc, ticket) => {
      acc[ticket.priority] = (acc[ticket.priority] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const totalCost = tickets.reduce((sum, ticket) => {
      return sum + ticket.quotes.reduce((qSum, q) => qSum + q.amount, 0);
    }, 0);

    const completedTickets = tickets.filter(
      (t) => t.status === 'COMPLETED' || t.status === 'AUDITED',
    );

    const avgResolutionTime =
      completedTickets.length > 0
        ? completedTickets.reduce((sum, ticket) => {
            if (ticket.actualResolutionTime && ticket.createdAt) {
              return (
                sum +
                (ticket.actualResolutionTime.getTime() -
                  ticket.createdAt.getTime())
              );
            }
            return sum;
          }, 0) /
          completedTickets.filter(
            (t) => t.actualResolutionTime && t.createdAt,
          ).length
        : 0;

    const slaBreachedCount = tickets.filter((t) => t.slaBreached).length;

    return {
      period,
      startDate: startDate.toISOString(),
      endDate: now.toISOString(),
      summary: {
        total: tickets.length,
        completed: completedTickets.length,
        slaBreached: slaBreachedCount,
        totalCost,
        averageResolutionTimeHours: avgResolutionTime / (1000 * 60 * 60),
      },
      byStatus,
      byCategory,
      byPriority,
    };
  }
}
