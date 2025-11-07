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
 * GoCardless Payment Provider
 * Implements Direct Debit payments via GoCardless API
 */
@Injectable()
export class GoCardlessProvider implements IPaymentProvider {
  private readonly logger = new Logger(GoCardlessProvider.name);
  readonly name = 'GOCARDLESS';
  private apiUrl: string;
  private accessToken: string;
  private webhookSecret: string;

  constructor(private configService: ConfigService) {
    const environment = this.configService.get('GOCARDLESS_ENVIRONMENT', 'sandbox');
    this.apiUrl = environment === 'live' 
      ? 'https://api.gocardless.com'
      : 'https://api-sandbox.gocardless.com';
    this.accessToken = this.configService.get('GOCARDLESS_ACCESS_TOKEN', '');
    this.webhookSecret = this.configService.get('GOCARDLESS_WEBHOOK_SECRET', '');

    if (!this.accessToken) {
      this.logger.warn('GoCardless access token not configured');
    }
  }

  /**
   * Create a customer in GoCardless
   */
  async createCustomer(data: CreateCustomerData): Promise<CustomerResult> {
    this.logger.log(`Creating customer: ${data.email}`);

    const response = await this.makeRequest('POST', '/customers', {
      customers: {
        email: data.email,
        given_name: data.name.split(' ')[0],
        family_name: data.name.split(' ').slice(1).join(' ') || data.name,
        address_line1: data.addressLine1,
        address_line2: data.addressLine2,
        city: data.city,
        postal_code: data.postcode,
        country_code: data.countryCode || 'GB',
      },
    });

    return {
      id: response.customers.id,
      email: response.customers.email,
      givenName: response.customers.given_name,
      familyName: response.customers.family_name,
      metadata: response.customers.metadata,
    };
  }

  /**
   * Get customer by ID
   */
  async getCustomer(customerId: string): Promise<CustomerResult> {
    this.logger.log(`Getting customer: ${customerId}`);

    const response = await this.makeRequest('GET', `/customers/${customerId}`);

    return {
      id: response.customers.id,
      email: response.customers.email,
      givenName: response.customers.given_name,
      familyName: response.customers.family_name,
      metadata: response.customers.metadata,
    };
  }

  /**
   * Create a mandate (Direct Debit authorization)
   */
  async createMandate(data: CreateMandateData): Promise<MandateResult> {
    this.logger.log(`Creating mandate for customer: ${data.customerId}`);

    const response = await this.makeRequest('POST', '/mandates', {
      mandates: {
        links: {
          customer: data.customerId,
        },
        scheme: data.scheme || 'bacs',
        metadata: data.metadata,
      },
    });

    return {
      id: response.mandates.id,
      status: this.mapMandateStatus(response.mandates.status),
      reference: response.mandates.reference,
      scheme: response.mandates.scheme,
      metadata: response.mandates.metadata,
      nextPossibleChargeDate: response.mandates.next_possible_charge_date 
        ? new Date(response.mandates.next_possible_charge_date) 
        : undefined,
    };
  }

  /**
   * Get mandate by ID
   */
  async getMandate(mandateId: string): Promise<MandateResult> {
    this.logger.log(`Getting mandate: ${mandateId}`);

    const response = await this.makeRequest('GET', `/mandates/${mandateId}`);

    return {
      id: response.mandates.id,
      status: this.mapMandateStatus(response.mandates.status),
      reference: response.mandates.reference,
      scheme: response.mandates.scheme,
      metadata: response.mandates.metadata,
      nextPossibleChargeDate: response.mandates.next_possible_charge_date 
        ? new Date(response.mandates.next_possible_charge_date) 
        : undefined,
    };
  }

  /**
   * Cancel a mandate
   */
  async cancelMandate(mandateId: string): Promise<MandateResult> {
    this.logger.log(`Cancelling mandate: ${mandateId}`);

    const response = await this.makeRequest('POST', `/mandates/${mandateId}/actions/cancel`);

    return {
      id: response.mandates.id,
      status: this.mapMandateStatus(response.mandates.status),
      reference: response.mandates.reference,
      scheme: response.mandates.scheme,
      metadata: response.mandates.metadata,
    };
  }

  /**
   * Create a payment
   */
  async createPayment(data: CreatePaymentData): Promise<PaymentResult> {
    this.logger.log(`Creating payment: ${data.amount} ${data.currency}`);

    const response = await this.makeRequest('POST', '/payments', {
      payments: {
        amount: data.amount,
        currency: data.currency.toUpperCase(),
        description: data.description,
        links: {
          mandate: data.mandateId,
        },
        metadata: data.metadata,
      },
    }, {
      'Idempotency-Key': data.idempotencyKey,
    });

    return {
      id: response.payments.id,
      status: this.mapPaymentStatus(response.payments.status),
      amount: parseInt(response.payments.amount, 10),
      currency: response.payments.currency,
      chargeDate: response.payments.charge_date ? new Date(response.payments.charge_date) : undefined,
      reference: response.payments.reference,
      metadata: response.payments.metadata,
    };
  }

