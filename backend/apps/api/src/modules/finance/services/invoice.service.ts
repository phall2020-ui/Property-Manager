import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { CreateInvoiceDto, InvoiceLineDto } from '../dto/create-invoice.dto';

@Injectable()
export class InvoiceService {
  constructor(private readonly prisma: PrismaService) {}

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
   * Calculate line totals and tax
   */
  private calculateLineTotals(line: InvoiceLineDto) {
    const lineTotal = line.qty * line.unitPrice;
    const taxTotal = lineTotal * (line.taxRate / 100);
    return { lineTotal, taxTotal };
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

    // Calculate totals
    let lineTotal = 0;
    let taxTotal = 0;

    const linesWithTotals = dto.lines.map((line) => {
      const calculated = this.calculateLineTotals(line);
      lineTotal += calculated.lineTotal;
      taxTotal += calculated.taxTotal;
      return {
        ...line,
        ...calculated,
      };
    });

    const grandTotal = lineTotal + taxTotal;

    // Generate invoice number
    const invoiceNumber = await this.generateInvoiceNumber(landlordId);

    // Create invoice with lines
    const invoice = await this.prisma.invoice.create({
      data: {
        landlordId,
        propertyId: tenancy.propertyId,
        tenancyId: dto.tenancyId,
        tenantUserId: dto.tenantUserId || null,
        number: invoiceNumber,
        issueDate: new Date(dto.issueDate),
        dueDate: new Date(dto.dueDate),
        amount: grandTotal, // New required field
        lineTotal,
        taxTotal,
        grandTotal,
        status: 'SENT', // Use SENT instead of ISSUED (Step 5 spec)
        lines: {
          create: linesWithTotals,
        },
      },
      include: {
        lines: true,
      },
    });

    // Create ledger entry for the invoice
    await this.createInvoiceLedgerEntry(invoice);

    return invoice;
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
    const balance = invoice.grandTotal - paidAmount;

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
      return {
        ...invoice,
        paidAmount,
        balance: invoice.grandTotal - paidAmount,
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

    let newStatus = invoice.status;
    if (paidAmount === 0) {
      newStatus = 'ISSUED';
    } else if (paidAmount >= invoice.grandTotal) {
      newStatus = 'PAID';
    } else {
      newStatus = 'PART_PAID';
    }

    if (newStatus !== invoice.status) {
      await this.prisma.invoice.update({
        where: { id: invoiceId },
        data: { status: newStatus },
      });
    }
  }
}
