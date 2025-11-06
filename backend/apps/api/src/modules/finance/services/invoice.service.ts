import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { CreateInvoiceDto } from '../dto/create-invoice.dto';
import { EventsService } from '../../events/events.service';
import { NotificationsService } from '../../notifications/notifications.service';

@Injectable()
export class InvoiceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventsService: EventsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Generate next invoice number for landlord
   * Format: INV-YYYY-000001
   */
  private async generateInvoiceNumber(landlordId: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = 'INV';
    
    // Get the latest invoice for this landlord in this year
    const latestInvoice = await this.prisma.invoice.findFirst({
      where: {
        landlordId,
        number: {
          startsWith: `${prefix}-${year}-`,
        },
      },
      orderBy: {
        number: 'desc',
      },
    });

    let sequence = 1;
    if (latestInvoice) {
      const parts = latestInvoice.number.split('-');
      const lastSequence = parseInt(parts[2], 10);
      sequence = lastSequence + 1;
    }

    return `${prefix}-${year}-${sequence.toString().padStart(6, '0')}`;
  }



  /**
   * Create a new invoice
   */
  async createInvoice(landlordId: string, dto: CreateInvoiceDto) {
    // Verify tenancy exists and belongs to landlord
    const tenancy = await this.prisma.tenancy.findFirst({
      where: { id: dto.tenancyId },
      include: { property: true },
    });

    if (!tenancy || tenancy.property.ownerOrgId !== landlordId) {
      throw new NotFoundException('Tenancy not found');
    }

    // Check for overlapping period invoices
    const overlapping = await this.prisma.invoice.findFirst({
      where: {
        tenancyId: dto.tenancyId,
        status: { not: 'VOID' },
        OR: [
          {
            AND: [
              { periodStart: { lte: new Date(dto.periodStart) } },
              { periodEnd: { gte: new Date(dto.periodStart) } },
            ],
          },
          {
            AND: [
              { periodStart: { lte: new Date(dto.periodEnd) } },
              { periodEnd: { gte: new Date(dto.periodEnd) } },
            ],
          },
        ],
      },
    });

    if (overlapping) {
      throw new BadRequestException('Overlapping invoice period exists for this tenancy');
    }

    // Generate invoice number and reference
    const invoiceNumber = await this.generateInvoiceNumber(landlordId);
    const reference = dto.reference || this.generateReference(dto.periodStart, dto.periodEnd);

    // Create invoice
    const invoice = await this.prisma.invoice.create({
      data: {
        landlordId,
        propertyId: tenancy.propertyId,
        tenancyId: dto.tenancyId,
        number: invoiceNumber,
        reference,
        periodStart: new Date(dto.periodStart),
        periodEnd: new Date(dto.periodEnd),
        dueAt: new Date(dto.dueAt),
        amountGBP: dto.amountGBP,
        status: 'DUE',
        notes: dto.notes,
        // Backward compatibility fields
        issueDate: new Date(),
        dueDate: new Date(dto.dueAt),
        amount: dto.amountGBP,
        grandTotal: dto.amountGBP,
      },
    });

    // Create ledger entry for the invoice
    await this.createInvoiceLedgerEntry(invoice);

    // Emit SSE event
    this.eventsService.emit({
      type: 'invoice.created',
      actorRole: 'LANDLORD',
      landlordId,
      tenantId: tenancy.tenantOrgId,
      resources: [
        { type: 'invoice', id: invoice.id },
        { type: 'tenancy', id: dto.tenancyId },
      ],
      payload: {
        number: invoice.number,
        reference: invoice.reference,
        amount: invoice.amountGBP,
        dueAt: invoice.dueAt,
      },
    });

    return invoice;
  }

  /**
   * Generate human-readable reference
   */
  private generateReference(periodStart: string, periodEnd: string): string {
    const start = new Date(periodStart);
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = monthNames[start.getMonth()];
    const year = start.getFullYear();
    return `${year}-${String(start.getMonth() + 1).padStart(2, '0')} Rent`;
  }

  /**
   * Create ledger entry for invoice (debit accounts receivable)
   */
  private async createInvoiceLedgerEntry(invoice: any) {
    // Get or create rent ledger account
    let rentAccount = await this.prisma.ledgerAccount.findFirst({
      where: {
        landlordId: invoice.landlordId,
        type: 'RENT',
      },
    });

    if (!rentAccount) {
      rentAccount = await this.prisma.ledgerAccount.create({
        data: {
          landlordId: invoice.landlordId,
          code: 'RENT-001', // Required field
          type: 'INCOME', // Step 4 spec uses INCOME instead of RENT
          name: 'Rent Receivable',
          currency: 'GBP',
        },
      });
    }

    // Create debit entry (increase accounts receivable)
    await this.prisma.ledgerEntry.create({
      data: {
        landlordId: invoice.landlordId,
        propertyId: invoice.propertyId || null,
        tenancyId: invoice.tenancyId || null,
        tenantUserId: invoice.tenantUserId,
        accountId: rentAccount.id,
        direction: 'DEBIT',
        drCr: 'DR', // Required field
        amount: invoice.grandTotal || invoice.amount,
        description: `Invoice ${invoice.number}`,
        memo: `Invoice ${invoice.number}`, // Required field
        refType: 'invoice',
        refId: invoice.id,
        bookedAt: invoice.issueDate, // Required field
        eventAt: invoice.issueDate,
      },
    });
  }

  /**
   * Get invoice by ID (with ownership check)
   */
  async getInvoice(invoiceId: string, landlordId: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: {
        id: invoiceId,
        landlordId,
      },
      include: {
        lines: true,
        allocations: {
          include: {
            payment: true,
          },
        },
        creditNotes: true,
      },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    // Calculate paid amount
    const paidAmount = invoice.allocations.reduce((sum, alloc) => sum + alloc.amount, 0);
    const amount = invoice.amountGBP || invoice.grandTotal || invoice.amount || 0;
    const balance = amount - paidAmount;

    return {
      ...invoice,
      paidAmount,
      balance,
    };
  }

  /**
   * List invoices for landlord
   */
  async listInvoices(
    landlordId: string,
    filters: {
      propertyId?: string;
      tenancyId?: string;
      status?: string;
      page?: number;
      limit?: number;
    } = {},
  ) {
    const { propertyId, tenancyId, status, page = 1, limit = 50 } = filters;

    const where: any = { landlordId };
    if (propertyId) where.propertyId = propertyId;
    if (tenancyId) where.tenancyId = tenancyId;
    if (status) where.status = status;

    const [invoices, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        include: {
          lines: true,
          allocations: true,
        },
        orderBy: {
          issueDate: 'desc',
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.invoice.count({ where }),
    ]);

    // Calculate balances
    const invoicesWithBalance = invoices.map((invoice) => {
      const paidAmount = invoice.allocations.reduce((sum, alloc) => sum + alloc.amount, 0);
      const amount = invoice.amountGBP || invoice.grandTotal || invoice.amount || 0;
      return {
        ...invoice,
        paidAmount,
        balance: amount - paidAmount,
      };
    });

    return {
      data: invoicesWithBalance,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Void an invoice (only if status is DRAFT or ISSUED and no payments)
   */
  async voidInvoice(invoiceId: string, landlordId: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: {
        id: invoiceId,
        landlordId,
      },
      include: {
        allocations: true,
      },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    if (invoice.allocations.length > 0) {
      throw new BadRequestException('Cannot void invoice with payments');
    }

    if (invoice.status === 'VOID') {
      throw new BadRequestException('Invoice already voided');
    }

    return this.prisma.invoice.update({
      where: { id: invoiceId },
      data: { status: 'VOID' },
    });
  }

  /**
   * Update invoice status based on payments
   */
  async updateInvoiceStatus(invoiceId: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        allocations: true,
      },
    });

    if (!invoice || invoice.status === 'VOID') {
      return;
    }

    const paidAmount = invoice.allocations.reduce((sum, alloc) => sum + alloc.amount, 0);
    const balance = (invoice.amountGBP || invoice.grandTotal || 0) - paidAmount;
    const now = new Date();
    const isOverdue = now > invoice.dueAt && balance > 0;

    let newStatus = invoice.status;
    if (paidAmount >= (invoice.amountGBP || invoice.grandTotal || 0)) {
      newStatus = 'PAID';
    } else if (paidAmount > 0) {
      newStatus = isOverdue ? 'LATE' : 'PART_PAID';
    } else {
      newStatus = isOverdue ? 'LATE' : 'DUE';
    }

    if (newStatus !== invoice.status) {
      await this.prisma.invoice.update({
        where: { id: invoiceId },
        data: { status: newStatus },
      });

      // Emit event if became paid
      if (newStatus === 'PAID') {
        this.eventsService.emit({
          type: 'invoice.paid',
          actorRole: 'SYSTEM',
          landlordId: invoice.landlordId,
          resources: [{ type: 'invoice', id: invoice.id }],
          payload: {
            number: invoice.number,
            reference: invoice.reference,
            amount: invoice.amountGBP || invoice.amount,
          },
        });
      }

      // Emit event if became late
      if (newStatus === 'LATE' && invoice.status !== 'LATE') {
        this.eventsService.emit({
          type: 'invoice.late',
          actorRole: 'SYSTEM',
          landlordId: invoice.landlordId,
          resources: [{ type: 'invoice', id: invoice.id }],
          payload: {
            number: invoice.number,
            reference: invoice.reference,
            daysLate: Math.floor((now.getTime() - invoice.dueAt.getTime()) / (1000 * 60 * 60 * 24)),
            balance,
          },
        });
      }
    }
  }
}
