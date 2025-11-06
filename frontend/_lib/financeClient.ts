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
export async function getDashboardMetrics() {
  const res = await apiRequest('/finance/dashboard', {
    method: 'GET',
  });
  // TODO: Optional runtime validation with DashboardMetricsSchema.parse(res)
  return res;
}

/**
 * Get rent roll for a month
 */
export async function getRentRoll(month?: string): Promise<RentRollItem[]> {
  const params = month ? `?month=${month}` : '';
  const res = await apiRequest(`/finance/rent-roll${params}`, {
    method: 'GET',
  });
  // TODO: Optional runtime validation with z.array(RentRollItemSchema).parse(res)
  return res;
}

/**
 * Get arrears list
 */
export async function getArrears(bucket?: string): Promise<ArrearsItem[]> {
  const params = bucket ? `?bucket=${bucket}` : '';
  const res = await apiRequest(`/finance/arrears${params}`, {
    method: 'GET',
  });
  // TODO: Optional runtime validation with z.array(ArrearsItemSchema).parse(res)
  return res;
}

/**
 * Get arrears aging buckets
 */
export async function getArrearsAging() {
  const res = await apiRequest('/finance/arrears/aging', {
    method: 'GET',
  });
  // TODO: Optional runtime validation with z.record(z.number()).parse(res)
  return res;
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

  const res = await apiRequest(`/finance/invoices?${query}`, {
    method: 'GET',
  });
  // TODO: Optional runtime validation with z.object({...}).parse(res)
  return res;
}

/**
 * Get invoice by ID
 */
export async function getInvoice(id: string) {
  const res = await apiRequest(`/finance/invoices/${id}`, {
    method: 'GET',
  });
  // TODO: Optional runtime validation with InvoiceSchema.parse(res)
  return res;
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
}) {
  const res = await apiRequest('/finance/invoices', {
    method: 'POST',
    body: JSON.stringify(data),
    headers: { 'Content-Type': 'application/json' },
  });
  // TODO: Optional runtime validation with InvoiceSchema.parse(res)
  return res;
}

/**
 * Void invoice
 */
export async function voidInvoice(id: string) {
  const res = await apiRequest(`/finance/invoices/${id}/void`, {
    method: 'POST',
  });
  // TODO: Optional runtime validation with InvoiceSchema.parse(res)
  return res;
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

  const res = await apiRequest(`/finance/payments?${query}`, {
    method: 'GET',
  });
  // TODO: Optional runtime validation with z.object({...}).parse(res)
  return res;
}

/**
 * Get payment by ID
 */
export async function getPayment(id: string) {
  const res = await apiRequest(`/finance/payments/${id}`, {
    method: 'GET',
  });
  // TODO: Optional runtime validation with PaymentSchema.parse(res)
  return res;
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
}) {
  const res = await apiRequest('/finance/payments/record', {
    method: 'POST',
    body: JSON.stringify(data),
    headers: { 'Content-Type': 'application/json' },
  });
  // TODO: Optional runtime validation with PaymentSchema.parse(res)
  return res;
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

  const res = await apiRequest(`/finance/mandates?${query}`, {
    method: 'GET',
  });
  // TODO: Optional runtime validation with z.object({...}).parse(res)
  return res;
}

/**
 * Get mandate by ID
 */
export async function getMandate(id: string) {
  const res = await apiRequest(`/finance/mandates/${id}`, {
    method: 'GET',
  });
  // TODO: Optional runtime validation with MandateSchema.parse(res)
  return res;
}

/**
 * Create mandate
 */
export async function createMandate(data: {
  tenantUserId: string;
  provider: 'GOCARDLESS' | 'STRIPE';
}) {
  const res = await apiRequest('/finance/mandates', {
    method: 'POST',
    body: JSON.stringify(data),
    headers: { 'Content-Type': 'application/json' },
  });
  // TODO: Optional runtime validation with z.object({...}).parse(res)
  return res;
}

/**
 * Get tenancy balance
 */
export async function getTenancyBalance(tenancyId: string) {
  const res = await apiRequest(`/finance/tenancies/${tenancyId}/balance`, {
    method: 'GET',
  });
  // TODO: Optional runtime validation with TenancyBalanceSchema.parse(res)
  return res;
}

/**
 * Get finance settings
 */
export async function getFinanceSettings() {
  const res = await apiRequest('/finance/settings', {
    method: 'GET',
  });
  // TODO: Optional runtime validation with z.any().parse(res)
  return res;
}

/**
 * Update finance settings
 */
export async function updateFinanceSettings(data: any) {
  const res = await apiRequest('/finance/settings', {
    method: 'PATCH',
    body: JSON.stringify(data),
    headers: { 'Content-Type': 'application/json' },
  });
  // TODO: Optional runtime validation with z.any().parse(res)
  return res;
}
