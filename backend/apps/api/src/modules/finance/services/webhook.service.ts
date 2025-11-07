import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { GoCardlessProvider } from '../providers/gocardless.provider';
import { StripeProvider } from '../providers/stripe.provider';
import { PaymentService } from './payment.service';
import { MandateService } from './mandate.service';

/**
 * Webhook Handler Service
 * Processes webhooks from payment providers with signature verification
 */
@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
    private goCardlessProvider: GoCardlessProvider,
    private stripeProvider: StripeProvider,
    private paymentService: PaymentService,
    private mandateService: MandateService,
  ) {}

  /**
   * Process GoCardless webhook
   */
  async handleGoCardlessWebhook(
    payload: string,
    signature: string,
  ): Promise<{ received: boolean }> {
    this.logger.log('Processing GoCardless webhook');

    // Verify signature
    const webhookSecret = this.configService.get('GOCARDLESS_WEBHOOK_SECRET', '');
    const isValid = this.goCardlessProvider.verifyWebhookSignature(
      payload,
      signature,
      webhookSecret,
    );

    if (!isValid) {
      this.logger.error('Invalid GoCardless webhook signature');
      throw new BadRequestException('Invalid webhook signature');
    }

    // Parse payload
    const parsedPayload = JSON.parse(payload);
    const event = this.goCardlessProvider.parseWebhookEvent(parsedPayload);

    // Log webhook event
    await this.logWebhookEvent('GOCARDLESS', event.id, event.action, parsedPayload);

    // Process event based on resource type
    await this.processWebhookEvent('GOCARDLESS', event);

    return { received: true };
  }

  /**
   * Process Stripe webhook
   */
  async handleStripeWebhook(
    payload: string,
    signature: string,
  ): Promise<{ received: boolean }> {
    this.logger.log('Processing Stripe webhook');

    // Verify signature
    const webhookSecret = this.configService.get('STRIPE_WEBHOOK_SECRET', '');
    const isValid = this.stripeProvider.verifyWebhookSignature(
      payload,
      signature,
      webhookSecret,
    );

    if (!isValid) {
      this.logger.error('Invalid Stripe webhook signature');
      throw new BadRequestException('Invalid webhook signature');
    }

    // Parse payload
    const parsedPayload = JSON.parse(payload);
    const event = this.stripeProvider.parseWebhookEvent(parsedPayload);

    // Log webhook event
    await this.logWebhookEvent('STRIPE', event.id, event.action, parsedPayload);

    // Process event based on resource type
    await this.processWebhookEvent('STRIPE', event);

    return { received: true };
  }

  /**
   * Process webhook event based on resource type and action
   */
  private async processWebhookEvent(provider: string, event: any): Promise<void> {
    try {
      switch (event.resourceType) {
        case 'payments':
          await this.handlePaymentEvent(provider, event);
          break;
        case 'mandates':
          await this.handleMandateEvent(provider, event);
          break;
        case 'refunds':
          await this.handleRefundEvent(provider, event);
          break;
        case 'payouts':
          await this.handlePayoutEvent(provider, event);
          break;
        default:
          this.logger.warn(`Unknown resource type: ${event.resourceType}`);
      }
    } catch (error) {
      this.logger.error(`Error processing webhook event: ${error.message}`, error.stack);
      // Don't throw - we want to acknowledge receipt even if processing fails
      // Failed events can be retried via the webhook log
    }
  }

  /**
   * Handle payment events
   */
  private async handlePaymentEvent(provider: string, event: any): Promise<void> {
    this.logger.log(`Processing payment event: ${event.action}`);

    const paymentId = event.data.payment || event.data.id;

    // Update payment status in database
    const payment = await this.prisma.payment.findFirst({
      where: { providerRef: paymentId },
    });

    if (!payment) {
      this.logger.warn(`Payment not found: ${paymentId}`);
      return;
    }

    // Map event action to payment status
    const statusMap: Record<string, string> = {
      'confirmed': 'SETTLED',
      'paid_out': 'SETTLED',
      'payment_intent.succeeded': 'SETTLED',
      'failed': 'FAILED',
      'payment_intent.payment_failed': 'FAILED',
      'cancelled': 'FAILED',
      'payment_intent.canceled': 'FAILED',
    };

    const newStatus = statusMap[event.action] || payment.status;

    if (newStatus !== payment.status) {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: newStatus },
      });

      this.logger.log(`Updated payment ${payment.id} status to ${newStatus}`);

      // Update invoice status
      await this.paymentService['invoiceService'].updateInvoiceStatus(payment.invoiceId);
    }
  }

  /**
   * Handle mandate events
   */
  private async handleMandateEvent(provider: string, event: any): Promise<void> {
    this.logger.log(`Processing mandate event: ${event.action}`);

    const mandateId = event.data.mandate || event.data.id;

    // Update mandate status in database
    const mandate = await this.prisma.mandate.findFirst({
      where: { providerRef: mandateId },
    });

    if (!mandate) {
      this.logger.warn(`Mandate not found: ${mandateId}`);
      return;
    }

    // Map event action to mandate status
    const statusMap: Record<string, string> = {
      'active': 'ACTIVE',
      'setup_intent.succeeded': 'ACTIVE',
      'submitted': 'ACTIVE',
      'failed': 'FAILED',
      'setup_intent.setup_failed': 'FAILED',
      'cancelled': 'FAILED',
      'setup_intent.canceled': 'FAILED',
    };

    const newStatus = statusMap[event.action] || mandate.status;

    if (newStatus !== mandate.status) {
      const updateData: any = { status: newStatus };
      
      if (newStatus === 'ACTIVE') {
        updateData.activatedAt = new Date();
      }

      await this.prisma.mandate.update({
        where: { id: mandate.id },
        data: updateData,
      });

      this.logger.log(`Updated mandate ${mandate.id} status to ${newStatus}`);
    }
  }

  /**
   * Handle refund events
   */
  private async handleRefundEvent(provider: string, event: any): Promise<void> {
    this.logger.log(`Processing refund event: ${event.action}`);
    
    // Refund handling can be added here if needed
    // For now, just log the event
    this.logger.log(`Refund event received: ${JSON.stringify(event)}`);
  }

  /**
   * Handle payout events
   */
  private async handlePayoutEvent(provider: string, event: any): Promise<void> {
    this.logger.log(`Processing payout event: ${event.action}`);
    
    // Payout handling can be added here if needed
    // For now, just log the event
    this.logger.log(`Payout event received: ${JSON.stringify(event)}`);
  }

  /**
   * Log webhook event to database
   */
  private async logWebhookEvent(
    provider: string,
    eventId: string,
    action: string,
    payload: any,
  ): Promise<void> {
    try {
      await this.prisma.$executeRaw`
        INSERT INTO WebhookLog (id, provider, eventId, action, payload, createdAt)
        VALUES (
          ${this.generateId()},
          ${provider},
          ${eventId},
          ${action},
          ${JSON.stringify(payload)},
          ${new Date()}
        )
      `;
    } catch (error) {
      this.logger.error('Error logging webhook event', error);
      // Don't throw - logging failure shouldn't stop webhook processing
    }
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
