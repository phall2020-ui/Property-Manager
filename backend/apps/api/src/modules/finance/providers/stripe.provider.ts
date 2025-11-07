import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import {
  IPaymentProvider,
  CreateCustomerData,
  CreateMandateData,
  CreatePaymentData,
  CustomerResult,
  MandateResult,
  PaymentResult,
  RefundData,
  RefundResult,
  WebhookEvent,
} from './payment-provider.interface';

/**
 * Stripe Payment Provider
 * Implements card payments and SEPA Direct Debit via Stripe API
 */
@Injectable()
export class StripeProvider implements IPaymentProvider {
  private readonly logger = new Logger(StripeProvider.name);
  readonly name = 'STRIPE';
  private apiUrl = 'https://api.stripe.com/v1';
  private secretKey: string;
  private webhookSecret: string;

  constructor(private configService: ConfigService) {
    this.secretKey = this.configService.get('STRIPE_SECRET_KEY', '');
    this.webhookSecret = this.configService.get('STRIPE_WEBHOOK_SECRET', '');

    if (!this.secretKey) {
      this.logger.warn('Stripe secret key not configured');
    }
  }

  /**
   * Create a customer in Stripe
   */
  async createCustomer(data: CreateCustomerData): Promise<CustomerResult> {
    this.logger.log(`Creating customer: ${data.email}`);

    const params = new URLSearchParams({
      email: data.email,
      name: data.name,
    });

    if (data.addressLine1) {
      params.append('address[line1]', data.addressLine1);
    }
    if (data.addressLine2) {
      params.append('address[line2]', data.addressLine2);
    }
    if (data.city) {
      params.append('address[city]', data.city);
    }
    if (data.postcode) {
      params.append('address[postal_code]', data.postcode);
    }
    if (data.countryCode) {
      params.append('address[country]', data.countryCode);
    }

    const response = await this.makeRequest('POST', '/customers', params);

    return {
      id: response.id,
      email: response.email,
      givenName: response.name?.split(' ')[0],
      familyName: response.name?.split(' ').slice(1).join(' '),
      metadata: response.metadata,
    };
  }

  /**
   * Get customer by ID
   */
  async getCustomer(customerId: string): Promise<CustomerResult> {
    this.logger.log(`Getting customer: ${customerId}`);

    const response = await this.makeRequest('GET', `/customers/${customerId}`);

    return {
      id: response.id,
      email: response.email,
      givenName: response.name?.split(' ')[0],
      familyName: response.name?.split(' ').slice(1).join(' '),
      metadata: response.metadata,
    };
  }

  /**
   * Create a mandate (SetupIntent for Stripe)
   */
  async createMandate(data: CreateMandateData): Promise<MandateResult> {
    this.logger.log(`Creating mandate for customer: ${data.customerId}`);

    const params = new URLSearchParams({
      customer: data.customerId,
      'payment_method_types[]': data.scheme === 'sepa_core' ? 'sepa_debit' : 'bacs_debit',
    });

    if (data.metadata) {
      Object.entries(data.metadata).forEach(([key, value]) => {
        params.append(`metadata[${key}]`, value);
      });
    }

    const response = await this.makeRequest('POST', '/setup_intents', params);

    return {
      id: response.id,
      status: this.mapMandateStatus(response.status),
      reference: response.id,
      scheme: data.scheme,
      metadata: response.metadata,
    };
  }

  /**
   * Get mandate by ID (SetupIntent for Stripe)
   */
  async getMandate(mandateId: string): Promise<MandateResult> {
    this.logger.log(`Getting mandate: ${mandateId}`);

    const response = await this.makeRequest('GET', `/setup_intents/${mandateId}`);

    return {
      id: response.id,
      status: this.mapMandateStatus(response.status),
      reference: response.id,
      metadata: response.metadata,
    };
  }

  /**
   * Cancel a mandate
   */
  async cancelMandate(mandateId: string): Promise<MandateResult> {
    this.logger.log(`Cancelling mandate: ${mandateId}`);

    const response = await this.makeRequest('POST', `/setup_intents/${mandateId}/cancel`);

    return {
      id: response.id,
      status: this.mapMandateStatus(response.status),
      reference: response.id,
      metadata: response.metadata,
    };
  }

  /**
   * Create a payment (PaymentIntent for Stripe)
   */
  async createPayment(data: CreatePaymentData): Promise<PaymentResult> {
    this.logger.log(`Creating payment: ${data.amount} ${data.currency}`);

    const params = new URLSearchParams({
      amount: data.amount.toString(),
      currency: data.currency.toLowerCase(),
      description: data.description,
      confirm: 'true',
    });

    if (data.mandateId) {
      params.append('payment_method', data.mandateId);
    }

    if (data.metadata) {
      Object.entries(data.metadata).forEach(([key, value]) => {
        params.append(`metadata[${key}]`, value);
      });
    }

    const headers = {
      'Idempotency-Key': data.idempotencyKey,
    };

    const response = await this.makeRequest('POST', '/payment_intents', params, headers);

    return {
      id: response.id,
      status: this.mapPaymentStatus(response.status),
      amount: response.amount,
      currency: response.currency.toUpperCase(),
      reference: response.id,
      metadata: response.metadata,
    };
  }