  /**
   * Get payment by ID
   */
  async getPayment(paymentId: string): Promise<PaymentResult> {
    this.logger.log(`Getting payment: ${paymentId}`);

    const response = await this.makeRequest('GET', `/payments/${paymentId}`);

    return {
      id: response.payments.id,
      status: this.mapPaymentStatus(response.payments.status),
      amount: parseInt(response.payments.amount, 10),
      currency: response.payments.currency,
      chargeDate: response.payments.charge_date ? new Date(response.payments.charge_date) : undefined,
      reference: response.payments.reference,
      metadata: response.payments.metadata,
    };
  }

  /**
   * Cancel a payment
   */
  async cancelPayment(paymentId: string): Promise<PaymentResult> {
    this.logger.log(`Cancelling payment: ${paymentId}`);

    const response = await this.makeRequest('POST', `/payments/${paymentId}/actions/cancel`);

    return {
      id: response.payments.id,
      status: this.mapPaymentStatus(response.payments.status),
      amount: parseInt(response.payments.amount, 10),
      currency: response.payments.currency,
      reference: response.payments.reference,
      metadata: response.payments.metadata,
    };
  }

  /**
   * Create a refund
   */
  async createRefund(data: RefundData): Promise<RefundResult> {
    this.logger.log(`Creating refund for payment: ${data.paymentId}`);

    const requestBody: any = {
      refunds: {
        links: {
          payment: data.paymentId,
        },
        metadata: data.metadata,
      },
    };

    if (data.amount) {
      requestBody.refunds.amount = data.amount;
    }

    const response = await this.makeRequest('POST', '/refunds', requestBody);

    return {
      id: response.refunds.id,
      amount: parseInt(response.refunds.amount, 10),
      currency: response.refunds.currency,
      status: this.mapRefundStatus(response.refunds.status),
      reference: response.refunds.reference,
    };
  }

  /**
   * Verify webhook signature using HMAC-SHA256
   */
  verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
    try {
      const hmac = crypto.createHmac('sha256', secret);
      hmac.update(payload);
      const expectedSignature = hmac.digest('hex');
      
      // Constant-time comparison to prevent timing attacks
      return crypto.timingSafeEqual(
        Buffer.from(signature),
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
    const event = payload.events[0]; // GoCardless sends one event per webhook

    return {
      id: event.id,
      createdAt: new Date(event.created_at),
      resourceType: event.resource_type as any,
      action: event.action,
      data: event.links,
    };
  }

  /**
   * Make HTTP request to GoCardless API
   */
  private async makeRequest(
    method: string, 
    path: string, 
    body?: any,
    headers?: Record<string, string>
  ): Promise<any> {
    const url = `${this.apiUrl}${path}`;
    
    const defaultHeaders = {
      'Authorization': `Bearer ${this.accessToken}`,
      'GoCardless-Version': '2015-07-06',
      'Content-Type': 'application/json',
    };

    const response = await fetch(url, {
      method,
      headers: { ...defaultHeaders, ...headers },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`GoCardless API error: ${response.status} ${JSON.stringify(errorData)}`);
    }

    return response.json();
  }

  /**
   * Map GoCardless payment status to our generic status
   */
  private mapPaymentStatus(status: string): PaymentResult['status'] {
    const statusMap: Record<string, PaymentResult['status']> = {
      'pending_customer_approval': 'pending',
      'pending_submission': 'pending',
      'submitted': 'submitted',
      'confirmed': 'confirmed',
      'paid_out': 'paid_out',
      'cancelled': 'cancelled',
      'customer_approval_denied': 'failed',
      'failed': 'failed',
      'charged_back': 'failed',
    };

    return statusMap[status] || 'pending';
  }

  /**
   * Map GoCardless mandate status to our generic status
   */
  private mapMandateStatus(status: string): MandateResult['status'] {
    const statusMap: Record<string, MandateResult['status']> = {
      'pending_customer_approval': 'pending_customer_approval',
      'pending_submission': 'pending_submission',
      'submitted': 'submitted',
      'active': 'active',
      'failed': 'failed',
      'cancelled': 'cancelled',
      'expired': 'cancelled',
    };

    return statusMap[status] || 'pending_customer_approval';
  }

  /**
   * Map GoCardless refund status to our generic status
   */
  private mapRefundStatus(status: string): RefundResult['status'] {
    const statusMap: Record<string, RefundResult['status']> = {
      'pending_submission': 'pending_submission',
      'submitted': 'submitted',
      'paid': 'paid',
      'failed': 'failed',
      'cancelled': 'failed',
    };

    return statusMap[status] || 'pending_submission';
  }
}
