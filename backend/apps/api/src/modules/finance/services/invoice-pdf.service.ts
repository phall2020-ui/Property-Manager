import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { StorageService } from '../../../common/storage/storage.service';
// Note: Puppeteer would be imported here in production:
// import puppeteer from 'puppeteer';

/**
 * Invoice PDF Service
 * Generates PDF invoices from HTML templates
 * 
 * Note: This implementation generates HTML. In production, uncomment the Puppeteer
 * code to generate actual PDFs. The HTML can be tested in a browser.
 */
@Injectable()
export class InvoicePdfService {
  private readonly logger = new Logger(InvoicePdfService.name);
  private readonly enabled: boolean;

  constructor(
    private prisma: PrismaService,
    private storageService: StorageService,
    private configService: ConfigService,
  ) {
    this.enabled = this.configService.get('PDF_GENERATION_ENABLED', 'true') === 'true';
    if (!this.enabled) {
      this.logger.warn('PDF generation is disabled');
    }
  }

  /**
   * Generate and store PDF for an invoice
   */
  async generateInvoicePdf(invoiceId: string, landlordId: string): Promise<string> {
    if (!this.enabled) {
      this.logger.warn('PDF generation is disabled, returning placeholder URL');
      return 'https://example.com/placeholder.pdf';
    }

    // Fetch invoice with all related data
    const invoice = await this.prisma.invoice.findFirst({
      where: {
        id: invoiceId,
        landlordId,
      },
      include: {
        lines: true,
        tenancy: {
          include: {
            property: true,
            tenants: true,
          },
        },
        allocations: {
          include: {
            payment: true,
          },
        },
      },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    // Generate HTML
    const html = this.generateInvoiceHtml(invoice);

    // In production, use Puppeteer to generate PDF:
    // const pdfBuffer = await this.htmlToPdf(html);
    
    // For now, store the HTML (can be viewed in browser)
    const htmlBuffer = Buffer.from(html, 'utf-8');

    // Generate storage key
    const key = this.storageService.generateInvoicePdfKey(
      landlordId,
      invoice.number,
    );

    // Upload to storage
    const url = await this.storageService.upload({
      key,
      body: htmlBuffer,
      contentType: 'text/html', // In production: 'application/pdf'
      metadata: {
        invoiceId: invoice.id,
        invoiceNumber: invoice.number,
        landlordId,
      },
    });

    // Update invoice with PDF URL
    await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: { pdfUrl: url },
    });

    this.logger.log(`Generated PDF for invoice ${invoice.number}`);

    return url;
  }

  /**
   * Convert HTML to PDF using Puppeteer
   * Uncomment in production when Puppeteer/Chrome is available
   */
  /*
  private async htmlToPdf(html: string): Promise<Buffer> {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20mm',
          right: '15mm',
          bottom: '20mm',
          left: '15mm',
        },
      });

      return pdfBuffer;
    } finally {
      await browser.close();
    }
  }
  */