  /**
   * Get payment by ID
   */
  async getPayment(paymentId: string): Promise<PaymentResult> {
    this.logger.log(`Getting payment: ${paymentId}`);

    const response = await this.makeRequest('GET', `/payment_intents/${paymentId}`);

    return {
      id: response.id,
      status: this.mapPaymentStatus(response.status),
      amount: response.amount,
      currency: response.currency.toUpperCase(),
      reference: response.id,
      metadata: response.metadata,
    };
  }

  /**
   * Cancel a payment
   */
  async cancelPayment(paymentId: string): Promise<PaymentResult> {
    this.logger.log(`Cancelling payment: ${paymentId}`);

    const response = await this.makeRequest('POST', `/payment_intents/${paymentId}/cancel`);

    return {
      id: response.id,
      status: this.mapPaymentStatus(response.status),
      amount: response.amount,
      currency: response.currency.toUpperCase(),
      reference: response.id,
      metadata: response.metadata,
    };
  }

  /**
   * Create a refund
   */
  async createRefund(data: RefundData): Promise<RefundResult> {
    this.logger.log(`Creating refund for payment: ${data.paymentId}`);

    const params = new URLSearchParams({
      payment_intent: data.paymentId,
    });

    if (data.amount) {
      params.append('amount', data.amount.toString());
    }

    if (data.metadata) {
      Object.entries(data.metadata).forEach(([key, value]) => {
        params.append(`metadata[${key}]`, value);
      });
    }

    const response = await this.makeRequest('POST', '/refunds', params);

    return {
      id: response.id,
      amount: response.amount,
      currency: response.currency.toUpperCase(),
      status: this.mapRefundStatus(response.status),
      reference: response.id,
    };
  }

  /**
   * Verify webhook signature using Stripe's signature verification
   */
  verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
    try {
      // Stripe signature format: t=timestamp,v1=signature,v0=signature
      const elements = signature.split(',');
      const signatureElements: Record<string, string> = {};
      
      elements.forEach(element => {
        const [key, value] = element.split('=');
        signatureElements[key] = value;
      });

      const timestamp = signatureElements.t;
      const v1Signature = signatureElements.v1;

      if (!timestamp || !v1Signature) {
        return false;
      }

      // Create signed payload
      const signedPayload = `${timestamp}.${payload}`;
      
      // Compute expected signature
      const hmac = crypto.createHmac('sha256', secret);
      hmac.update(signedPayload);
      const expectedSignature = hmac.digest('hex');

      // Constant-time comparison
      return crypto.timingSafeEqual(
        Buffer.from(v1Signature),
        Buffer.from(expectedSignature)
      );
    } catch (error) {
      this.logger.error('Error verifying webhook signature', error);
      return false;
    }
  }

  /**
   * Parse webhook event
   */
  parseWebhookEvent(payload: any): WebhookEvent {
    return {
      id: payload.id,
      createdAt: new Date(payload.created * 1000),
      resourceType: this.mapResourceType(payload.type),
      action: payload.type,
      data: payload.data.object,
    };
  }

  /**
   * Make HTTP request to Stripe API
   */
  private async makeRequest(
    method: string,
    path: string,
    body?: URLSearchParams,
    headers?: Record<string, string>
  ): Promise<any> {
    const url = `${this.apiUrl}${path}`;

    const defaultHeaders = {
      'Authorization': `Bearer ${this.secretKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    };

    const response = await fetch(url, {
      method,
      headers: { ...defaultHeaders, ...headers },
      body: body ? body.toString() : undefined,
    });

    const responseData = await response.json();

    if (!response.ok) {
      throw new Error(`Stripe API error: ${response.status} ${JSON.stringify(responseData)}`);
    }

    return responseData;
  }

  /**
   * Map Stripe payment status to our generic status
   */
  private mapPaymentStatus(status: string): PaymentResult['status'] {
    const statusMap: Record<string, PaymentResult['status']> = {
      'requires_payment_method': 'pending',
      'requires_confirmation': 'pending',
      'requires_action': 'pending',
      'processing': 'submitted',
      'requires_capture': 'confirmed',
      'succeeded': 'paid_out',
      'canceled': 'cancelled',
      'cancelled': 'cancelled',
    };

    return statusMap[status] || 'failed';
  }

  /**
   * Map Stripe mandate status to our generic status
   */
  private mapMandateStatus(status: string): MandateResult['status'] {
    const statusMap: Record<string, MandateResult['status']> = {
      'requires_payment_method': 'pending_customer_approval',
      'requires_confirmation': 'pending_submission',
      'requires_action': 'pending_customer_approval',
      'processing': 'submitted',
      'succeeded': 'active',
      'canceled': 'cancelled',
      'cancelled': 'cancelled',
    };

    return statusMap[status] || 'pending_customer_approval';
  }

  /**
   * Map Stripe refund status to our generic status
   */
  private mapRefundStatus(status: string): RefundResult['status'] {
    const statusMap: Record<string, RefundResult['status']> = {
      'pending': 'pending_submission',
      'succeeded': 'paid',
      'failed': 'failed',
      'canceled': 'failed',
      'cancelled': 'failed',
    };

    return statusMap[status] || 'pending_submission';
  }

  /**
   * Map Stripe event type to resource type
   */
  private mapResourceType(eventType: string): WebhookEvent['resourceType'] {
    if (eventType.startsWith('payment_intent')) return 'payments';
    if (eventType.startsWith('setup_intent')) return 'mandates';
    if (eventType.startsWith('refund')) return 'refunds';
    if (eventType.startsWith('payout')) return 'payouts';
    return 'payments'; // default
  }
}
