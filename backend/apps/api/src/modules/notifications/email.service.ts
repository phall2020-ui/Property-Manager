import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  cc?: string | string[];
  bcc?: string | string[];
  attachments?: Array<{
    filename: string;
    content?: Buffer | string;
    path?: string;
  }>;
}

/**
 * Email Service
 * Handles sending emails via SMTP
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter;
  private isConfigured: boolean;
  private defaultFrom: string;

  constructor(private configService: ConfigService) {
    this.defaultFrom = this.configService.get('SMTP_FROM_EMAIL', 'noreply@propertymanager.com');
    this.initializeTransporter();
  }

  /**
   * Initialize email transporter
   */
  private initializeTransporter(): void {
    const smtpHost = this.configService.get('SMTP_HOST');
    const smtpPort = this.configService.get('SMTP_PORT', '587');
    const smtpUser = this.configService.get('SMTP_USER');
    const smtpPassword = this.configService.get('SMTP_PASSWORD');
    const smtpSecure = this.configService.get('SMTP_SECURE', 'false') === 'true';

    if (!smtpHost || !smtpUser || !smtpPassword) {
      this.logger.warn('SMTP configuration incomplete - email sending will be disabled');
      this.isConfigured = false;
      return;
    }

    this.transporter = nodemailer.createTransport({
      host: smtpHost,
      port: parseInt(smtpPort, 10),
      secure: smtpSecure,
      auth: {
        user: smtpUser,
        pass: smtpPassword,
      },
    });

    this.isConfigured = true;
    this.logger.log('Email service initialized');
  }

  /**
   * Send an email
   */
  async sendEmail(options: EmailOptions): Promise<boolean> {
    if (!this.isConfigured) {
      this.logger.warn('Email service not configured - simulating email send');
      this.logger.log(`[SIMULATED EMAIL] To: ${options.to}, Subject: ${options.subject}`);
      return false;
    }

    try {
      const info = await this.transporter.sendMail({
        from: options.from || this.defaultFrom,
        to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
        cc: options.cc ? (Array.isArray(options.cc) ? options.cc.join(', ') : options.cc) : undefined,
        bcc: options.bcc ? (Array.isArray(options.bcc) ? options.bcc.join(', ') : options.bcc) : undefined,
        subject: options.subject,
        text: options.text,
        html: options.html,
        attachments: options.attachments,
      });

      this.logger.log(`Email sent successfully: ${info.messageId}`);
      return true;
    } catch (error) {
      this.logger.error(`Error sending email: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Send invoice notification email
   */
  async sendInvoiceEmail(
    recipientEmail: string,
    recipientName: string,
    invoiceNumber: string,
    amount: number,
    dueDate: Date,
    propertyAddress: string,
  ): Promise<boolean> {
    const subject = `New Invoice ${invoiceNumber} - Payment Due`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #4F46E5; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9fafb; }
          .invoice-details { background-color: white; padding: 15px; margin: 20px 0; border-radius: 5px; }
          .amount { font-size: 24px; font-weight: bold; color: #4F46E5; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>New Invoice</h1>
          </div>
          <div class="content">
            <p>Dear ${recipientName},</p>
            <p>A new invoice has been generated for your property at ${propertyAddress}.</p>
            
            <div class="invoice-details">
              <p><strong>Invoice Number:</strong> ${invoiceNumber}</p>
              <p><strong>Amount Due:</strong> <span class="amount">£${(amount / 100).toFixed(2)}</span></p>
              <p><strong>Due Date:</strong> ${dueDate.toLocaleDateString('en-GB')}</p>
              <p><strong>Property:</strong> ${propertyAddress}</p>
            </div>
            
            <p>Please ensure payment is made by the due date to avoid any late fees.</p>
            <p>If you have any questions, please contact your property manager.</p>
          </div>
          <div class="footer">
            <p>This is an automated message. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
      New Invoice ${invoiceNumber}
      
      Dear ${recipientName},
      
      A new invoice has been generated for your property at ${propertyAddress}.
      
      Amount Due: £${(amount / 100).toFixed(2)}
      Due Date: ${dueDate.toLocaleDateString('en-GB')}
      
      Please ensure payment is made by the due date to avoid any late fees.
    `;

    return this.sendEmail({
      to: recipientEmail,
      subject,
      html,
      text,
    });
  }

  /**
   * Send payment received notification email
   */
  async sendPaymentReceivedEmail(
    recipientEmail: string,
    recipientName: string,
    amount: number,
    paymentDate: Date,
    invoiceNumber: string,
    propertyAddress: string,
  ): Promise<boolean> {
    const subject = `Payment Received - Thank You`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #10B981; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9fafb; }
          .payment-details { background-color: white; padding: 15px; margin: 20px 0; border-radius: 5px; }
          .amount { font-size: 24px; font-weight: bold; color: #10B981; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Payment Received</h1>
          </div>
          <div class="content">
            <p>Dear ${recipientName},</p>
            <p>We have received your payment for ${propertyAddress}. Thank you!</p>
            
            <div class="payment-details">
              <p><strong>Amount Paid:</strong> <span class="amount">£${(amount / 100).toFixed(2)}</span></p>
              <p><strong>Payment Date:</strong> ${paymentDate.toLocaleDateString('en-GB')}</p>
              <p><strong>Invoice:</strong> ${invoiceNumber}</p>
              <p><strong>Property:</strong> ${propertyAddress}</p>
            </div>
            
            <p>Your payment has been successfully allocated to your account.</p>
          </div>
          <div class="footer">
            <p>This is an automated message. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
      Payment Received
      
      Dear ${recipientName},
      
      We have received your payment for ${propertyAddress}. Thank you!
      
      Amount Paid: £${(amount / 100).toFixed(2)}
      Payment Date: ${paymentDate.toLocaleDateString('en-GB')}
      Invoice: ${invoiceNumber}
    `;

    return this.sendEmail({
      to: recipientEmail,
      subject,
      html,
      text,
    });
  }

  /**
   * Send arrears reminder email
   */
  async sendArrearsReminderEmail(
    recipientEmail: string,
    recipientName: string,
    overdueAmount: number,
    daysOverdue: number,
    propertyAddress: string,
    invoiceNumbers: string[],
  ): Promise<boolean> {
    const subject = `Payment Overdue - Urgent Action Required`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #EF4444; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9fafb; }
          .arrears-details { background-color: white; padding: 15px; margin: 20px 0; border-radius: 5px; border-left: 4px solid #EF4444; }
          .amount { font-size: 24px; font-weight: bold; color: #EF4444; }
          .warning { background-color: #FEF2F2; padding: 15px; margin: 20px 0; border-radius: 5px; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⚠️ Payment Overdue</h1>
          </div>
          <div class="content">
            <p>Dear ${recipientName},</p>
            <p>This is a reminder that your payment for ${propertyAddress} is overdue.</p>
            
            <div class="arrears-details">
              <p><strong>Amount Overdue:</strong> <span class="amount">£${(overdueAmount / 100).toFixed(2)}</span></p>
              <p><strong>Days Overdue:</strong> ${daysOverdue} days</p>
              <p><strong>Property:</strong> ${propertyAddress}</p>
              <p><strong>Overdue Invoices:</strong> ${invoiceNumbers.join(', ')}</p>
            </div>
            
            <div class="warning">
              <p><strong>Important:</strong> Please arrange payment as soon as possible to avoid:</p>
              <ul>
                <li>Late payment fees</li>
                <li>Impact on your tenancy</li>
                <li>Potential legal action</li>
              </ul>
            </div>
            
            <p>If you are experiencing financial difficulties, please contact us immediately to discuss payment arrangements.</p>
          </div>
          <div class="footer">
            <p>This is an automated message. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
      Payment Overdue - Urgent Action Required
      
      Dear ${recipientName},
      
      This is a reminder that your payment for ${propertyAddress} is overdue.
      
      Amount Overdue: £${(overdueAmount / 100).toFixed(2)}
      Days Overdue: ${daysOverdue} days
      Overdue Invoices: ${invoiceNumbers.join(', ')}
      
      Please arrange payment as soon as possible to avoid late payment fees.
    `;

    return this.sendEmail({
      to: recipientEmail,
      subject,
      html,
      text,
    });
  }

  /**
   * Send welcome email to new user with credentials
   */
  async sendWelcomeEmail(
    recipientEmail: string,
    recipientName: string,
    password: string,
    loginUrl?: string,
  ): Promise<boolean> {
    const subject = `Welcome to Property Manager - Your Account is Ready`;
    const loginLink = loginUrl || 'https://propertymanager.com/login';
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #4F46E5; color: white; padding: 30px; text-align: center; }
          .content { padding: 30px; background-color: #f9fafb; }
          .credentials { background-color: white; padding: 20px; margin: 20px 0; border-radius: 5px; border-left: 4px solid #4F46E5; }
          .credential-item { margin: 10px 0; }
          .credential-label { font-weight: bold; color: #4F46E5; }
          .credential-value { font-family: monospace; background-color: #f3f4f6; padding: 5px 10px; border-radius: 3px; display: inline-block; margin-left: 10px; }
          .button { display: inline-block; background-color: #4F46E5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .warning { background-color: #FEF2F2; padding: 15px; margin: 20px 0; border-radius: 5px; border-left: 4px solid #EF4444; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Welcome to Property Manager!</h1>
          </div>
          <div class="content">
            <p>Dear ${recipientName},</p>
            <p>Your account has been successfully created. You can now access the Property Manager platform with the credentials below.</p>
            
            <div class="credentials">
              <div class="credential-item">
                <span class="credential-label">Email:</span>
                <span class="credential-value">${recipientEmail}</span>
              </div>
              <div class="credential-item">
                <span class="credential-label">Password:</span>
                <span class="credential-value">${password}</span>
              </div>
            </div>
            
            <div class="warning">
              <p><strong>⚠️ Important Security Notice:</strong></p>
              <p>Please change your password immediately after your first login for security purposes.</p>
            </div>
            
            <div style="text-align: center;">
              <a href="${loginLink}" class="button">Login to Your Account</a>
            </div>
            
            <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
          </div>
          <div class="footer">
            <p>This is an automated message. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
      Welcome to Property Manager!
      
      Dear ${recipientName},
      
      Your account has been successfully created. You can now access the Property Manager platform with the credentials below.
      
      Email: ${recipientEmail}
      Password: ${password}
      
      ⚠️ IMPORTANT: Please change your password immediately after your first login for security purposes.
      
      Login at: ${loginLink}
      
      If you have any questions or need assistance, please contact our support team.
    `;

    return this.sendEmail({
      to: recipientEmail,
      subject,
      html,
      text,
    });
  }
}