  /**
   * Generate HTML invoice template
   */
  private generateInvoiceHtml(invoice: any): string {
    const property = invoice.tenancy?.property;
    const tenant = invoice.tenancy?.tenants?.[0];
    
    // Calculate totals
    const lineTotal = invoice.lines.reduce((sum: number, line: any) => 
      sum + line.lineTotal, 0
    );
    const taxTotal = invoice.lines.reduce((sum: number, line: any) => 
      sum + line.taxTotal, 0
    );
    const grandTotal = lineTotal + taxTotal;

    const paidAmount = invoice.allocations.reduce((sum: number, alloc: any) => 
      sum + alloc.amount, 0
    );
    const balance = grandTotal - paidAmount;

    const issueDate = new Date(invoice.issueDate || invoice.createdAt).toLocaleDateString('en-GB');
    const dueDate = new Date(invoice.dueAt).toLocaleDateString('en-GB');

    return `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Invoice ${invoice.number}</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            
            body {
              font-family: 'Arial', 'Helvetica', sans-serif;
              font-size: 11pt;
              line-height: 1.5;
              color: #333;
              background: #fff;
              padding: 20mm;
            }
            
            .invoice-header {
              display: flex;
              justify-content: space-between;
              margin-bottom: 30px;
              padding-bottom: 20px;
              border-bottom: 2px solid #0066cc;
            }
            
            .company-info h1 {
              font-size: 24pt;
              color: #0066cc;
              margin-bottom: 5px;
            }
            
            .invoice-meta {
              text-align: right;
            }
            
            .invoice-meta h2 {
              font-size: 20pt;
              color: #0066cc;
              margin-bottom: 10px;
            }
            
            .invoice-meta p {
              margin: 3px 0;
            }
            
            .parties {
              display: flex;
              justify-content: space-between;
              margin: 30px 0;
            }
            
            .party {
              width: 45%;
            }
            
            .party h3 {
              font-size: 12pt;
              margin-bottom: 10px;
              color: #555;
            }
            
            .party-content {
              background: #f5f5f5;
              padding: 15px;
              border-radius: 5px;
            }
            
            table {
              width: 100%;
              border-collapse: collapse;
              margin: 30px 0;
            }
            
            table thead {
              background: #0066cc;
              color: white;
            }
            
            table th {
              padding: 12px;
              text-align: left;
              font-weight: bold;
            }
            
            table td {
              padding: 10px 12px;
              border-bottom: 1px solid #ddd;
            }
            
            table tbody tr:hover {
              background: #f9f9f9;
            }
            
            .text-right {
              text-align: right;
            }
            
            .totals {
              margin-left: auto;
              width: 300px;
              margin-top: 20px;
            }
            
            .totals-row {
              display: flex;
              justify-content: space-between;
              padding: 8px 0;
              border-bottom: 1px solid #ddd;
            }
            
            .totals-row.grand-total {
              font-size: 14pt;
              font-weight: bold;
              border-top: 2px solid #0066cc;
              border-bottom: 2px solid #0066cc;
              margin-top: 10px;
              padding-top: 15px;
              color: #0066cc;
            }
            
            .totals-row.balance {
              background: ${balance > 0 ? '#fff3cd' : '#d4edda'};
              padding: 10px;
              margin-top: 5px;
              border-radius: 5px;
              font-weight: bold;
            }
            
            .footer {
              margin-top: 50px;
              padding-top: 20px;
              border-top: 1px solid #ddd;
              font-size: 9pt;
              color: #666;
              text-align: center;
            }
            
            .payment-info {
              background: #f0f8ff;
              padding: 15px;
              margin: 20px 0;
              border-left: 4px solid #0066cc;
            }
            
            .status-badge {
              display: inline-block;
              padding: 5px 15px;
              border-radius: 20px;
              font-size: 10pt;
              font-weight: bold;
              text-transform: uppercase;
            }
            
            .status-paid { background: #d4edda; color: #155724; }
            .status-due { background: #fff3cd; color: #856404; }
            .status-late { background: #f8d7da; color: #721c24; }
          </style>
        </head>
        <body>
          <div class="invoice-header">
            <div class="company-info">
              <h1>Property Manager</h1>
              <p><strong>Invoice</strong></p>
            </div>
            <div class="invoice-meta">
              <h2>INVOICE</h2>
              <p><strong>Invoice #:</strong> ${invoice.number}</p>
              <p><strong>Issue Date:</strong> ${issueDate}</p>
              <p><strong>Due Date:</strong> ${dueDate}</p>
              <p><span class="status-badge status-${invoice.status.toLowerCase()}">${invoice.status}</span></p>
            </div>
          </div>

          <div class="parties">
            <div class="party">
              <h3>Bill To:</h3>
              <div class="party-content">
                <p><strong>${tenant?.fullName || 'Tenant'}</strong></p>
                <p>${tenant?.email || ''}</p>
                ${property ? `
                  <p style="margin-top: 10px;">
                    <strong>Property:</strong><br>
                    ${property.addressLine1}${property.addressLine2 ? ', ' + property.addressLine2 : ''}<br>
                    ${property.city}, ${property.postcode}
                  </p>
                ` : ''}
              </div>
            </div>
            <div class="party">
              <h3>From:</h3>
              <div class="party-content">
                <p><strong>Property Manager</strong></p>
                <p>Property Management Services</p>
                <p>London, UK</p>
              </div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th class="text-right">Quantity</th>
                <th class="text-right">Unit Price</th>
                <th class="text-right">Tax Rate</th>
                <th class="text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${invoice.lines.map((line: any) => `
                <tr>
                  <td>${line.description}</td>
                  <td class="text-right">${line.qty}</td>
                  <td class="text-right">£${line.unitPrice.toFixed(2)}</td>
                  <td class="text-right">${(line.taxRate * 100).toFixed(1)}%</td>
                  <td class="text-right">£${(line.lineTotal + line.taxTotal).toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="totals">
            <div class="totals-row">
              <span>Subtotal:</span>
              <span>£${lineTotal.toFixed(2)}</span>
            </div>
            <div class="totals-row">
              <span>Tax:</span>
              <span>£${taxTotal.toFixed(2)}</span>
            </div>
            <div class="totals-row grand-total">
              <span>Total:</span>
              <span>£${grandTotal.toFixed(2)}</span>
            </div>
            ${paidAmount > 0 ? `
              <div class="totals-row">
                <span>Paid:</span>
                <span>-£${paidAmount.toFixed(2)}</span>
              </div>
            ` : ''}
            <div class="totals-row balance">
              <span>Balance Due:</span>
              <span>£${balance.toFixed(2)}</span>
            </div>
          </div>

          ${invoice.notes ? `
            <div class="payment-info">
              <strong>Notes:</strong>
              <p>${invoice.notes}</p>
            </div>
          ` : ''}

          <div class="payment-info">
            <strong>Payment Instructions:</strong>
            <p>Please make payment to the account details provided separately.</p>
            <p>Reference: ${invoice.reference || invoice.number}</p>
          </div>

          <div class="footer">
            <p>This is a computer-generated invoice. No signature required.</p>
            <p>Thank you for your business.</p>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Regenerate PDF for an existing invoice (idempotent)
   */
  async regenerateInvoicePdf(invoiceId: string, landlordId: string): Promise<string> {
    // Delete old PDF if exists
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, landlordId },
      select: { pdfUrl: true, number: true },
    });

    if (invoice?.pdfUrl) {
      const key = this.storageService.generateInvoicePdfKey(landlordId, invoice.number);
      await this.storageService.delete(key).catch((err) => {
        this.logger.warn(`Failed to delete old PDF: ${err.message}`);
      });
    }

    // Generate new PDF
    return this.generateInvoicePdf(invoiceId, landlordId);
  }
}
