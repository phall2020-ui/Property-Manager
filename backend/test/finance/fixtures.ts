/**
 * Finance test fixtures and factories
 */

export const createMockInvoice = (overrides = {}) => ({
  id: 'inv-123',
  landlordId: 'landlord-1',
  propertyId: 'prop-1',
  tenancyId: 'tenancy-1',
  tenantUserId: 'tenant-1',
  number: 'INV-2025-000001',
  reference: '2025-01 Rent',
  periodStart: new Date('2025-01-01'),
  periodEnd: new Date('2025-01-31'),
  issueDate: new Date('2025-01-01'),
  dueAt: new Date('2025-01-07'),
  dueDate: new Date('2025-01-07'),
  amountGBP: 1200.0,
  amount: 1200.0,
  status: 'DUE',
  notes: null,
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
  ...overrides,
});

export const createMockOverdueInvoice = (overrides = {}) =>
  createMockInvoice({
    status: 'LATE',
    dueAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
    ...overrides,
  });

export const createMockPartiallyPaidInvoice = (overrides = {}) =>
  createMockInvoice({
    status: 'PART_PAID',
    ...overrides,
  });

export const createMockPaidInvoice = (overrides = {}) =>
  createMockInvoice({
    status: 'PAID',
    ...overrides,
  });

export const createMockPayment = (overrides = {}) => ({
  id: 'pay-123',
  landlordId: 'landlord-1',
  propertyId: 'prop-1',
  tenancyId: 'tenancy-1',
  invoiceId: 'inv-123',
  tenantUserId: 'tenant-1',
  amountGBP: 1200.0,
  amount: 1200.0,
  method: 'BANK_TRANSFER',
  provider: 'TEST',
  providerRef: 'test-ref-123',
  status: 'SETTLED',
  feeGBP: 0,
  vatGBP: 0,
  paidAt: new Date('2025-01-07'),
  receivedAt: new Date('2025-01-07'),
  createdAt: new Date('2025-01-07'),
  updatedAt: new Date('2025-01-07'),
  ...overrides,
});

export const createMockTenancy = (overrides = {}) => ({
  id: 'tenancy-1',
  propertyId: 'prop-1',
  tenantOrgId: 'tenant-org-1',
  startDate: new Date('2025-01-01'),
  endDate: new Date('2026-01-01'),
  rentPcm: 1200.0,
  depositPcm: 1200.0,
  status: 'ACTIVE',
  property: {
    id: 'prop-1',
    ownerOrgId: 'landlord-1',
    addressLine1: '123 Test St',
    city: 'London',
    postcode: 'SW1A 1AA',
  },
  ...overrides,
});

export const createMockFinanceSettings = (overrides = {}) => ({
  id: 'settings-1',
  landlordId: 'landlord-1',
  invoicePrefix: 'INV',
  defaultDueDays: 7,
  lateFeeEnabled: true,
  lateFeePercent: 0.1, // 0.1% per day
  lateFeeFixed: null,
  lateFeeGraceDays: 3,
  lateFeeCap: 120.0, // 10% cap
  vatOnFeesEnabled: false,
  vatRate: 20.0,
  currency: 'GBP',
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
  ...overrides,
});

export const createMockInvoiceLine = (overrides = {}) => ({
  id: 'line-1',
  invoiceId: 'inv-123',
  description: 'Monthly Rent',
  qty: 1.0,
  unitPrice: 1200.0,
  taxRate: 0.0,
  lineTotal: 1200.0,
  taxTotal: 0.0,
  ...overrides,
});

export const createMockPaymentAllocation = (overrides = {}) => ({
  id: 'alloc-1',
  paymentId: 'pay-123',
  invoiceId: 'inv-123',
  amount: 1200.0,
  createdAt: new Date('2025-01-07'),
  ...overrides,
});

/**
 * Currency formatting helper
 */
export const formatCurrency = (amount: number, currency = 'GBP'): string => {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

/**
 * Calculate proration for partial period
 */
export const calculateProration = (
  fullAmount: number,
  periodStart: Date,
  periodEnd: Date,
  actualStart: Date,
  actualEnd: Date,
): number => {
  const totalDays = Math.ceil(
    (periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24),
  );
  const actualDays = Math.ceil(
    (actualEnd.getTime() - actualStart.getTime()) / (1000 * 60 * 60 * 24),
  );

  const proratedAmount = (fullAmount / totalDays) * actualDays;
  return Math.round(proratedAmount * 100) / 100;
};

/**
 * Calculate VAT
 */
export const calculateVAT = (amount: number, vatRate: number): number => {
  const vat = amount * (vatRate / 100);
  return Math.round(vat * 100) / 100;
};

/**
 * Round to currency precision (2 decimals)
 */
export const roundCurrency = (amount: number): number => {
  return Math.round(amount * 100) / 100;
};
