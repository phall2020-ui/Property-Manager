import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
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
    const landlordUsers = await this.prisma.orgMember.findMany({
      where: {
        orgId: ticket.landlordId,
        role: { in: ['LANDLORD', 'ADMIN'] },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    // Create notification for each landlord user
    for (const member of landlordUsers) {
      await this.notificationsService.create({
        userId: member.userId,
        type: 'ticket.created',
        title: 'New Maintenance Ticket',
        message: `New ticket created: ${ticket.title}`,
        resourceType: 'ticket',
        resourceId: ticket.id,
      });
    }
    
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
      propertyId?: string; 
      status?: string;
      search?: string;
      q?: string;
      id?: string;
      category?: string;
      priority?: string;
      contractorId?: string;
      contractor_id?: string;
      startDate?: string;
      endDate?: string;
      date_from?: string;
      date_to?: string;
      page?: number;
      limit?: number;
      page_size?: number;
      sort_by?: string;
      sort_dir?: 'asc' | 'desc';
    },
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
    if (filters?.category) {
      where.category = filters.category;
    }
    if (filters?.priority) {
      where.priority = filters.priority;
    }
    
    // Support both naming conventions
    const contractorId = filters?.contractorId || filters?.contractor_id;
    if (contractorId) {
      where.assignedToId = contractorId;
    }

    // Date range filtering - support both naming conventions
    const startDate = filters?.startDate || filters?.date_from;
    const endDate = filters?.endDate || filters?.date_to;
    
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        // Include the entire end date (set to end of day)
        const endDateObj = new Date(endDate);
        endDateObj.setHours(23, 59, 59, 999);
        where.createdAt.lte = endDateObj;
      }
    }

    // Apply search filter - support both 'search' and 'q'
    const searchQuery = filters?.search || filters?.q;
    if (searchQuery) {
      where.OR = [
        { title: { contains: searchQuery, mode: 'insensitive' } },
        { description: { contains: searchQuery, mode: 'insensitive' } },
        { id: { contains: searchQuery, mode: 'insensitive' } },
      ];
    }

    // Filter by specific ID if provided
    if (filters?.id) {
      where.id = filters.id;
    }

    // Pagination defaults - support both naming conventions
    const page = filters?.page || 1;
    const pageSize = filters?.page_size || filters?.limit || 25;
    const limit = Math.min(pageSize, 100); // Max 100 per page
    const skip = (page - 1) * limit;

    // Sorting - support sort_by and sort_dir
    const sortBy = filters?.sort_by || 'created_at';
    const sortDir = filters?.sort_dir || 'desc';
    
    // Map sort_by field to actual model field
    const sortFieldMap: Record<string, string> = {
      'created_at': 'createdAt',
      'updated_at': 'updatedAt',
      'priority': 'priority',
      'status': 'status',
      'title': 'title',
    };
    
    const orderByField = sortFieldMap[sortBy] || 'createdAt';
    const orderBy = { [orderByField]: sortDir };

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
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.ticket.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;

    return {
      items: tickets,
      page,
      page_size: limit,
      total,
      has_next: hasNext,
      // Keep old format for backward compatibility
      data: tickets,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
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
    resolutionNote: string | undefined,
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
      throw new ForbiddenException('Cannot close more than 50 tickets at once');
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

        // Check if already closed
        if (ticket.status === 'COMPLETED' || ticket.status === 'CANCELLED') {
          failed.push({ id: ticketId, error: 'Already closed' });
          continue;
        }

        // Update ticket to COMPLETED
        await this.prisma.ticket.update({
          where: { id: ticketId },
          data: { status: 'COMPLETED' },
        });

        // Create timeline event
        await this.prisma.ticketTimeline.create({
          data: {
            ticketId,
            eventType: 'closed',
            actorId,
            details: JSON.stringify({
              resolutionNote,
              bulkOperation: true,
            }),
          },
        });

        // Emit SSE event
        this.eventsService.emit({
          type: 'ticket.closed',
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
   * Bulk reassign tickets to contractor (OPS role only)
   */
  async bulkReassign(
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
      throw new ForbiddenException('Cannot reassign more than 50 tickets at once');
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

        // Update ticket
        await this.prisma.ticket.update({
          where: { id: ticketId },
          data: { assignedToId: contractorId },
        });

        // Create timeline event
        await this.prisma.ticketTimeline.create({
          data: {
            ticketId,
            eventType: 'reassigned',
            actorId,
            details: JSON.stringify({
              contractorId,
              previousContractorId: ticket.assignedToId,
              bulkOperation: true,
            }),
          },
        });

        // Emit SSE event
        this.eventsService.emit({
          type: 'ticket.reassigned',
          actorRole: userRole,
          landlordId: ticket.landlordId,
          tenantId: ticket.tenancy?.tenantOrgId,
          resources: [{ type: 'ticket', id: ticketId }],
          payload: { contractorId },
        });

        ok.push(ticketId);
      } catch (error) {
        failed.push({ id: ticketId, error: error.message });
      }
    }

    return { ok, failed };
  }

  /**
   * Bulk update ticket tags (OPS role only)
   */
  async bulkTag(
    ticketIds: string[],
    add: string[] | undefined,
    remove: string[] | undefined,
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

    if (!add?.length && !remove?.length) {
      throw new ForbiddenException('Must specify tags to add or remove');
    }

    const ok: string[] = [];
    const failed: Array<{ id: string; error: string }> = [];

    for (const ticketId of ticketIds) {
      try {
        const ticket = await this.prisma.ticket.findUnique({
          where: { id: ticketId },
          select: { 
            id: true, 
            attachments: true, 
            landlordId: true,
            tenancy: { select: { tenantOrgId: true } },
          },
        });

        if (!ticket) {
          failed.push({ id: ticketId, error: 'Ticket not found' });
          continue;
        }

        // Parse existing tags from attachments JSON field
        let tags: string[] = [];
        if (ticket.attachments) {
          try {
            const parsed = JSON.parse(ticket.attachments);
            tags = parsed.tags || [];
          } catch {
            // Ignore parse errors
          }
        }

        // Add new tags
        if (add?.length) {
          tags = [...new Set([...tags, ...add])];
        }

        // Remove tags
        if (remove?.length) {
          tags = tags.filter(tag => !remove.includes(tag));
        }

        // Update attachments field with new tags
        const attachmentsData = ticket.attachments 
          ? JSON.parse(ticket.attachments) 
          : {};
        attachmentsData.tags = tags;

        await this.prisma.ticket.update({
          where: { id: ticketId },
          data: { 
            attachments: JSON.stringify(attachmentsData),
          },
        });

        // Create timeline event
        await this.prisma.ticketTimeline.create({
          data: {
            ticketId,
            eventType: 'tags_updated',
            actorId,
            details: JSON.stringify({
              addedTags: add,
              removedTags: remove,
              bulkOperation: true,
            }),
          },
        });

        // Emit SSE event
        this.eventsService.emit({
          type: 'ticket.tags_updated',
          actorRole: userRole,
          landlordId: ticket.landlordId,
          tenantId: ticket.tenancy?.tenantOrgId,
          resources: [{ type: 'ticket', id: ticketId }],
          payload: { tags },
        });

        ok.push(ticketId);
      } catch (error) {
        failed.push({ id: ticketId, error: error.message });
      }
    }

    return { ok, failed };
  }

  /**
   * Bulk update ticket category (OPS role only)
   */
  async bulkCategory(
    ticketIds: string[],
    category: string,
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

        // Update category
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
              previousCategory: ticket.category,
              newCategory: category,
              bulkOperation: true,
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
