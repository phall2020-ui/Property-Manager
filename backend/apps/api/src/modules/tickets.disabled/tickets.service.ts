import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class TicketsService {
  // simplistic idempotency store in memory. In production use persistent table with TTL.
  private idempotencyCache = new Map<string, any>();

  constructor(private readonly prisma: PrismaService) {}

  async create(dto: { propertyId: string; tenancyId?: string; category: string; priority: string; description?: string; createdById: string; idempotencyKey?: string; }) {
    if (dto.idempotencyKey) {
      const existing = this.idempotencyCache.get(dto.idempotencyKey);
      if (existing) return existing;
    }
    // Validate property & tenancy
    const property = await this.prisma.property.findUnique({ where: { id: dto.propertyId } });
    if (!property) throw new BadRequestException('Invalid property');
    let tenancy = null;
    if (dto.tenancyId) {
      tenancy = await this.prisma.tenancy.findUnique({ where: { id: dto.tenancyId } });
      if (!tenancy || tenancy.propertyId !== dto.propertyId) {
        throw new BadRequestException('Invalid tenancy');
      }
    }
    const ticket = await this.prisma.ticket.create({
      data: {
        propertyId: dto.propertyId,
        tenancyId: dto.tenancyId,
        createdById: dto.createdById,
        category: dto.category,
        priority: dto.priority,
        status: 'OPEN',
      },
    });
    // create timeline
    await this.prisma.timelineEvent.create({ data: { ticketId: ticket.id, type: 'CREATED', data: '{}' } });
    if (dto.idempotencyKey) {
      this.idempotencyCache.set(dto.idempotencyKey, ticket);
    }
    return ticket;
  }

  /**
   * Get a ticket by ID, ensuring the requesting user has access.
   */
  async findOne(id: string, user: any) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id },
      include: { property: true },
    });
    if (!ticket) throw new NotFoundException('Ticket not found');
    // Access control: landlord of property; tenant who created; contractor assigned; ops
    if (user.role === 'LANDLORD' && user.landlordId !== ticket.property.landlordId) {
      throw new ForbiddenException('Not your property');
    }
    if (user.role === 'TENANT' && user.id !== ticket.createdById) {
      throw new ForbiddenException('Not your ticket');
    }
    if (user.role === 'CONTRACTOR' && ticket.assignedToId !== user.id) {
      throw new ForbiddenException('Not your ticket');
    }
    // OPS can access anything
    return ticket;
  }

  async findMany(user: any, filter: { status?: string; propertyId?: string; page?: number; limit?: number; }) {
    const where: Prisma.TicketWhereInput = {};
    if (filter.status) where.status = filter.status;
    if (filter.propertyId) where.propertyId = filter.propertyId;
    if (user.role === 'LANDLORD') {
      where.property = { landlordId: user.landlordId };
    } else if (user.role === 'TENANT') {
      where.createdById = user.id;
    } else if (user.role === 'CONTRACTOR') {
      where.assignedToId = user.id;
    }
    return this.prisma.ticket.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: ((filter.page ?? 1) - 1) * (filter.limit ?? 20),
      take: filter.limit ?? 20,
    });
  }

  /**
   * Update the status of a ticket according to allowed transitions.
   */
  async updateStatus(id: string, status: string, user: any) {
    const ticket = await this.prisma.ticket.findUnique({ where: { id } });
    if (!ticket) throw new NotFoundException('Ticket not found');
    // validate transitions
    const allowed = this.allowedTransition(ticket.status, status, user);
    if (!allowed) throw new BadRequestException('Invalid transition');
    const updated = await this.prisma.ticket.update({ where: { id }, data: { status } });
    await this.prisma.timelineEvent.create({ data: { ticketId: id, type: 'STATUS_CHANGED', data: JSON.stringify({ from: ticket.status, to: status }) } });
    return updated;
  }

  /**
   * Contractor submits a quote.
   */
  async submitQuote(id: string, amount: string, user: any) {
    const ticket = await this.prisma.ticket.findUnique({ where: { id } });
    if (!ticket) throw new NotFoundException('Ticket not found');
    if (user.role !== 'CONTRACTOR') throw new ForbiddenException('Only contractors can quote');
    if (!['TRIAGED', 'OPEN'].includes(ticket.status)) {
      throw new BadRequestException('Ticket not ready for quote');
    }
    const updated = await this.prisma.ticket.update({
      where: { id },
      data: {
        quoteAmount: parseFloat(amount),
        status: 'QUOTED',
        assignedToId: user.id,
        contractorId: user.contractorId || user.id,
      },
    });
    await this.prisma.timelineEvent.create({ data: { ticketId: id, type: 'QUOTED', data: JSON.stringify({ amount }) } });
    return updated;
  }

  /**
   * Landlord approves a quote.
   */
  async approve(id: string, user: any) {
    const ticket = await this.prisma.ticket.findUnique({ include: { property: true }, where: { id } });
    if (!ticket) throw new NotFoundException('Ticket not found');
    if (user.role !== 'LANDLORD' || user.landlordId !== ticket.property.landlordId) {
      throw new ForbiddenException('Only landlord can approve');
    }
    if (ticket.status !== 'QUOTED') {
      throw new BadRequestException('Ticket not quoted');
    }
    const updated = await this.prisma.ticket.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedAt: new Date(),
      },
    });
    await this.prisma.timelineEvent.create({ data: { ticketId: id, type: 'APPROVED', data: '{}' } });
    return updated;
  }

  private allowedTransition(current: string, next: string, user: any): boolean {
    const transitions: Record<string, string[]> = {
      'OPEN': ['TRIAGED'],
      'TRIAGED': ['QUOTED'],
      'QUOTED': ['APPROVED'],
      'APPROVED': ['IN_PROGRESS'],
      'IN_PROGRESS': ['COMPLETED'],
      'COMPLETED': ['AUDITED'],
      'AUDITED': [],
    };
    // additional checks: only ops or landlord can triage or progress; contractor can move from QUOTED to IN_PROGRESS?; but for simplicity we allow if user is not tenant.
    if (!transitions[current].includes(next)) return false;
    if (user.role === 'TENANT') return false;
    return true;
  }
}