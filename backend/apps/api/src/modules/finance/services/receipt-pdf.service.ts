import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { StorageService } from '../../../common/storage/storage.service';
import { EmailService } from '../../notifications/email.service';

/**
 * Receipt PDF Service
 * Generates and emails payment receipts
 */
@Injectable()
export class ReceiptPdfService {
  private readonly logger = new Logger(ReceiptPdfService.name);
  private readonly enabled: boolean;

  constructor(
    private prisma: PrismaService,
    private storageService: StorageService,
    private emailService: EmailService,
    private configService: ConfigService,
  ) {
    this.enabled = this.configService.get('PDF_GENERATION_ENABLED', 'true') === 'true';
  }

  /**
   * Generate receipt number
   * Format: RCP-YYMM-000001
   */
  private async generateReceiptNumber(landlordId: string): Promise<string> {
    const now = new Date();
    const year = String(now.getFullYear()).slice(-2);
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const prefix = `RCP-${year}${month}`;

    // Get the latest receipt for this landlord in this month
    const latestPayment = await this.prisma.payment.findFirst({
      where: {
        landlordId,
        receiptNumber: {
          startsWith: prefix,
        },
      },
      orderBy: {
        receiptNumber: 'desc',
      },
    });

    let sequence = 1;
    if (latestPayment?.receiptNumber) {
      const parts = latestPayment.receiptNumber.split('-');
      const lastSequence = parseInt(parts[2], 10);
      sequence = lastSequence + 1;
    }

    return `${prefix}-${sequence.toString().padStart(6, '0')}`;
  }

