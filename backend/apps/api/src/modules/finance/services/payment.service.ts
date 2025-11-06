import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { RecordPaymentDto } from '../dto/record-payment.dto';
import { AllocationItemDto } from '../dto/allocate-payment.dto';
import { WebhookPaymentDto } from '../dto/webhook-payment.dto';
import { InvoiceService } from './invoice.service';
import { EventsService } from '../../events/events.service';
import { NotificationsService } from '../../notifications/notifications.service';

@Injectable()
export class PaymentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly invoiceService: InvoiceService,
    private readonly eventsService: EventsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Record a payment (with idempotency)
   */
  async recordPayment(landlordId: string, dto: RecordPaymentDto) {
    // Check for duplicate providerRef (idempotency)
    const existing = await this.prisma.payment.findUnique({
      where: { providerRef: dto.providerRef },
    });

    if (existing) {
      // Return existing payment (idempotent)
      return this.getPayment(existing.id, landlordId);
    }

    // Verify invoice exists and belongs to landlord
    const invoice = await this.prisma.invoice.findFirst({
      where: { 
        id: dto.invoiceId,
        landlordId,
      },
      include: { 
        tenancy: { include: { property: true } },
      },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    // Create payment
    const payment = await this.prisma.payment.create({
      data: {
        landlordId,
        propertyId: invoice.propertyId,
        tenancyId: invoice.tenancyId,
        invoiceId: dto.invoiceId,
        amountGBP: dto.amountGBP,
        method: dto.method,
        provider: dto.provider || 'OTHER',
        providerRef: dto.providerRef,
        status: 'SETTLED',
        feeGBP: dto.feeGBP,
        vatGBP: dto.vatGBP,
        paidAt: new Date(dto.paidAt),
        // Backward compatibility fields
        amount: dto.amountGBP,
        receivedAt: new Date(dto.paidAt),
      },
    });

    // Allocate to invoice
    await this.prisma.paymentAllocation.create({
      data: {
        paymentId: payment.id,
        invoiceId: dto.invoiceId,
        amount: dto.amountGBP,
      },
    });

    // Update invoice status
    await this.invoiceService.updateInvoiceStatus(dto.invoiceId);

    // Create ledger entry
    await this.createPaymentLedgerEntry(payment);

    // Emit event
    this.eventsService.emit({
      type: 'payment.recorded',
      actorRole: 'LANDLORD',
      landlordId,
      tenantId: invoice.tenancy?.tenantOrgId,
      resources: [
        { type: 'payment', id: payment.id },
        { type: 'invoice', id: dto.invoiceId },
      ],
      payload: {
        amount: dto.amountGBP,
        method: dto.method,
      },
    });

    return this.getPayment(payment.id, landlordId);
  }

  /**
   * Auto-allocate payment to oldest invoices first
   */
  private async autoAllocatePayment(paymentId: string, landlordId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) return;

    // Find unpaid/partially paid invoices for this tenancy
    const invoices = await this.prisma.invoice.findMany({
      where: {
        landlordId,
        tenancyId: payment.tenancyId,
        status: {
          in: ['ISSUED', 'PART_PAID'],
        },
      },
      include: {
        allocations: true,
      },
      orderBy: {
        dueDate: 'asc', // Oldest first
      },
    });

    let remainingAmount = payment.amount;

    for (const invoice of invoices) {
      if (remainingAmount <= 0) break;

      // Calculate invoice balance
      const paidAmount = invoice.allocations.reduce((sum, alloc) => sum + alloc.amount, 0);
      const balance = invoice.grandTotal - paidAmount;

      if (balance <= 0) continue;

      // Allocate up to the invoice balance
      const allocationAmount = Math.min(remainingAmount, balance);

      await this.prisma.paymentAllocation.create({
        data: {
          paymentId,
          invoiceId: invoice.id,
          amount: allocationAmount,
        },
      });

      // Update invoice status
      await this.invoiceService.updateInvoiceStatus(invoice.id);

      remainingAmount -= allocationAmount;
    }
  }

  /**
   * Create ledger entry for payment (credit accounts receivable)
   */
  private async createPaymentLedgerEntry(payment: any) {
    // Get rent ledger account
    const rentAccount = await this.prisma.ledgerAccount.findFirst({
      where: {
        landlordId: payment.landlordId,
        type: 'INCOME', // Changed from RENT to INCOME
      },
    });

    if (!rentAccount) return;

    // Create credit entry (decrease accounts receivable)
    await this.prisma.ledgerEntry.create({
      data: {
        landlordId: payment.landlordId,
        propertyId: payment.propertyId || null,
        tenancyId: payment.tenancyId || null,
        tenantUserId: payment.tenantUserId,
        accountId: rentAccount.id,
        direction: 'CREDIT',
        drCr: 'CR', // Required field
        amount: payment.amount,
        description: `Payment via ${payment.method || payment.provider}`,
        memo: `Payment via ${payment.method || payment.provider}`, // Required field
        refType: 'payment',
        refId: payment.id,
        bookedAt: payment.receivedAt || new Date(), // Required field
        eventAt: payment.receivedAt,
      },
    });
  }

  /**
   * Get payment by ID with allocations
   */
  async getPayment(paymentId: string, landlordId: string) {
    const payment = await this.prisma.payment.findFirst({
      where: {
        id: paymentId,
        landlordId,
      },
      include: {
        allocations: {
          include: {
            invoice: true,
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    const allocatedAmount = payment.allocations.reduce((sum, alloc) => sum + alloc.amount, 0);
    const unallocatedAmount = payment.amount - allocatedAmount;

    return {
      ...payment,
      allocatedAmount,
      unallocatedAmount,
    };
  }

  /**
   * List payments for landlord
   */
  async listPayments(
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

    const [payments, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        include: {
          allocations: {
            include: {
              invoice: true,
            },
          },
        },
        orderBy: {
          receivedAt: 'desc',
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.payment.count({ where }),
    ]);

    const paymentsWithAllocations = payments.map((payment) => {
      const allocatedAmount = payment.allocations.reduce((sum, alloc) => sum + alloc.amount, 0);
      return {
        ...payment,
        allocatedAmount,
        unallocatedAmount: payment.amount - allocatedAmount,
      };
    });

    return {
      data: paymentsWithAllocations,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Manually allocate payment to specific invoices
   */
  async allocatePayment(
    paymentId: string,
    landlordId: string,
    allocations: AllocationItemDto[],
  ) {
    const payment = await this.prisma.payment.findFirst({
      where: {
        id: paymentId,
        landlordId,
      },
      include: {
        allocations: true,
      },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    // Calculate current allocated amount
    const currentAllocated = payment.allocations.reduce((sum, alloc) => sum + alloc.amount, 0);
    const newAllocated = allocations.reduce((sum, alloc) => sum + alloc.amount, 0);

    if (currentAllocated + newAllocated > payment.amount) {
      throw new BadRequestException('Allocation exceeds payment amount');
    }

    // Verify all invoices exist and belong to same tenancy
    for (const alloc of allocations) {
      const invoice = await this.prisma.invoice.findFirst({
        where: {
          id: alloc.invoiceId,
          landlordId,
          tenancyId: payment.tenancyId,
        },
        include: {
          allocations: true,
        },
      });

      if (!invoice) {
        throw new NotFoundException(`Invoice ${alloc.invoiceId} not found`);
      }

      // Check invoice balance
      const invoicePaid = invoice.allocations.reduce((sum, a) => sum + a.amount, 0);
      const invoiceBalance = invoice.grandTotal - invoicePaid;

      if (alloc.amount > invoiceBalance) {
        throw new BadRequestException(`Allocation exceeds invoice ${invoice.number} balance`);
      }

      // Create allocation
      await this.prisma.paymentAllocation.create({
        data: {
          paymentId,
          invoiceId: alloc.invoiceId,
          amount: alloc.amount,
        },
      });

      // Update invoice status
      await this.invoiceService.updateInvoiceStatus(alloc.invoiceId);
    }

    return this.getPayment(paymentId, landlordId);
  }

  /**
   * Process payment webhook (test route for simulating PSP callbacks)
   */
  async processWebhookPayment(dto: WebhookPaymentDto) {
    // Check for duplicate providerRef (idempotency)
    const existing = await this.prisma.payment.findUnique({
      where: { providerRef: dto.providerRef },
    });

    if (existing) {
      // Return existing payment (idempotent)
      const invoice = await this.prisma.invoice.findUnique({
        where: { id: dto.invoiceId },
      });
      return {
        success: true,
        payment: existing,
        invoice,
        message: 'Payment already processed (idempotent)',
      };
    }

    // Find the invoice
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: dto.invoiceId },
      include: {
        tenancy: {
          include: {
            property: true,
          },
        },
      },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    // Create payment
    const payment = await this.prisma.payment.create({
      data: {
        landlordId: invoice.landlordId,
        propertyId: invoice.propertyId,
        tenancyId: invoice.tenancyId,
        invoiceId: dto.invoiceId,
        amountGBP: dto.amountGBP,
        method: dto.method || 'OTHER',
        provider: dto.provider || 'TEST',
        providerRef: dto.providerRef,
        status: 'SETTLED',
        paidAt: new Date(dto.paidAt),
        // Backward compatibility
        amount: dto.amountGBP,
        receivedAt: new Date(dto.paidAt),
      },
    });

    // Allocate payment to invoice
    await this.prisma.paymentAllocation.create({
      data: {
        paymentId: payment.id,
        invoiceId: dto.invoiceId,
        amount: dto.amountGBP,
      },
    });

    // Update invoice status
    await this.invoiceService.updateInvoiceStatus(dto.invoiceId);

    // Get updated invoice
    const updatedInvoice = await this.prisma.invoice.findUnique({
      where: { id: dto.invoiceId },
      include: { tenancy: true },
    });

    // Emit SSE event
    this.eventsService.emit({
      type: 'payment.recorded',
      actorRole: 'TENANT',
      landlordId: invoice.landlordId,
      tenantId: invoice.tenancy?.tenantOrgId,
      resources: [
        { type: 'invoice', id: dto.invoiceId },
        { type: 'payment', id: payment.id },
      ],
      payload: {
        amount: dto.amountGBP,
        status: updatedInvoice?.status,
      },
    });

    return {
      success: true,
      payment,
      invoice: updatedInvoice,
    };
  }
}
