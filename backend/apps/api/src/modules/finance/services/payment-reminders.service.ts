import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { EmailService } from '../../notifications/email.service';
import { EventsService } from '../../events/events.service';
import { NotificationsService } from '../../notifications/notifications.service';

/**
 * Payment Reminders Service
 * Automatically sends payment reminders for overdue invoices based on configured policy
 */
@Injectable()
export class PaymentRemindersService {
  private readonly logger = new Logger(PaymentRemindersService.name);
  private readonly dryRun: boolean;

  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    private eventsService: EventsService,
    private notificationsService: NotificationsService,
    private configService: ConfigService,
  ) {
    this.dryRun = this.configService.get('REMINDERS_DRY_RUN', 'false') === 'true';
    if (this.dryRun) {
      this.logger.warn('Payment reminders running in DRY-RUN mode');
    }
  }

  /**
   * Process payment reminders - runs daily at 9 AM
   */
  @Cron(CronExpression.EVERY_DAY_AT_9AM, {
    name: 'process-payment-reminders',
    timeZone: 'Europe/London',
  })
  async processReminders(): Promise<void> {
    const enabled = this.configService.get('REMINDERS_ENABLED', 'true') === 'true';
    
    if (!enabled) {
      this.logger.log('Payment reminders are disabled via configuration');
      return;
    }

    this.logger.log('Starting payment reminders processing');

    try {
      // Get all landlords with reminders enabled
      const settings = await this.prisma.financeSettings.findMany({
        where: {
          remindersEnabled: true,
        },
      });

      let totalReminders = 0;
      for (const setting of settings) {
        const count = await this.processRemindersForLandlord(setting.landlordId, setting);
        totalReminders += count;
      }

      this.logger.log(`Payment reminders processing completed. Sent ${totalReminders} reminders.`);
    } catch (error) {
      this.logger.error('Error processing payment reminders', error.stack);
    }
  }

  /**
   * Process payment reminders for a specific landlord
   */
  private async processRemindersForLandlord(
    landlordId: string,
    settings: any,
  ): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Calculate grace period cutoff
    const gracePeriodEnd = new Date(today);
    gracePeriodEnd.setDate(gracePeriodEnd.getDate() - settings.reminderGraceDays);

    // Parse cadence (e.g., "1,3,7,14" means send on days 1, 3, 7, and 14 after due date)
    const cadenceDays = settings.reminderCadence
      .split(',')
      .map((d: string) => parseInt(d.trim(), 10))
      .filter((d: number) => !isNaN(d));

    if (cadenceDays.length === 0) {
      this.logger.warn(`Invalid reminder cadence for landlord ${landlordId}: ${settings.reminderCadence}`);
      return 0;
    }

    // Find overdue invoices that need reminders
    const overdueInvoices = await this.prisma.invoice.findMany({
      where: {
        landlordId,
        status: {
          in: ['DUE', 'PART_PAID', 'LATE'],
        },
        dueAt: {
          lt: gracePeriodEnd,
        },
        reminderCount: {
          lt: settings.maxReminders,
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
        allocations: true,
      },
    });

    this.logger.log(
      `Found ${overdueInvoices.length} overdue invoices for landlord ${landlordId} (dry-run: ${this.dryRun})`,
    );

    let remindersSent = 0;

    for (const invoice of overdueInvoices) {
      if (await this.shouldSendReminder(invoice, settings, cadenceDays, today)) {
        const sent = await this.sendReminder(invoice, settings);
        if (sent) {
          remindersSent++;
        }
      }
    }

    return remindersSent;
  }

  /**
   * Determine if a reminder should be sent for this invoice today
   */
  private async shouldSendReminder(
    invoice: any,
    settings: any,
    cadenceDays: number[],
    today: Date,
  ): Promise<boolean> {
    const dueDate = new Date(invoice.dueAt);
    dueDate.setHours(0, 0, 0, 0);

    // Calculate days overdue
    const daysOverdue = Math.floor(
      (today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24),
    );

    // Check if we're within grace period
    if (daysOverdue < settings.reminderGraceDays) {
      return false;
    }

    // Calculate days since due (excluding grace period)
    const daysSinceDue = daysOverdue - settings.reminderGraceDays;

    // Check if today matches one of the cadence days
    if (!cadenceDays.includes(daysSinceDue)) {
      return false;
    }

    // Check if we already sent a reminder today
    if (invoice.lastReminderAt) {
      const lastReminder = new Date(invoice.lastReminderAt);
      lastReminder.setHours(0, 0, 0, 0);
      if (lastReminder.getTime() === today.getTime()) {
        return false; // Already sent today
      }
    }

    // Check if we've reached max reminders
    if (invoice.reminderCount >= settings.maxReminders) {
      return false;
    }

    return true;
  }

  /**
   * Send payment reminder for an invoice
   */
  private async sendReminder(invoice: any, settings: any): Promise<boolean> {
    const tenant = invoice.tenancy?.tenants?.[0];
    const property = invoice.tenancy?.property;

    if (!tenant || !tenant.email) {
      this.logger.warn(`No tenant email found for invoice ${invoice.number}`);
      return false;
    }

    // Calculate outstanding amount
    const paidAmount = invoice.allocations.reduce((sum: number, alloc: any) => sum + alloc.amount, 0);
    const outstandingAmount = invoice.amountGBP - paidAmount;

    if (outstandingAmount <= 0) {
      this.logger.log(`Invoice ${invoice.number} is fully paid, skipping reminder`);
      return false;
    }

    const dueDate = new Date(invoice.dueAt);
    const daysOverdue = Math.floor(
      (new Date().getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24),
    );

    const propertyAddress = property
      ? `${property.addressLine1}, ${property.city}, ${property.postcode}`
      : 'Your Property';

    if (this.dryRun) {
      this.logger.log(
        `[DRY-RUN] Would send reminder for invoice ${invoice.number} to ${tenant.email} (£${outstandingAmount.toFixed(2)}, ${daysOverdue} days overdue)`,
      );
      return true;
    }

    try {
      // Send email
      await this.emailService.sendEmail({
        to: tenant.email,
        subject: `Payment Reminder: Invoice ${invoice.number} - ${propertyAddress}`,
        html: this.buildReminderEmailHtml(
          tenant.fullName || tenant.email,
          invoice,
          outstandingAmount,
          daysOverdue,
          propertyAddress,
          settings,
        ),
        text: this.buildReminderEmailText(
          tenant.fullName || tenant.email,
          invoice,
          outstandingAmount,
          daysOverdue,
          propertyAddress,
        ),
      });

      // Update invoice reminder tracking
      await this.prisma.invoice.update({
        where: { id: invoice.id },
        data: {
          reminderCount: invoice.reminderCount + 1,
          lastReminderAt: new Date(),
        },
      });

      // Emit event
      this.eventsService.emit({
        type: 'invoice.reminder_sent',
        actorRole: 'SYSTEM',
        landlordId: invoice.landlordId,
        tenantId: invoice.tenancy?.tenantOrgId,
        resources: [
          { type: 'invoice', id: invoice.id },
          { type: 'tenancy', id: invoice.tenancyId },
        ],
        payload: {
          invoiceNumber: invoice.number,
          reminderCount: invoice.reminderCount + 1,
          daysOverdue,
          outstandingAmount,
        },
      });

      // Create in-app notification
      await this.notificationsService.create({
        userId: tenant.id,
        type: 'PAYMENT_REMINDER',
        title: `Payment Reminder: Invoice ${invoice.number}`,
        message: `Your payment of £${outstandingAmount.toFixed(2)} is ${daysOverdue} days overdue. Please pay as soon as possible.`,
        resourceType: 'invoice',
        resourceId: invoice.id,
      });

      this.logger.log(
        `Sent reminder #${invoice.reminderCount + 1} for invoice ${invoice.number} to ${tenant.email}`,
      );

      return true;
    } catch (error) {
      this.logger.error(
        `Error sending reminder for invoice ${invoice.number}: ${error.message}`,
        error.stack,
      );
      return false;
    }
  }

  /**
   * Build HTML email content
   */
  private buildReminderEmailHtml(
    tenantName: string,
    invoice: any,
    outstandingAmount: number,
    daysOverdue: number,
    propertyAddress: string,
    settings: any,
  ): string {
    const dueDate = new Date(invoice.dueAt).toLocaleDateString('en-GB');
    const reminderNumber = invoice.reminderCount + 1;
    const pdfLink = invoice.pdfUrl || '#';

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
            .invoice-details { background-color: #fff; border: 1px solid #dee2e6; padding: 15px; border-radius: 5px; margin: 20px 0; }
            .amount { font-size: 24px; font-weight: bold; color: #dc3545; }
            .button { display: inline-block; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0; }
            .footer { font-size: 12px; color: #6c757d; margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>Payment Reminder ${reminderNumber > 1 ? `(${reminderNumber})` : ''}</h2>
            </div>
            
            <p>Dear ${tenantName},</p>
            
            <p>This is a ${reminderNumber > 1 ? 'follow-up ' : ''}reminder that your payment is <strong>${daysOverdue} days overdue</strong>.</p>
            
            <div class="invoice-details">
              <p><strong>Property:</strong> ${propertyAddress}</p>
              <p><strong>Invoice Number:</strong> ${invoice.number}</p>
              <p><strong>Reference:</strong> ${invoice.reference}</p>
              <p><strong>Due Date:</strong> ${dueDate}</p>
              <p><strong>Amount Outstanding:</strong> <span class="amount">£${outstandingAmount.toFixed(2)}</span></p>
            </div>
            
            <p>Please arrange payment as soon as possible to avoid any further late fees or action.</p>
            
            ${pdfLink !== '#' ? `<a href="${pdfLink}" class="button">View Invoice PDF</a>` : ''}
            
            <p>If you have already made this payment, please disregard this reminder and contact us to update our records.</p>
            
            <p>If you are experiencing difficulty making payment, please contact us to discuss payment arrangements.</p>
            
            <div class="footer">
              <p>This is an automated reminder. Please do not reply to this email.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Build plain text email content
   */
  private buildReminderEmailText(
    tenantName: string,
    invoice: any,
    outstandingAmount: number,
    daysOverdue: number,
    propertyAddress: string,
  ): string {
    const dueDate = new Date(invoice.dueAt).toLocaleDateString('en-GB');
    const reminderNumber = invoice.reminderCount + 1;

    return `
Payment Reminder ${reminderNumber > 1 ? `(${reminderNumber})` : ''}

Dear ${tenantName},

This is a ${reminderNumber > 1 ? 'follow-up ' : ''}reminder that your payment is ${daysOverdue} days overdue.

Property: ${propertyAddress}
Invoice Number: ${invoice.number}
Reference: ${invoice.reference}
Due Date: ${dueDate}
Amount Outstanding: £${outstandingAmount.toFixed(2)}

Please arrange payment as soon as possible to avoid any further late fees or action.

If you have already made this payment, please disregard this reminder and contact us to update our records.

If you are experiencing difficulty making payment, please contact us to discuss payment arrangements.

---
This is an automated reminder. Please do not reply to this email.
    `.trim();
  }

  /**
   * Manually trigger reminders for a specific landlord (for testing/debugging)
   */
  async processRemindersForLandlordManual(landlordId: string): Promise<number> {
    const settings = await this.prisma.financeSettings.findUnique({
      where: { landlordId },
    });

    if (!settings) {
      throw new Error(`Finance settings not found for landlord ${landlordId}`);
    }

    if (!settings.remindersEnabled) {
      throw new Error(`Reminders not enabled for landlord ${landlordId}`);
    }

    return this.processRemindersForLandlord(landlordId, settings);
  }
}
