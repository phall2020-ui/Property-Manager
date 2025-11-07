import { Test, TestingModule } from '@nestjs/testing';
import { LateFeeService } from '../../src/modules/finance/services/late-fee.service';
import { PrismaService } from '../../src/common/prisma/prisma.service';
import { EmailService } from '../../src/modules/notifications/email.service';
import {
  createOverdueInvoice,
  createTestInvoice,
  createTestFinanceSettings,
  createTestTenancy,
  createMockPrismaService,
  createMockEmailService,
} from './fixtures';

describe('LateFeeService', () => {
  let service: LateFeeService;
  let prisma: any;
  let emailService: any;

  beforeEach(async () => {
    prisma = createMockPrismaService();
    emailService = createMockEmailService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LateFeeService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
        {
          provide: EmailService,
          useValue: emailService,
        },
      ],
    }).compile();

    service = module.get<LateFeeService>(LateFeeService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('processLateFees', () => {
    it('should process late fees for all landlords with enabled settings', async () => {
      const settings = [
        createTestFinanceSettings('landlord-1'),
        createTestFinanceSettings('landlord-2'),
      ];

      const invoice1 = createOverdueInvoice(10, { landlordId: 'landlord-1' });
      const invoice2 = createOverdueInvoice(15, { landlordId: 'landlord-2' });

      prisma.financeSettings.findMany.mockResolvedValue(settings);
      prisma.invoice.findMany.mockResolvedValueOnce([
        {
          ...invoice1,
          tenancy: createTestTenancy('landlord-1'),
          lines: [],
        },
      ]);
      prisma.invoice.findMany.mockResolvedValueOnce([
        {
          ...invoice2,
          tenancy: createTestTenancy('landlord-2'),
          lines: [],
        },
      ]);
      prisma.paymentAllocation.aggregate.mockResolvedValue({
        _sum: { amount: 0 },
      });
      prisma.invoiceLine.findFirst.mockResolvedValue(null);
      prisma.invoiceLine.create.mockResolvedValue({});
      prisma.invoice.update.mockResolvedValue({});

      await service.processLateFees();

      expect(prisma.financeSettings.findMany).toHaveBeenCalledWith({
        where: { lateFeeEnabled: true },
      });
      expect(prisma.invoice.findMany).toHaveBeenCalledTimes(2);
    });

    it('should skip invoices within grace period', async () => {
      const settings = createTestFinanceSettings('landlord-1');
      const invoice = createOverdueInvoice(2, { landlordId: 'landlord-1' }); // Only 2 days overdue, grace is 3 days

      prisma.financeSettings.findMany.mockResolvedValue([settings]);
      prisma.invoice.findMany.mockResolvedValue([
        {
          ...invoice,
          tenancy: createTestTenancy('landlord-1'),
          lines: [],
        },
      ]);
      prisma.paymentAllocation.aggregate.mockResolvedValue({
        _sum: { amount: 0 },
      });

      await service.processLateFees();

      expect(prisma.invoiceLine.create).not.toHaveBeenCalled();
    });

    it('should skip fully paid invoices', async () => {
      const settings = createTestFinanceSettings('landlord-1');
      const invoice = createOverdueInvoice(10, {
        landlordId: 'landlord-1',
        amountGBP: 1200.0,
      });

      prisma.financeSettings.findMany.mockResolvedValue([settings]);
      prisma.invoice.findMany.mockResolvedValue([
        {
          ...invoice,
          tenancy: createTestTenancy('landlord-1'),
          lines: [],
        },
      ]);
      prisma.paymentAllocation.aggregate.mockResolvedValue({
        _sum: { amount: 1200.0 }, // Fully paid
      });

      await service.processLateFees();

      expect(prisma.invoiceLine.create).not.toHaveBeenCalled();
    });

    it('should skip if late fee already applied today', async () => {
      const settings = createTestFinanceSettings('landlord-1');
      const invoice = createOverdueInvoice(10, { landlordId: 'landlord-1' });
      const today = new Date().toISOString().split('T')[0];

      prisma.financeSettings.findMany.mockResolvedValue([settings]);
      prisma.invoice.findMany.mockResolvedValue([
        {
          ...invoice,
          tenancy: createTestTenancy('landlord-1'),
          lines: [],
        },
      ]);
      prisma.paymentAllocation.aggregate.mockResolvedValue({
        _sum: { amount: 0 },
      });
      prisma.invoiceLine.findFirst.mockResolvedValue({
        id: 'existing-fee',
        description: `Late Fee - ${today} (10 days overdue)`,
      });

      await service.processLateFees();

      expect(prisma.invoiceLine.create).not.toHaveBeenCalled();
    });
  });

  describe('late fee calculation', () => {
    it('should calculate percentage-based late fee correctly', async () => {
      const settings = {
        ...createTestFinanceSettings('landlord-1'),
        lateFeeCap: null, // No cap for this test
      };
      const daysOverdue = 10;
      const invoice = createOverdueInvoice(daysOverdue, {
        landlordId: 'landlord-1',
        amountGBP: 1200.0,
      });

      prisma.financeSettings.findMany.mockResolvedValue([settings]);
      prisma.invoice.findMany.mockResolvedValue([
        {
          ...invoice,
          tenancy: createTestTenancy('landlord-1'),
          lines: [],
        },
      ]);
      prisma.paymentAllocation.aggregate.mockResolvedValue({
        _sum: { amount: 0 },
      });
      prisma.invoiceLine.findFirst.mockResolvedValue(null);
      prisma.invoiceLine.create.mockResolvedValue({});
      prisma.invoice.update.mockResolvedValue({});

      await service.processLateFees();

      // Calculate expected fee: 1200 * 0.02 * 10 = 240
      expect(prisma.invoiceLine.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          invoiceId: invoice.id,
          unitPrice: 240.0,
          lineTotal: 240.0,
          description: expect.stringContaining('Late Fee'),
        }),
      });

      expect(prisma.invoice.update).toHaveBeenCalledWith({
        where: { id: invoice.id },
        data: expect.objectContaining({
          amountGBP: 1440.0, // 1200 + 240
          status: 'LATE',
        }),
      });
    });

    it('should calculate fixed late fee correctly', async () => {
      const settings = {
        ...createTestFinanceSettings('landlord-1'),
        lateFeePercent: null,
        lateFeeFixed: 10.0, // Fixed £10 per day
        lateFeeCap: null, // No cap
      };
      const daysOverdue = 5;
      const invoice = createOverdueInvoice(daysOverdue, {
        landlordId: 'landlord-1',
        amountGBP: 1200.0,
      });

      prisma.financeSettings.findMany.mockResolvedValue([settings]);
      prisma.invoice.findMany.mockResolvedValue([
        {
          ...invoice,
          tenancy: createTestTenancy('landlord-1'),
          lines: [],
        },
      ]);
      prisma.paymentAllocation.aggregate.mockResolvedValue({
        _sum: { amount: 0 },
      });
      prisma.invoiceLine.findFirst.mockResolvedValue(null);
      prisma.invoiceLine.create.mockResolvedValue({});
      prisma.invoice.update.mockResolvedValue({});

      await service.processLateFees();

      // Expected fee: 10 * 5 = 50
      expect(prisma.invoiceLine.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          unitPrice: 50.0,
          lineTotal: 50.0,
        }),
      });
    });

    it('should apply fee cap when exceeded', async () => {
      const settings = {
        ...createTestFinanceSettings('landlord-1'),
        lateFeePercent: 10, // 10% per day (very high)
        lateFeeCap: 120.0, // Cap at £120
      };
      const daysOverdue = 30;
      const invoice = createOverdueInvoice(daysOverdue, {
        landlordId: 'landlord-1',
        amountGBP: 1200.0,
      });

      prisma.financeSettings.findMany.mockResolvedValue([settings]);
      prisma.invoice.findMany.mockResolvedValue([
        {
          ...invoice,
          tenancy: createTestTenancy('landlord-1'),
          lines: [],
        },
      ]);
      prisma.paymentAllocation.aggregate.mockResolvedValue({
        _sum: { amount: 0 },
      });
      prisma.invoiceLine.findFirst.mockResolvedValue(null);
      prisma.invoiceLine.create.mockResolvedValue({});
      prisma.invoice.update.mockResolvedValue({});

      await service.processLateFees();

      // Without cap: 1200 * 0.1 * 30 = 3600, but capped at 120
      expect(prisma.invoiceLine.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          unitPrice: 120.0,
          lineTotal: 120.0,
        }),
      });
    });

    it('should round late fees to 2 decimal places', async () => {
      const settings = {
        ...createTestFinanceSettings('landlord-1'),
        lateFeeCap: null, // No cap
      };
      const daysOverdue = 7;
      const invoice = createOverdueInvoice(daysOverdue, {
        landlordId: 'landlord-1',
        amountGBP: 1234.56,
      });

      prisma.financeSettings.findMany.mockResolvedValue([settings]);
      prisma.invoice.findMany.mockResolvedValue([
        {
          ...invoice,
          tenancy: createTestTenancy('landlord-1'),
          lines: [],
        },
      ]);
      prisma.paymentAllocation.aggregate.mockResolvedValue({
        _sum: { amount: 0 },
      });
      prisma.invoiceLine.findFirst.mockResolvedValue(null);
      prisma.invoiceLine.create.mockResolvedValue({});
      prisma.invoice.update.mockResolvedValue({});

      await service.processLateFees();

      // Expected fee: 1234.56 * 0.02 * 7 = 172.84 (rounded)
      expect(prisma.invoiceLine.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          unitPrice: 172.84,
          lineTotal: 172.84,
        }),
      });
    });

    it('should not apply fee if calculated amount is zero or negative', async () => {
      const settings = createTestFinanceSettings('landlord-1');
      const invoice = createOverdueInvoice(10, {
        landlordId: 'landlord-1',
        amountGBP: 0.0, // No balance
      });

      prisma.financeSettings.findMany.mockResolvedValue([settings]);
      prisma.invoice.findMany.mockResolvedValue([
        {
          ...invoice,
          tenancy: createTestTenancy('landlord-1'),
          lines: [],
        },
      ]);
      prisma.paymentAllocation.aggregate.mockResolvedValue({
        _sum: { amount: 0 },
      });

      await service.processLateFees();

      expect(prisma.invoiceLine.create).not.toHaveBeenCalled();
    });
  });

  describe('grace period', () => {
    it('should respect grace period configuration', async () => {
      const settings = {
        ...createTestFinanceSettings('landlord-1'),
        lateFeeGraceDays: 7,
      };
      const invoice5Days = createOverdueInvoice(5, {
        landlordId: 'landlord-1',
      });
      const invoice10Days = createOverdueInvoice(10, {
        landlordId: 'landlord-1',
      });

      prisma.financeSettings.findMany.mockResolvedValue([settings]);
      
      // Test within grace period
      prisma.invoice.findMany.mockResolvedValueOnce([
        {
          ...invoice5Days,
          tenancy: createTestTenancy('landlord-1'),
          lines: [],
        },
      ]);
      prisma.paymentAllocation.aggregate.mockResolvedValue({
        _sum: { amount: 0 },
      });

      await service.processLateFees();
      expect(prisma.invoiceLine.create).not.toHaveBeenCalled();

      // Test after grace period
      jest.clearAllMocks();
      prisma.financeSettings.findMany.mockResolvedValue([settings]);
      prisma.invoice.findMany.mockResolvedValueOnce([
        {
          ...invoice10Days,
          tenancy: createTestTenancy('landlord-1'),
          lines: [],
        },
      ]);
      prisma.paymentAllocation.aggregate.mockResolvedValue({
        _sum: { amount: 0 },
      });
      prisma.invoiceLine.findFirst.mockResolvedValue(null);
      prisma.invoiceLine.create.mockResolvedValue({});
      prisma.invoice.update.mockResolvedValue({});

      await service.processLateFees();
      expect(prisma.invoiceLine.create).toHaveBeenCalled();
    });

    it('should handle zero grace period', async () => {
      const settings = {
        ...createTestFinanceSettings('landlord-1'),
        lateFeeGraceDays: 0,
      };
      const invoice = createOverdueInvoice(1, { landlordId: 'landlord-1' });

      prisma.financeSettings.findMany.mockResolvedValue([settings]);
      prisma.invoice.findMany.mockResolvedValue([
        {
          ...invoice,
          tenancy: createTestTenancy('landlord-1'),
          lines: [],
        },
      ]);
      prisma.paymentAllocation.aggregate.mockResolvedValue({
        _sum: { amount: 0 },
      });
      prisma.invoiceLine.findFirst.mockResolvedValue(null);
      prisma.invoiceLine.create.mockResolvedValue({});
      prisma.invoice.update.mockResolvedValue({});

      await service.processLateFees();

      expect(prisma.invoiceLine.create).toHaveBeenCalled();
    });
  });

  describe('email notifications', () => {
    it('should send arrears reminder email when late fee applied', async () => {
      const settings = createTestFinanceSettings('landlord-1');
      const tenancy = createTestTenancy('landlord-1');
      const invoice = createOverdueInvoice(10, {
        landlordId: 'landlord-1',
        amountGBP: 1200.0,
      });

      prisma.financeSettings.findMany.mockResolvedValue([settings]);
      prisma.invoice.findMany.mockResolvedValue([
        {
          ...invoice,
          tenancy,
          lines: [],
        },
      ]);
      prisma.paymentAllocation.aggregate.mockResolvedValue({
        _sum: { amount: 0 },
      });
      prisma.invoiceLine.findFirst.mockResolvedValue(null);
      prisma.invoiceLine.create.mockResolvedValue({});
      prisma.invoice.update.mockResolvedValue({});

      await service.processLateFees();

      expect(emailService.sendArrearsReminderEmail).toHaveBeenCalledWith(
        tenancy.tenants[0].email,
        tenancy.tenants[0].fullName,
        expect.any(Number), // amount in pence
        10, // days overdue
        expect.stringContaining('123 Test Street'),
        [invoice.number],
      );
    });

    it('should handle email failures gracefully', async () => {
      const settings = createTestFinanceSettings('landlord-1');
      const tenancy = createTestTenancy('landlord-1');
      const invoice = createOverdueInvoice(10, {
        landlordId: 'landlord-1',
      });

      prisma.financeSettings.findMany.mockResolvedValue([settings]);
      prisma.invoice.findMany.mockResolvedValue([
        {
          ...invoice,
          tenancy,
          lines: [],
        },
      ]);
      prisma.paymentAllocation.aggregate.mockResolvedValue({
        _sum: { amount: 0 },
      });
      prisma.invoiceLine.findFirst.mockResolvedValue(null);
      prisma.invoiceLine.create.mockResolvedValue({});
      prisma.invoice.update.mockResolvedValue({});
      emailService.sendArrearsReminderEmail.mockRejectedValue(
        new Error('Email service unavailable'),
      );

      // Should not throw
      await expect(service.processLateFees()).resolves.not.toThrow();

      // Late fee should still be applied
      expect(prisma.invoiceLine.create).toHaveBeenCalled();
    });

    it('should not send email if no tenant email available', async () => {
      const settings = createTestFinanceSettings('landlord-1');
      const tenancy = {
        ...createTestTenancy('landlord-1'),
        tenants: [],
      };
      const invoice = createOverdueInvoice(10, {
        landlordId: 'landlord-1',
      });

      prisma.financeSettings.findMany.mockResolvedValue([settings]);
      prisma.invoice.findMany.mockResolvedValue([
        {
          ...invoice,
          tenancy,
          lines: [],
        },
      ]);
      prisma.paymentAllocation.aggregate.mockResolvedValue({
        _sum: { amount: 0 },
      });
      prisma.invoiceLine.findFirst.mockResolvedValue(null);
      prisma.invoiceLine.create.mockResolvedValue({});
      prisma.invoice.update.mockResolvedValue({});

      await service.processLateFees();

      expect(emailService.sendArrearsReminderEmail).not.toHaveBeenCalled();
    });
  });

  describe('processLateFeeForInvoice', () => {
    it('should process late fee for a specific invoice', async () => {
      const settings = createTestFinanceSettings('landlord-1');
      const tenancy = createTestTenancy('landlord-1');
      const invoice = createOverdueInvoice(10, {
        landlordId: 'landlord-1',
      });

      prisma.invoice.findUnique.mockResolvedValue({
        ...invoice,
        tenancy,
        lines: [],
      });
      prisma.financeSettings.findUnique.mockResolvedValue(settings);
      prisma.paymentAllocation.aggregate.mockResolvedValue({
        _sum: { amount: 0 },
      });
      prisma.invoiceLine.findFirst.mockResolvedValue(null);
      prisma.invoiceLine.create.mockResolvedValue({});
      prisma.invoice.update.mockResolvedValue({});

      await service.processLateFeeForInvoice(invoice.id);

      expect(prisma.invoiceLine.create).toHaveBeenCalled();
    });

    it('should throw error if invoice not found', async () => {
      prisma.invoice.findUnique.mockResolvedValue(null);

      await expect(
        service.processLateFeeForInvoice('invalid-id'),
      ).rejects.toThrow('Invoice not found');
    });

    it('should throw error if late fees not enabled', async () => {
      const invoice = createOverdueInvoice(10, {
        landlordId: 'landlord-1',
      });
      const settings = {
        ...createTestFinanceSettings('landlord-1'),
        lateFeeEnabled: false,
      };

      prisma.invoice.findUnique.mockResolvedValue({
        ...invoice,
        tenancy: createTestTenancy('landlord-1'),
        lines: [],
      });
      prisma.financeSettings.findUnique.mockResolvedValue(settings);

      await expect(
        service.processLateFeeForInvoice(invoice.id),
      ).rejects.toThrow('Late fees not enabled');
    });
  });
});
