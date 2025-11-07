import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { EmailService } from '../../notifications/email.service';

/**
 * Late Fee Automation Service
 * Automatically calculates and applies late fees to overdue invoices
 */
@Injectable()
export class LateFeeService {
  private readonly logger = new Logger(LateFeeService.name);

  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {}

  /**
   * Process late fees - runs daily at 2 AM
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM, {
    name: 'process-late-fees',
    timeZone: 'Europe/London',
  })
  async processLateFees(): Promise<void> {
    this.logger.log('Starting late fee processing');

    try {
      // Get all landlords with late fee settings enabled
      const settings = await this.prisma.financeSettings.findMany({
        where: {
          lateFeeEnabled: true,
        },
      });

      for (const setting of settings) {
        await this.processLateFeeForLandlord(setting.landlordId, setting);
      }

      this.logger.log('Late fee processing completed');
    } catch (error) {
      this.logger.error('Error processing late fees', error.stack);
    }
  }

  /**
   * Process late fees for a specific landlord
   */
  private async processLateFeeForLandlord(
    landlordId: string,
    settings: any,
  ): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Calculate grace period cutoff
    const gracePeriodEnd = new Date(today);
    gracePeriodEnd.setDate(gracePeriodEnd.getDate() - settings.lateFeeGraceDays);

    // Find overdue invoices past grace period
    const overdueInvoices = await this.prisma.invoice.findMany({
      where: {
        landlordId,
        status: {
          in: ['DUE', 'PART_PAID', 'LATE'],
        },
        dueAt: {
          lt: gracePeriodEnd,
        },
      },
      include: {
        tenancy: {
          include: {
            tenants: true,
            property: true,
          },
        },
        lines: true,
      },
    });

    this.logger.log(
      `Found ${overdueInvoices.length} overdue invoices for landlord ${landlordId}`,
    );

    for (const invoice of overdueInvoices) {
      await this.applyLateFee(invoice, settings);
    }
  }

  /**
   * Apply late fee to an invoice
   */
  private async applyLateFee(invoice: any, settings: any): Promise<void> {
    const today = new Date();
    const dueDate = new Date(invoice.dueAt);
    const daysOverdue = Math.floor(
      (today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (daysOverdue <= settings.lateFeeGraceDays) {
      return; // Still within grace period
    }

    // Calculate outstanding amount
    const totalPaid = await this.prisma.paymentAllocation.aggregate({
      where: { invoiceId: invoice.id },
      _sum: { amount: true },
    });

    const paidAmount = totalPaid._sum.amount || 0;
    const outstandingAmount = invoice.amountGBP - paidAmount;

    if (outstandingAmount <= 0) {
      return; // Invoice fully paid
    }

    // Calculate late fee
    let lateFeeAmount = 0;

    if (settings.lateFeePercent) {
      // Percentage-based daily fee
      const dailyRate = settings.lateFeePercent / 100;
      lateFeeAmount = outstandingAmount * dailyRate * daysOverdue;
    } else if (settings.lateFeeFixed) {
      // Fixed daily fee
      lateFeeAmount = settings.lateFeeFixed * daysOverdue;
    }

    // Apply cap if configured
    if (settings.lateFeeCap && lateFeeAmount > settings.lateFeeCap) {
      lateFeeAmount = settings.lateFeeCap;
    }

    // Round to 2 decimal places
    lateFeeAmount = Math.round(lateFeeAmount * 100) / 100;

    if (lateFeeAmount <= 0) {
      return; // No fee to apply
    }

    // Check if late fee already applied today
    const existingLateFee = await this.prisma.invoiceLine.findFirst({
      where: {
        invoiceId: invoice.id,
        description: {
          contains: `Late Fee - ${today.toISOString().split('T')[0]}`,
        },
      },
    });

    if (existingLateFee) {
      return; // Already applied today
    }

    // Add late fee as invoice line
    await this.prisma.invoiceLine.create({
      data: {
        invoiceId: invoice.id,
        description: `Late Fee - ${today.toISOString().split('T')[0]} (${daysOverdue} days overdue)`,
        qty: 1,
        unitPrice: lateFeeAmount,
        taxRate: 0,
        lineTotal: lateFeeAmount,
        taxTotal: 0,
      },
    });

    // Update invoice amount
    const newTotal = invoice.amountGBP + lateFeeAmount;
    await this.prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        amountGBP: newTotal,
        amount: newTotal, // backward compatibility
        status: 'LATE',
      },
    });

    this.logger.log(
      `Applied late fee of £${lateFeeAmount.toFixed(2)} to invoice ${invoice.number}`,
    );

    // Send email notification
    if (invoice.tenancy?.tenants?.[0]) {
      const tenant = invoice.tenancy.tenants[0];
      const property = invoice.tenancy.property;

      try {
        await this.emailService.sendArrearsReminderEmail(
          tenant.email,
          tenant.fullName,
          Math.round(outstandingAmount * 100), // Convert to pence
          daysOverdue,
          property
            ? `${property.addressLine1}, ${property.city}, ${property.postcode}`
            : 'Your Property',
          [invoice.number],
        );
      } catch (error) {
        this.logger.error(`Error sending arrears email: ${error.message}`);
      }
    }
  }

  /**
   * Manually trigger late fee processing for a specific invoice
   */
  async processLateFeeForInvoice(invoiceId: string): Promise<void> {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        tenancy: {
          include: {
            tenants: true,
            property: true,
          },
        },
        lines: true,
      },
    });

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    const settings = await this.prisma.financeSettings.findUnique({
      where: { landlordId: invoice.landlordId },
    });

    if (!settings || !settings.lateFeeEnabled) {
      throw new Error('Late fees not enabled for this landlord');
    }

    await this.applyLateFee(invoice, settings);
  }
}
