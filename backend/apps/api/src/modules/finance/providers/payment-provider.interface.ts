/**
 * Payment Provider Interface
 * Abstraction for payment providers like GoCardless, Stripe
 */

export interface CreateCustomerData {
  email: string;
  name: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  postcode?: string;
  countryCode?: string;
}

export interface CreateMandateData {
  customerId: string;
  scheme?: 'bacs' | 'sepa_core' | 'ach';
  metadata?: Record<string, string>;
}

export interface CreatePaymentData {
  amount: number; // Amount in smallest currency unit (pence)
  currency: string;
  mandateId?: string;
  description: string;
  metadata?: Record<string, string>;
  idempotencyKey: string;
}

export interface PaymentResult {
  id: string;
  status: 'pending' | 'submitted' | 'confirmed' | 'paid_out' | 'cancelled' | 'failed';
  amount: number;
  currency: string;
  chargeDate?: Date;
  reference?: string;
  metadata?: Record<string, string>;
}

export interface MandateResult {
  id: string;
  status: 'pending_customer_approval' | 'pending_submission' | 'submitted' | 'active' | 'failed' | 'cancelled';
  reference?: string;
  scheme?: string;
  metadata?: Record<string, string>;
  nextPossibleChargeDate?: Date;
}

export interface CustomerResult {
  id: string;
  email: string;
  givenName?: string;
  familyName?: string;
  metadata?: Record<string, string>;
}

export interface RefundData {
  paymentId: string;
  amount?: number; // Partial refund if specified
  metadata?: Record<string, string>;
}

export interface RefundResult {
  id: string;
  amount: number;
  currency: string;
  status: 'pending_submission' | 'submitted' | 'paid' | 'failed';
  reference?: string;
}

export interface WebhookEvent {
  id: string;
  createdAt: Date;
  resourceType: 'payments' | 'mandates' | 'refunds' | 'payouts';
  action: string;
  data: any;
}

/**
 * Payment Provider Interface
 */
export interface IPaymentProvider {
  /**
   * Provider identifier
   */
  readonly name: string;

  /**
   * Create a customer in the payment provider
   */
  createCustomer(data: CreateCustomerData): Promise<CustomerResult>;

  /**
   * Get customer by ID
   */
  getCustomer(customerId: string): Promise<CustomerResult>;

  /**
   * Create a mandate (Direct Debit authorization)
   */
  createMandate(data: CreateMandateData): Promise<MandateResult>;

  /**
   * Get mandate by ID
   */
  getMandate(mandateId: string): Promise<MandateResult>;

  /**
   * Cancel a mandate
   */
  cancelMandate(mandateId: string): Promise<MandateResult>;

  /**
   * Create a payment
   */
  createPayment(data: CreatePaymentData): Promise<PaymentResult>;

  /**
   * Get payment by ID
   */
  getPayment(paymentId: string): Promise<PaymentResult>;

  /**
   * Cancel a payment (before submission)
   */
  cancelPayment(paymentId: string): Promise<PaymentResult>;

  /**
   * Create a refund
   */
  createRefund(data: RefundData): Promise<RefundResult>;

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload: string, signature: string, secret: string): boolean;

  /**
   * Parse webhook event
   */
  parseWebhookEvent(payload: any): WebhookEvent;
}
