import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { InvoiceService } from './invoice.service';
import { EmailService } from '../../notifications/email.service';

/**
 * Recurring Invoice Service
 * Automatically generates recurring rent invoices based on tenancy schedules
 */
@Injectable()
export class RecurringInvoiceService {
  private readonly logger = new Logger(RecurringInvoiceService.name);

  constructor(
    private prisma: PrismaService,
    private invoiceService: InvoiceService,
    private emailService: EmailService,
  ) {}

  /**
   * Generate recurring invoices - runs daily at 1 AM
   */
  @Cron(CronExpression.EVERY_DAY_AT_1AM, {
    name: 'generate-recurring-invoices',
    timeZone: 'Europe/London',
  })
  async generateRecurringInvoices(): Promise<void> {
    this.logger.log('Starting recurring invoice generation');

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Get rent schedules that need invoicing
      const schedules = await this.prisma.rentSchedule.findMany({
        where: {
          status: 'PENDING',
          invoiceDate: {
            lte: today,
          },
        },
        include: {
          tenancy: {
            include: {
              property: true,
              tenants: true,
            },
          },
        },
      });

      this.logger.log(`Found ${schedules.length} rent schedules to process`);

      for (const schedule of schedules) {
        await this.generateInvoiceFromSchedule(schedule);
      }

      this.logger.log('Recurring invoice generation completed');
    } catch (error) {
      this.logger.error('Error generating recurring invoices', error.stack);
    }
  }

  /**
   * Generate invoice from a rent schedule
   */
  private async generateInvoiceFromSchedule(schedule: any): Promise<void> {
    try {
      const tenancy = schedule.tenancy;

      // Check if tenancy is still active
      if (tenancy.status !== 'ACTIVE') {
        this.logger.log(
          `Skipping invoice for inactive tenancy ${tenancy.id}`,
        );
        return;
      }

      // Calculate period
      const invoiceDate = new Date(schedule.invoiceDate);
      const periodStart = new Date(invoiceDate);
      
      let periodEnd: Date;
      if (tenancy.frequency === 'MONTHLY') {
        periodEnd = new Date(periodStart);
        periodEnd.setMonth(periodEnd.getMonth() + 1);
        periodEnd.setDate(periodEnd.getDate() - 1);
      } else if (tenancy.frequency === 'WEEKLY') {
        periodEnd = new Date(periodStart);
        periodEnd.setDate(periodEnd.getDate() + 6);
      } else {
        // Default to monthly
        periodEnd = new Date(periodStart);
        periodEnd.setMonth(periodEnd.getMonth() + 1);
        periodEnd.setDate(periodEnd.getDate() - 1);
      }

      // Get finance settings for due date calculation
      const settings = await this.prisma.financeSettings.findUnique({
        where: { landlordId: schedule.landlordId },
      });

      const dueDate = new Date(periodStart);
      dueDate.setDate(dueDate.getDate() + (settings?.defaultDueDays || 7));

      // Check if invoice already exists for this period
      const existingInvoice = await this.prisma.invoice.findFirst({
        where: {
          tenancyId: tenancy.id,
          periodStart: periodStart,
          periodEnd: periodEnd,
        },
      });

      if (existingInvoice) {
        this.logger.log(
          `Invoice already exists for tenancy ${tenancy.id} period ${periodStart.toISOString()}`,
        );
        // Mark schedule as invoiced
        await this.prisma.rentSchedule.update({
          where: { id: schedule.id },
          data: { status: 'INVOICED' },
        });
        return;
      }

      // Generate invoice reference
      const reference = `${periodStart.getFullYear()}-${String(periodStart.getMonth() + 1).padStart(2, '0')} Rent`;

      // Create invoice
      const invoice = await this.invoiceService.createInvoice(
        schedule.landlordId,
        {
          tenancyId: tenancy.id,
          reference,
          periodStart: periodStart.toISOString(),
          periodEnd: periodEnd.toISOString(),
          dueAt: dueDate.toISOString(),
          amountGBP: schedule.amount,
        },
      );

      this.logger.log(`Generated invoice ${invoice.number} for tenancy ${tenancy.id}`);

      // Mark schedule as invoiced
      await this.prisma.rentSchedule.update({
        where: { id: schedule.id },
        data: { status: 'INVOICED' },
      });

      // Send invoice email
      if (tenancy.tenants?.[0]) {
        const tenant = tenancy.tenants[0];
        const property = tenancy.property;

        try {
          await this.emailService.sendInvoiceEmail(
            tenant.email,
            tenant.fullName,
            invoice.number,
            Math.round(invoice.amountGBP * 100), // Convert to pence
            new Date(invoice.dueAt),
            property
              ? `${property.addressLine1}, ${property.city}, ${property.postcode}`
              : 'Your Property',
          );
        } catch (error) {
          this.logger.error(`Error sending invoice email: ${error.message}`);
        }
      }
    } catch (error) {
      this.logger.error(
        `Error generating invoice from schedule ${schedule.id}: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Create rent schedules for a tenancy
   */
  async createRentSchedules(
    landlordId: string,
    tenancyId: string,
    startDate: Date,
    endDate: Date | null,
    rentAmount: number,
    frequency: 'MONTHLY' | 'WEEKLY',
  ): Promise<void> {
    this.logger.log(`Creating rent schedules for tenancy ${tenancyId}`);

    const schedules: any[] = [];
    let currentDate = new Date(startDate);
    const finalDate = endDate || new Date(startDate.getTime() + 365 * 24 * 60 * 60 * 1000); // 1 year default

    while (currentDate <= finalDate) {
      schedules.push({
        landlordId,
        tenancyId,
        invoiceDate: new Date(currentDate),
        amount: rentAmount,
        status: 'PENDING',
      });

      // Move to next period
      if (frequency === 'MONTHLY') {
        currentDate.setMonth(currentDate.getMonth() + 1);
      } else if (frequency === 'WEEKLY') {
        currentDate.setDate(currentDate.getDate() + 7);
      }

      // Safety check to prevent infinite loops
      if (schedules.length > 1000) {
        this.logger.warn('Too many schedules - stopping at 1000');
        break;
      }
    }

    // Create schedules in batches
    const batchSize = 100;
    for (let i = 0; i < schedules.length; i += batchSize) {
      const batch = schedules.slice(i, i + batchSize);
      await this.prisma.rentSchedule.createMany({
        data: batch,
      });
    }

    this.logger.log(`Created ${schedules.length} rent schedules for tenancy ${tenancyId}`);
  }

  /**
   * Manually trigger invoice generation for a specific schedule
   */
  async generateInvoiceFromScheduleId(scheduleId: string): Promise<any> {
    const schedule = await this.prisma.rentSchedule.findUnique({
      where: { id: scheduleId },
      include: {
        tenancy: {
          include: {
            property: true,
            tenants: true,
          },
        },
      },
    });

    if (!schedule) {
      throw new Error('Rent schedule not found');
    }

    await this.generateInvoiceFromSchedule(schedule);
  }
}
