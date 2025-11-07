/**
 * Test fixtures and factories for finance module testing
 */

export interface TestInvoice {
  id: string;
  landlordId: string;
  propertyId: string;
  tenancyId: string;
  tenantUserId?: string;
  number: string;
  reference: string;
  periodStart: Date;
  periodEnd: Date;
  issueDate?: Date;
  dueAt: Date;
  dueDate?: Date;
  amountGBP: number;
  amount?: number;
  lineTotal?: number;
  taxTotal?: number;
  grandTotal?: number;
  status: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TestPayment {
  id: string;
  landlordId: string;
  propertyId: string;
  tenancyId: string;
  invoiceId: string;
  tenantUserId?: string;
  amountGBP: number;
  method: string;
  provider: string;
  providerRef: string;
  status: string;
  feeGBP?: number;
  vatGBP?: number;
  paidAt: Date;
  amount?: number;
  receivedAt?: Date;
  externalId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TestInvoiceLine {
  id: string;
  invoiceId: string;
  description: string;
  qty: number;
  unitPrice: number;
  taxRate: number;
  lineTotal: number;
  taxTotal: number;
}

/**
 * Create a test invoice with sensible defaults
 */
export function createTestInvoice(overrides: Partial<TestInvoice> = {}): TestInvoice {
  const now = new Date();
  const id = overrides.id || `inv-${Date.now()}`;
  
  return {
    id,
    landlordId: 'landlord-123',
    propertyId: 'property-456',
    tenancyId: 'tenancy-789',
    number: `INV-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 10000)).padStart(6, '0')}`,
    reference: '2025-11 Rent',
    periodStart: new Date('2025-11-01'),
    periodEnd: new Date('2025-11-30'),
    issueDate: now,
    dueAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    amountGBP: 1200.00,
    amount: 1200.00,
    lineTotal: 1000.00,
    taxTotal: 200.00,
    grandTotal: 1200.00,
    status: 'DUE',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

/**
 * Create an overdue invoice (past due date)
 */
export function createOverdueInvoice(daysOverdue: number = 10, overrides: Partial<TestInvoice> = {}): TestInvoice {
  const now = new Date();
  const dueDate = new Date(now.getTime() - daysOverdue * 24 * 60 * 60 * 1000);
  
  return createTestInvoice({
    dueAt: dueDate,
    dueDate,
    status: 'LATE',
    ...overrides,
  });
}

/**
 * Create a partially paid invoice
 */
export function createPartiallyPaidInvoice(overrides: Partial<TestInvoice> = {}): TestInvoice {
  return createTestInvoice({
    status: 'PART_PAID',
    ...overrides,
  });
}

/**
 * Create a paid invoice
 */
export function createPaidInvoice(overrides: Partial<TestInvoice> = {}): TestInvoice {
  const pastDate = new Date();
  pastDate.setDate(pastDate.getDate() - 30);
  
  return createTestInvoice({
    status: 'PAID',
    dueAt: pastDate,
    dueDate: pastDate,
    ...overrides,
  });
}

/**
 * Create a draft invoice
 */
export function createDraftInvoice(overrides: Partial<TestInvoice> = {}): TestInvoice {
  return createTestInvoice({
    status: 'DRAFT',
    ...overrides,
  });
}

/**
 * Create test invoice lines
 */
export function createTestInvoiceLines(invoiceId: string, count: number = 2): TestInvoiceLine[] {
  const lines: TestInvoiceLine[] = [];
  
  for (let i = 0; i < count; i++) {
    lines.push({
      id: `line-${invoiceId}-${i}`,
      invoiceId,
      description: `Line item ${i + 1}`,
      qty: 1,
      unitPrice: 500 + i * 100,
      taxRate: 0.2,
      lineTotal: 500 + i * 100,
      taxTotal: (500 + i * 100) * 0.2,
    });
  }
  
  return lines;
}

/**
 * Create a test payment
 */
export function createTestPayment(overrides: Partial<TestPayment> = {}): TestPayment {
  const now = new Date();
  
  return {
    id: `payment-${Date.now()}`,
    landlordId: 'landlord-123',
    propertyId: 'property-456',
    tenancyId: 'tenancy-789',
    invoiceId: 'invoice-123',
    amountGBP: 1200.00,
    method: 'BANK_TRANSFER',
    provider: 'TEST',
    providerRef: `test-${Date.now()}`,
    status: 'SETTLED',
    paidAt: now,
    amount: 1200.00,
    receivedAt: now,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

/**
 * Create test finance settings
 */
export function createTestFinanceSettings(landlordId: string = 'landlord-123') {
  return {
    id: `settings-${landlordId}`,
    landlordId,
    invoicePrefix: 'INV',
    defaultDueDays: 7,
    lateFeeEnabled: true,
    lateFeePercent: 2.0, // 2% per day (stored as percentage, will be divided by 100)
    lateFeeGraceDays: 3,
    lateFeeCap: 120.0, // £120 cap
    vatOnFeesEnabled: false,
    vatRate: 20.0,
    currency: 'GBP',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Create test tenancy
 */
export function createTestTenancy(landlordId: string = 'landlord-123') {
  return {
    id: 'tenancy-789',
    propertyId: 'property-456',
    tenantOrgId: 'tenant-org-999',
    status: 'ACTIVE',
    start: new Date('2025-01-01'),
    end: null,
    rentAmountGBP: 1200.00,
    rentDueDay: 1,
    depositAmountGBP: 1800.00,
    createdAt: new Date(),
    updatedAt: new Date(),
    property: {
      id: 'property-456',
      ownerOrgId: landlordId,
      addressLine1: '123 Test Street',
      city: 'London',
      postcode: 'SW1A 1AA',
    },
    tenants: [
      {
        id: 'tenant-user-1',
        email: 'tenant@example.com',
        fullName: 'John Tenant',
      },
    ],
  };
}

/**
 * Create mock Prisma service
 */
export function createMockPrismaService() {
  return {
    invoice: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    invoiceLine: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
    payment: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    paymentAllocation: {
      findMany: jest.fn(),
      create: jest.fn(),
      aggregate: jest.fn(),
    },
    ledgerEntry: {
      create: jest.fn(),
    },
    ledgerAccount: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    financeSettings: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    tenancy: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback(createMockPrismaService())),
  };
}

/**
 * Create mock Events service
 */
export function createMockEventsService() {
  return {
    emit: jest.fn(),
  };
}

/**
 * Create mock Notifications service
 */
export function createMockNotificationsService() {
  return {
    createNotification: jest.fn(),
  };
}

/**
 * Create mock Email service
 */
export function createMockEmailService() {
  return {
    sendEmail: jest.fn().mockResolvedValue(true),
    sendInvoiceEmail: jest.fn().mockResolvedValue(true),
    sendPaymentReceivedEmail: jest.fn().mockResolvedValue(true),
    sendArrearsReminderEmail: jest.fn().mockResolvedValue(true),
  };
}