  /**
   * Generate and send payment receipt
   */
  async generateReceipt(paymentId: string): Promise<void> {
    // Fetch payment with invoice and tenancy details
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        invoice: {
          include: {
            tenancy: {
              include: {
                property: true,
                tenants: true,
              },
            },
            lines: true,
          },
        },
        allocations: {
          include: {
            invoice: true,
          },
        },
      },
    });

    if (!payment) {
      this.logger.warn(`Payment ${paymentId} not found for receipt generation`);
      return;
    }

    // Check if receipt already generated (idempotency)
    if (payment.receiptNumber) {
      this.logger.log(`Receipt already exists for payment ${paymentId}: ${payment.receiptNumber}`);
      return;
    }

    // Generate receipt number
    const receiptNumber = await this.generateReceiptNumber(payment.landlordId);

    // Update payment with receipt number
    await this.prisma.payment.update({
      where: { id: paymentId },
      data: { receiptNumber },
    });

    this.logger.log(`Generated receipt ${receiptNumber} for payment ${paymentId}`);

    // Generate and store receipt PDF/HTML
    if (this.enabled) {
      const html = this.generateReceiptHtml(payment, receiptNumber);
      const htmlBuffer = Buffer.from(html, 'utf-8');
      
      const key = this.storageService.generateReceiptPdfKey(
        payment.landlordId,
        receiptNumber,
      );

      const receiptUrl = await this.storageService.upload({
        key,
        body: htmlBuffer,
        contentType: 'text/html', // In production: 'application/pdf'
        metadata: {
          paymentId: payment.id,
          receiptNumber,
          landlordId: payment.landlordId,
        },
      });

      this.logger.log(`Stored receipt at ${receiptUrl}`);
    }

    // Send receipt email
    const tenant = payment.invoice?.tenancy?.tenants?.[0];
    if (tenant?.email) {
      await this.sendReceiptEmail(payment, receiptNumber, tenant);
    } else {
      this.logger.warn(`No tenant email found for payment ${paymentId}`);
    }
  }

  /**
   * Send receipt email
   */
  private async sendReceiptEmail(payment: any, receiptNumber: string, tenant: any): Promise<void> {
    const property = payment.invoice?.tenancy?.property;
    const propertyAddress = property
      ? `${property.addressLine1}, ${property.city}, ${property.postcode}`
      : 'Your Property';

    const paidDate = new Date(payment.paidAt).toLocaleDateString('en-GB');

    try {
      await this.emailService.sendEmail({
        to: tenant.email,
        subject: `Payment Receipt ${receiptNumber} - ${propertyAddress}`,
        html: this.buildReceiptEmailHtml(
          tenant.fullName || tenant.email,
          payment,
          receiptNumber,
          propertyAddress,
          paidDate,
        ),
        text: this.buildReceiptEmailText(
          tenant.fullName || tenant.email,
          payment,
          receiptNumber,
          propertyAddress,
          paidDate,
        ),
      });

      this.logger.log(`Sent receipt email ${receiptNumber} to ${tenant.email}`);
    } catch (error) {
      this.logger.error(`Error sending receipt email: ${error.message}`, error.stack);
    }
  }

  /**
   * Build receipt email HTML
   */
  private buildReceiptEmailHtml(
    tenantName: string,
    payment: any,
    receiptNumber: string,
    propertyAddress: string,
    paidDate: string,
  ): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #28a745; color: white; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
            .receipt-details { background-color: #fff; border: 1px solid #dee2e6; padding: 15px; border-radius: 5px; margin: 20px 0; }
            .amount { font-size: 32px; font-weight: bold; color: #28a745; text-align: center; margin: 20px 0; }
            .footer { font-size: 12px; color: #6c757d; margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6; }
            table { width: 100%; border-collapse: collapse; margin: 15px 0; }
            table td { padding: 8px; border-bottom: 1px solid #eee; }
            table td:first-child { font-weight: bold; width: 40%; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2 style="margin: 0;">✓ Payment Received</h2>
              <p style="margin: 5px 0 0 0;">Thank you for your payment</p>
            </div>
            
            <p>Dear ${tenantName},</p>
            
            <p>This receipt confirms that we have received your payment.</p>
            
            <div class="amount">£${payment.amountGBP.toFixed(2)}</div>
            
            <div class="receipt-details">
              <table>
                <tr>
                  <td>Receipt Number:</td>
                  <td>${receiptNumber}</td>
                </tr>
                <tr>
                  <td>Payment Date:</td>
                  <td>${paidDate}</td>
                </tr>
                <tr>
                  <td>Property:</td>
                  <td>${propertyAddress}</td>
                </tr>
                <tr>
                  <td>Invoice Number:</td>
                  <td>${payment.invoice?.number || 'N/A'}</td>
                </tr>
                <tr>
                  <td>Payment Method:</td>
                  <td>${payment.method}</td>
                </tr>
                ${payment.providerRef ? `
                <tr>
                  <td>Transaction Ref:</td>
                  <td>${payment.providerRef}</td>
                </tr>
                ` : ''}
                ${payment.feeGBP ? `
                <tr>
                  <td>Processing Fee:</td>
                  <td>£${payment.feeGBP.toFixed(2)}</td>
                </tr>
                ` : ''}
              </table>
            </div>
            
            <p>Your account has been credited with this payment. If you have any questions about this payment, please contact us.</p>
            
            <div class="footer">
              <p>This is an automated receipt. Please keep this for your records.</p>
              <p>Receipt generated on ${new Date().toLocaleDateString('en-GB')}</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Build receipt email plain text
   */
  private buildReceiptEmailText(
    tenantName: string,
    payment: any,
    receiptNumber: string,
    propertyAddress: string,
    paidDate: string,
  ): string {
    return `
PAYMENT RECEIVED - RECEIPT

Dear ${tenantName},

This receipt confirms that we have received your payment of £${payment.amountGBP.toFixed(2)}.

Receipt Details:
----------------
Receipt Number: ${receiptNumber}
Payment Date: ${paidDate}
Property: ${propertyAddress}
Invoice Number: ${payment.invoice?.number || 'N/A'}
Payment Method: ${payment.method}
${payment.providerRef ? `Transaction Ref: ${payment.providerRef}` : ''}
${payment.feeGBP ? `Processing Fee: £${payment.feeGBP.toFixed(2)}` : ''}

Your account has been credited with this payment. If you have any questions about this payment, please contact us.

---
This is an automated receipt. Please keep this for your records.
Receipt generated on ${new Date().toLocaleDateString('en-GB')}
    `.trim();
  }

  /**
   * Generate receipt HTML (similar to invoice but simpler)
   */
  private generateReceiptHtml(payment: any, receiptNumber: string): string {
    const property = payment.invoice?.tenancy?.property;
    const tenant = payment.invoice?.tenancy?.tenants?.[0];
    const paidDate = new Date(payment.paidAt).toLocaleDateString('en-GB');

    return `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <title>Receipt ${receiptNumber}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20mm; color: #333; }
            .header { text-align: center; border-bottom: 3px solid #28a745; padding-bottom: 20px; margin-bottom: 30px; }
            .header h1 { color: #28a745; font-size: 32pt; margin: 0; }
            .header h2 { color: #666; font-size: 16pt; margin: 10px 0 0 0; }
            .amount-box { background: #f0fff0; border: 2px solid #28a745; padding: 20px; text-align: center; margin: 30px 0; }
            .amount-box .label { font-size: 14pt; color: #666; }
            .amount-box .amount { font-size: 36pt; font-weight: bold; color: #28a745; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            table td { padding: 10px; border-bottom: 1px solid #ddd; }
            table td:first-child { font-weight: bold; width: 40%; }
            .footer { margin-top: 50px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; color: #666; font-size: 10pt; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>✓ PAYMENT RECEIPT</h1>
            <h2>Receipt #${receiptNumber}</h2>
          </div>

          <div class="amount-box">
            <div class="label">Amount Paid</div>
            <div class="amount">£${payment.amountGBP.toFixed(2)}</div>
          </div>

          <table>
            <tr>
              <td>Receipt Number:</td>
              <td>${receiptNumber}</td>
            </tr>
            <tr>
              <td>Payment Date:</td>
              <td>${paidDate}</td>
            </tr>
            <tr>
              <td>Tenant:</td>
              <td>${tenant?.fullName || 'N/A'}</td>
            </tr>
            <tr>
              <td>Property:</td>
              <td>${property ? `${property.addressLine1}, ${property.city}, ${property.postcode}` : 'N/A'}</td>
            </tr>
            <tr>
              <td>Invoice Number:</td>
              <td>${payment.invoice?.number || 'N/A'}</td>
            </tr>
            <tr>
              <td>Payment Method:</td>
              <td>${payment.method}</td>
            </tr>
            ${payment.providerRef ? `
            <tr>
              <td>Transaction Reference:</td>
              <td>${payment.providerRef}</td>
            </tr>
            ` : ''}
            ${payment.feeGBP ? `
            <tr>
              <td>Processing Fee:</td>
              <td>£${payment.feeGBP.toFixed(2)}</td>
            </tr>
            ` : ''}
            <tr>
              <td>Status:</td>
              <td><strong style="color: #28a745;">PAID</strong></td>
            </tr>
          </table>

          <div class="footer">
            <p>This is a computer-generated receipt. No signature required.</p>
            <p>Thank you for your payment.</p>
            <p>Generated on ${new Date().toLocaleDateString('en-GB')}</p>
          </div>
        </body>
      </html>
    `;
  }
}
