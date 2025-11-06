import { apiRequest } from './apiClient';
import { z } from 'zod';

// ========== Schemas ==========

export const InvoiceLineSchema = z.object({
  id: z.string(),
  description: z.string(),
  qty: z.number(),
  unitPrice: z.number(),
  taxRate: z.number(),
  lineTotal: z.number(),
  taxTotal: z.number(),
});

export const InvoiceSchema = z.object({
  id: z.string(),
  landlordId: z.string(),
  propertyId: z.string(),
  tenancyId: z.string(),
  tenantUserId: z.string().nullable(),
  number: z.string(),
  issueDate: z.string(),
  dueDate: z.string(),
  lineTotal: z.number(),
  taxTotal: z.number(),
  grandTotal: z.number(),
  status: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  lines: z.array(InvoiceLineSchema),
  paidAmount: z.number().optional(),
  balance: z.number().optional(),
});

export const PaymentSchema = z.object({
  id: z.string(),
  landlordId: z.string(),
  propertyId: z.string().nullable(),
  tenancyId: z.string().nullable(),
  tenantUserId: z.string().nullable(),
  method: z.string(),
  amount: z.number(),
  receivedAt: z.string(),
  externalId: z.string().nullable(),
  status: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  allocatedAmount: z.number().optional(),
  unallocatedAmount: z.number().optional(),
});

export const MandateSchema = z.object({
  id: z.string(),
  landlordId: z.string(),
  tenantUserId: z.string(),
  provider: z.string(),
  status: z.string(),
  reference: z.string().nullable(),
  createdAt: z.string(),
  activatedAt: z.string().nullable(),
  updatedAt: z.string(),
});

export const DashboardMetricsSchema = z.object({
  rentReceivedMTD: z.number(),
  outstandingInvoices: z.number(),
  arrearsTotal: z.number(),
  mandateCoverage: z.number(),
  invoiceCount: z.number(),
  nextPayouts: z.array(z.any()),
});

export const RentRollItemSchema = z.object({
  tenancyId: z.string(),
  propertyAddress: z.string(),
  tenantName: z.string(),
  expectedRent: z.number(),
  receivedRent: z.number(),
  variance: z.number(),
  hasMandate: z.boolean(),
});

export const ArrearsItemSchema = z.object({
  tenancyId: z.string(),
  propertyAddress: z.string(),
  tenantName: z.string(),
  tenantEmail: z.string().nullable(),
  tenantPhone: z.string().nullable(),
  arrearsAmount: z.number(),
  oldestInvoiceDueDate: z.string().nullable(),
  daysBucket: z.string(),
});

export const TenancyBalanceSchema = z.object({
  totalBilled: z.number(),
  totalPaid: z.number(),
  openBalance: z.number(),
  arrearsAmount: z.number(),
  lastPayment: z.object({
    amount: z.number(),
    date: z.string(),
    method: z.string(),
  }).nullable(),
});

export type Invoice = z.infer<typeof InvoiceSchema>;
export type Payment = z.infer<typeof PaymentSchema>;
export type Mandate = z.infer<typeof MandateSchema>;
export type DashboardMetrics = z.infer<typeof DashboardMetricsSchema>;
export type RentRollItem = z.infer<typeof RentRollItemSchema>;
export type ArrearsItem = z.infer<typeof ArrearsItemSchema>;
export type TenancyBalance = z.infer<typeof TenancyBalanceSchema>;

// ========== API Functions ==========

/**
 * Get finance dashboard metrics
 */
export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  const res = await apiRequest('/finance/dashboard', { method: 'GET' });
  // TODO: DashboardMetricsSchema.parse(res);
  return res as DashboardMetrics;
}

/**
 * Get rent roll for a month
 */
export async function getRentRoll(month?: string): Promise<RentRollItem[]> {
  const params = month ? `?month=${month}` : '';
  const res = await apiRequest(`/finance/rent-roll${params}`, { method: 'GET' });
  // TODO: z.array(RentRollItemSchema).parse(res);
  return res as RentRollItem[];
}

/**
 * Get arrears list
 */
export async function getArrears(bucket?: string): Promise<ArrearsItem[]> {
  const params = bucket ? `?bucket=${bucket}` : '';
  const res = await apiRequest(`/finance/arrears${params}`, { method: 'GET' });
  // TODO: z.array(ArrearsItemSchema).parse(res);
  return res as ArrearsItem[];
}

/**
 * Get arrears aging buckets
 */
export async function getArrearsAging(): Promise<Record<string, number>> {
  const res = await apiRequest('/finance/arrears/aging', { method: 'GET' });
  // TODO: z.record(z.number()).parse(res);
  return res as Record<string, number>;
}

/**
 * List invoices
 */
export async function listInvoices(params?: {
  propertyId?: string;
  tenancyId?: string;
  status?: string;
  page?: number;
  limit?: number;
}): Promise<{ data: Invoice[], total: number, page: number, limit: number, totalPages: number }> {
  const query = new URLSearchParams();
  if (params?.propertyId) query.set('propertyId', params.propertyId);
  if (params?.tenancyId) query.set('tenancyId', params.tenancyId);
  if (params?.status) query.set('status', params.status);
  if (params?.page) query.set('page', params.page.toString());
  if (params?.limit) query.set('limit', params.limit.toString());

  const res = await apiRequest(`/finance/invoices?${query}`, { method: 'GET' });
  // TODO: z.object({ data: z.array(InvoiceSchema), total: z.number(), page: z.number(), limit: z.number(), totalPages: z.number() }).parse(res);
  return res as { data: Invoice[], total: number, page: number, limit: number, totalPages: number };
}

