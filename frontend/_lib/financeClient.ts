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
  return apiRequest<DashboardMetrics>('/finance/dashboard', {
    method: 'GET',
  });
}

/**
 * Get rent roll for a month
 */
export async function getRentRoll(month?: string): Promise<RentRollItem[]> {
  const params = month ? `?month=${month}` : '';
  return apiRequest<RentRollItem[]>(`/finance/rent-roll${params}`, {
    method: 'GET',
  });
}

/**
 * Get arrears list
 */
export async function getArrears(bucket?: string): Promise<ArrearsItem[]> {
  const params = bucket ? `?bucket=${bucket}` : '';
  return apiRequest<ArrearsItem[]>(`/finance/arrears${params}`, {
    method: 'GET',
  });
}

/**
 * Get arrears aging buckets
 */
export async function getArrearsAging() {
  return apiRequest<Record<string, number>>('/finance/arrears/aging', {
    method: 'GET',
  });
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

  return apiRequest<{
    data: Invoice[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }>(`/finance/invoices?${query}`, {
    method: 'GET',
  });
}

/**
 * Get invoice by ID
 */
export async function getInvoice(id: string) {
  return apiRequest<Invoice>(`/finance/invoices/${id}`, {
    method: 'GET',
  });
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
  return apiRequest<Invoice>('/finance/invoices', {
    method: 'POST',
    body: JSON.stringify(data),
    headers: {
      'Content-Type': 'application/json',
    },
  });
  // TODO: InvoiceSchema.parse(res);
  return res as Invoice;
}

/**
 * Void invoice
 */
export async function voidInvoice(id: string) {
  return apiRequest<Invoice>(`/finance/invoices/${id}/void`, {
    method: 'POST',
  });
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

  return apiRequest<{
    data: Payment[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }>(`/finance/payments?${query}`, {
    method: 'GET',
  });
}

/**
 * Get payment by ID
 */
export async function getPayment(id: string) {
  return apiRequest<Payment>(`/finance/payments/${id}`, {
    method: 'GET',
  });
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
  return apiRequest<Payment>('/finance/payments/record', {
    method: 'POST',
    body: JSON.stringify(data),
    headers: {
      'Content-Type': 'application/json',
    },
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

  return apiRequest<{
    data: Mandate[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }>(`/finance/mandates?${query}`, {
    method: 'GET',
  });
}

/**
 * Get mandate by ID
 */
export async function getMandate(id: string) {
  return apiRequest<Mandate>(`/finance/mandates/${id}`, {
    method: 'GET',
  });
}

/**
 * Create mandate
 */
export async function createMandate(data: {
  tenantUserId: string;
  provider: 'GOCARDLESS' | 'STRIPE';
}) {
  return apiRequest<{
    mandate: Mandate;
    authorizationUrl: string;
    message: string;
  }>('/finance/mandates', {
    method: 'POST',
    body: JSON.stringify(data),
    headers: {
      'Content-Type': 'application/json',
    },
  });
  // TODO: z.object({ mandate: MandateSchema, authorizationUrl: z.string(), message: z.string() }).parse(res);
  return res as { mandate: Mandate, authorizationUrl: string, message: string };
}

/**
 * Get tenancy balance
 */
export async function getTenancyBalance(tenancyId: string) {
  return apiRequest<TenancyBalance>(`/finance/tenancies/${tenancyId}/balance`, {
    method: 'GET',
  });
}

/**
 * Get finance settings
 */
export async function getFinanceSettings() {
  return apiRequest<any>('/finance/settings', {
    method: 'GET',
  });
}

/**
 * Update finance settings
 */
export async function updateFinanceSettings(data: any) {
  return apiRequest<any>('/finance/settings', {
    method: 'PATCH',
    body: JSON.stringify(data),
    headers: {
      'Content-Type': 'application/json',
    },
  });
  // TODO: z.any().parse(res);
  return res as any;
}