/**
 * Get invoice by ID
 */
export async function getInvoice(id: string): Promise<Invoice> {
  const res = await apiRequest(`/finance/invoices/${id}`, { method: 'GET' });
  // TODO: InvoiceSchema.parse(res);
  return res as Invoice;
}

/**
 * Create invoice
 */
export async function createInvoice(data: {
  tenancyId: string;
  tenantUserId?: string;
  issueDate: string;
  dueDate: string;
  lines: Array<{
    description: string;
    qty: number;
    unitPrice: number;
    taxRate: number;
  }>;
}): Promise<Invoice> {
  const res = await apiRequest('/finance/invoices', {
    method: 'POST',
    body: JSON.stringify(data),
    headers: { 'Content-Type': 'application/json' },
  });
  // TODO: InvoiceSchema.parse(res);
  return res as Invoice;
}

/**
 * Void invoice
 */
export async function voidInvoice(id: string): Promise<Invoice> {
  const res = await apiRequest(`/finance/invoices/${id}/void`, { method: 'POST' });
  // TODO: InvoiceSchema.parse(res);
  return res as Invoice;
}

/**
 * List payments
 */
export async function listPayments(params?: {
  propertyId?: string;
  tenancyId?: string;
  status?: string;
  page?: number;
  limit?: number;
}): Promise<{ data: Payment[], total: number, page: number, limit: number, totalPages: number }> {
  const query = new URLSearchParams();
  if (params?.propertyId) query.set('propertyId', params.propertyId);
  if (params?.tenancyId) query.set('tenancyId', params.tenancyId);
  if (params?.status) query.set('status', params.status);
  if (params?.page) query.set('page', params.page.toString());
  if (params?.limit) query.set('limit', params.limit.toString());

  const res = await apiRequest(`/finance/payments?${query}`, { method: 'GET' });
  // TODO: z.object({ data: z.array(PaymentSchema), total: z.number(), page: z.number(), limit: z.number(), totalPages: z.number() }).parse(res);
  return res as { data: Payment[], total: number, page: number, limit: number, totalPages: number };
}

/**
 * Get payment by ID
 */
export async function getPayment(id: string): Promise<Payment> {
  const res = await apiRequest(`/finance/payments/${id}`, { method: 'GET' });
  // TODO: PaymentSchema.parse(res);
  return res as Payment;
}

/**
 * Record a payment
 */
export async function recordPayment(data: {
  tenancyId: string;
  method: string;
  amount: number;
  receivedAt: string;
  externalId?: string;
  tenantUserId?: string;
}): Promise<Payment> {
  const res = await apiRequest('/finance/payments/record', {
    method: 'POST',
    body: JSON.stringify(data),
    headers: { 'Content-Type': 'application/json' },
  });
  // TODO: PaymentSchema.parse(res);
  return res as Payment;
}

/**
 * List mandates
 */
export async function listMandates(params?: {
  tenantUserId?: string;
  status?: string;
  page?: number;
  limit?: number;
}): Promise<{ data: Mandate[], total: number, page: number, limit: number, totalPages: number }> {
  const query = new URLSearchParams();
  if (params?.tenantUserId) query.set('tenantUserId', params.tenantUserId);
  if (params?.status) query.set('status', params.status);
  if (params?.page) query.set('page', params.page.toString());
  if (params?.limit) query.set('limit', params.limit.toString());

  const res = await apiRequest(`/finance/mandates?${query}`, { method: 'GET' });
  // TODO: z.object({ data: z.array(MandateSchema), total: z.number(), page: z.number(), limit: z.number(), totalPages: z.number() }).parse(res);
  return res as { data: Mandate[], total: number, page: number, limit: number, totalPages: number };
}

/**
 * Get mandate by ID
 */
export async function getMandate(id: string): Promise<Mandate> {
  const res = await apiRequest(`/finance/mandates/${id}`, { method: 'GET' });
  // TODO: MandateSchema.parse(res);
  return res as Mandate;
}

/**
 * Create mandate
 */
export async function createMandate(data: {
  tenantUserId: string;
  provider: 'GOCARDLESS' | 'STRIPE';
}): Promise<{ mandate: Mandate, authorizationUrl: string, message: string }> {
  const res = await apiRequest('/finance/mandates', {
    method: 'POST',
    body: JSON.stringify(data),
    headers: { 'Content-Type': 'application/json' },
  });
  // TODO: z.object({ mandate: MandateSchema, authorizationUrl: z.string(), message: z.string() }).parse(res);
  return res as { mandate: Mandate, authorizationUrl: string, message: string };
}

/**
 * Get tenancy balance
 */
export async function getTenancyBalance(tenancyId: string): Promise<TenancyBalance> {
  const res = await apiRequest(`/finance/tenancies/${tenancyId}/balance`, { method: 'GET' });
  // TODO: TenancyBalanceSchema.parse(res);
  return res as TenancyBalance;
}

/**
 * Get finance settings
 */
export async function getFinanceSettings(): Promise<any> {
  const res = await apiRequest('/finance/settings', { method: 'GET' });
  // TODO: z.any().parse(res);
  return res as any;
}

/**
 * Update finance settings
 */
export async function updateFinanceSettings(data: any): Promise<any> {
  const res = await apiRequest('/finance/settings', {
    method: 'PATCH',
    body: JSON.stringify(data),
    headers: { 'Content-Type': 'application/json' },
  });
  // TODO: z.any().parse(res);
  return res as any;
}
