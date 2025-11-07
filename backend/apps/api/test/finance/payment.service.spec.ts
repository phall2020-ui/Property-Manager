import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { PaymentService } from '../../src/modules/finance/services/payment.service';
import { InvoiceService } from '../../src/modules/finance/services/invoice.service';
import { ReceiptPdfService } from '../../src/modules/finance/services/receipt-pdf.service';
import { PrismaService } from '../../src/common/prisma/prisma.service';
import { EventsService } from '../../src/modules/events/events.service';
import { NotificationsService } from '../../src/modules/notifications/notifications.service';
import { PaymentMethod, PaymentProvider } from '../../src/modules/finance/dto/record-payment.dto';
import {
  createTestInvoice,
  createTestPayment,
  createTestTenancy,
  createMockPrismaService,
  createMockEventsService,
  createMockNotificationsService,
} from './fixtures';

describe('PaymentService', () => {
  let service: PaymentService;
  let prisma: any;
  let invoiceService: any;
  let receiptPdfService: any;
  let eventsService: any;
  let notificationsService: any;

  beforeEach(async () => {
    prisma = createMockPrismaService();
    eventsService = createMockEventsService();
    notificationsService = createMockNotificationsService();
    
    // Mock InvoiceService
    invoiceService = {
      updateInvoiceStatus: jest.fn().mockResolvedValue(undefined),
    };

    // Mock ReceiptPdfService
    receiptPdfService = {
      generateReceipt: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
        {
          provide: InvoiceService,
          useValue: invoiceService,
        },
        {
          provide: ReceiptPdfService,
          useValue: receiptPdfService,
        },
        {
          provide: EventsService,
          useValue: eventsService,
        },
        {
          provide: NotificationsService,
          useValue: notificationsService,
        },
      ],
    }).compile();

    service = module.get<PaymentService>(PaymentService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('recordPayment', () => {
    it('should record a new payment successfully', async () => {
      const landlordId = 'landlord-123';
      const invoice = createTestInvoice({ landlordId });
      const tenancy = createTestTenancy(landlordId);
      const dto = {
        invoiceId: invoice.id,
        amountGBP: 1200.0,
        method: PaymentMethod.BANK_TRANSFER,
        providerRef: `payment-${Date.now()}`,
        paidAt: new Date().toISOString(),
      };

      const expectedPayment = createTestPayment({
        landlordId,
        invoiceId: dto.invoiceId,
        amountGBP: dto.amountGBP,
        providerRef: dto.providerRef,
      });

      prisma.payment.findUnique.mockResolvedValue(null); // Not duplicate
      prisma.invoice.findFirst.mockResolvedValue({
        ...invoice,
        tenancy,
      });
      prisma.payment.create.mockResolvedValue(expectedPayment);
      prisma.paymentAllocation.create.mockResolvedValue({
        id: 'alloc-1',
        paymentId: expectedPayment.id,
        invoiceId: dto.invoiceId,
        amount: dto.amountGBP,
      });
      prisma.ledgerAccount.findFirst.mockResolvedValue({
        id: 'account-1',
        landlordId,
        type: 'INCOME',
      });
      prisma.ledgerEntry.create.mockResolvedValue({});
      prisma.payment.findFirst.mockResolvedValue({
        ...expectedPayment,
        allocations: [],
      });

      const result = await service.recordPayment(landlordId, dto);

      expect(result).toBeDefined();
      expect(prisma.payment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            landlordId,
            amountGBP: dto.amountGBP,
            providerRef: dto.providerRef,
            status: 'SETTLED',
          }),
        }),
      );
      expect(prisma.paymentAllocation.create).toHaveBeenCalled();
      expect(invoiceService.updateInvoiceStatus).toHaveBeenCalledWith(
        dto.invoiceId,
      );
      expect(eventsService.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'payment.recorded',
          actorRole: 'LANDLORD',
          landlordId,
        }),
      );
    });

    it('should return existing payment if providerRef is duplicate (idempotency)', async () => {
      const landlordId = 'landlord-123';
      const existingPayment = createTestPayment({
        landlordId,
        providerRef: 'duplicate-ref-123',
      });
      const dto = {
        invoiceId: 'invoice-123',
        amountGBP: 1200.0,
        method: PaymentMethod.BANK_TRANSFER,
        providerRef: 'duplicate-ref-123',
        paidAt: new Date().toISOString(),
      };

      prisma.payment.findUnique.mockResolvedValue(existingPayment);
      prisma.payment.findFirst.mockResolvedValue({
        ...existingPayment,
        allocations: [],
      });

      const result = await service.recordPayment(landlordId, dto);

      expect(result.id).toBe(existingPayment.id);
      expect(prisma.payment.create).not.toHaveBeenCalled();
      expect(prisma.paymentAllocation.create).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if invoice not found', async () => {
      const landlordId = 'landlord-123';
      const dto = {
        invoiceId: 'invalid-invoice',
        amountGBP: 1200.0,
        method: PaymentMethod.BANK_TRANSFER,
        providerRef: `payment-${Date.now()}`,
        paidAt: new Date().toISOString(),
      };

      prisma.payment.findUnique.mockResolvedValue(null);
      prisma.invoice.findFirst.mockResolvedValue(null);

      await expect(service.recordPayment(landlordId, dto)).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.payment.create).not.toHaveBeenCalled();
    });

    it('should handle partial payments correctly', async () => {
      const landlordId = 'landlord-123';
      const invoice = createTestInvoice({
        landlordId,
        amountGBP: 1200.0,
      });
      const tenancy = createTestTenancy(landlordId);
      const dto = {
        invoiceId: invoice.id,
        amountGBP: 600.0, // Partial payment
        method: PaymentMethod.BANK_TRANSFER,
        providerRef: `payment-${Date.now()}`,
        paidAt: new Date().toISOString(),
      };

      const expectedPayment = createTestPayment({
        landlordId,
        invoiceId: dto.invoiceId,
        amountGBP: dto.amountGBP,
        providerRef: dto.providerRef,
      });

      prisma.payment.findUnique.mockResolvedValue(null);
      prisma.invoice.findFirst.mockResolvedValue({
        ...invoice,
        tenancy,
      });
      prisma.payment.create.mockResolvedValue(expectedPayment);
      prisma.paymentAllocation.create.mockResolvedValue({
        id: 'alloc-1',
        paymentId: expectedPayment.id,
        invoiceId: dto.invoiceId,
        amount: dto.amountGBP,
      });
      prisma.ledgerAccount.findFirst.mockResolvedValue({
        id: 'account-1',
        landlordId,
        type: 'INCOME',
      });
      prisma.ledgerEntry.create.mockResolvedValue({});
      prisma.payment.findFirst.mockResolvedValue({
        ...expectedPayment,
        allocations: [],
      });

      const result = await service.recordPayment(landlordId, dto);

      expect(result).toBeDefined();
      expect(prisma.paymentAllocation.create).toHaveBeenCalledWith({
        data: {
          paymentId: expectedPayment.id,
          invoiceId: dto.invoiceId,
          amount: 600.0,
        },
      });
    });

    it('should include fees and VAT if provided', async () => {
      const landlordId = 'landlord-123';
      const invoice = createTestInvoice({ landlordId });
      const tenancy = createTestTenancy(landlordId);
      const dto = {
        invoiceId: invoice.id,
        amountGBP: 1200.0,
        method: PaymentMethod.CARD,
        provider: PaymentProvider.STRIPE,
        providerRef: `payment-${Date.now()}`,
        paidAt: new Date().toISOString(),
        feeGBP: 30.0,
        vatGBP: 6.0,
      };

      const expectedPayment = createTestPayment({
        landlordId,
        feeGBP: 30.0,
        vatGBP: 6.0,
      });

      prisma.payment.findUnique.mockResolvedValue(null);
      prisma.invoice.findFirst.mockResolvedValue({
        ...invoice,
        tenancy,
      });
      prisma.payment.create.mockResolvedValue(expectedPayment);
      prisma.paymentAllocation.create.mockResolvedValue({});
      prisma.ledgerAccount.findFirst.mockResolvedValue({
        id: 'account-1',
        landlordId,
        type: 'INCOME',
      });
      prisma.ledgerEntry.create.mockResolvedValue({});
      prisma.payment.findFirst.mockResolvedValue({
        ...expectedPayment,
        allocations: [],
      });

      await service.recordPayment(landlordId, dto);

      expect(prisma.payment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            feeGBP: 30.0,
            vatGBP: 6.0,
          }),
        }),
      );
    });
  });

  describe('getPayment', () => {
    it('should return payment with calculated allocations', async () => {
      const landlordId = 'landlord-123';
      const payment = createTestPayment({
        landlordId,
        amountGBP: 1200.0,
      });
      const allocations = [
        {
          id: 'alloc-1',
          amount: 800.0,
          invoice: createTestInvoice(),
        },
        {
          id: 'alloc-2',
          amount: 400.0,
          invoice: createTestInvoice(),
        },
      ];

      prisma.payment.findFirst.mockResolvedValue({
        ...payment,
        allocations,
      });

      const result = await service.getPayment(payment.id, landlordId);

      expect(result).toBeDefined();
      expect(result.allocatedAmount).toBe(1200.0);
      expect(result.unallocatedAmount).toBe(0);
    });

    it('should handle partially allocated payments', async () => {
      const landlordId = 'landlord-123';
      const payment = createTestPayment({
        landlordId,
        amountGBP: 1200.0,
      });
      const allocations = [
        {
          id: 'alloc-1',
          amount: 800.0,
          invoice: createTestInvoice(),
        },
      ];

      prisma.payment.findFirst.mockResolvedValue({
        ...payment,
        allocations,
      });

      const result = await service.getPayment(payment.id, landlordId);

      expect(result.allocatedAmount).toBe(800.0);
      expect(result.unallocatedAmount).toBe(400.0);
    });

    it('should throw NotFoundException if payment not found', async () => {
      prisma.payment.findFirst.mockResolvedValue(null);

      await expect(
        service.getPayment('invalid-id', 'landlord-123'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should only return payments for the correct landlord', async () => {
      const landlordId = 'landlord-123';
      const payment = createTestPayment({ landlordId });

      prisma.payment.findFirst.mockImplementation(({ where }) => {
        if (where.landlordId === landlordId && where.id === payment.id) {
          return Promise.resolve({
            ...payment,
            allocations: [],
          });
        }
        return Promise.resolve(null);
      });

      const result = await service.getPayment(payment.id, landlordId);
      expect(result).toBeDefined();

      await expect(
        service.getPayment(payment.id, 'wrong-landlord'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('listPayments', () => {
    it('should return paginated payments', async () => {
      const landlordId = 'landlord-123';
      const payments = [
        {
          ...createTestPayment({ landlordId }),
          allocations: [],
        },
        {
          ...createTestPayment({ landlordId }),
          allocations: [],
        },
      ];

      prisma.payment.findMany.mockResolvedValue(payments);
      prisma.payment.count.mockResolvedValue(2);

      const result = await service.listPayments(landlordId, {
        page: 1,
        limit: 10,
      });

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
    });

    it('should filter by status', async () => {
      const landlordId = 'landlord-123';

      prisma.payment.findMany.mockResolvedValue([]);
      prisma.payment.count.mockResolvedValue(0);

      await service.listPayments(landlordId, { status: 'SETTLED' });

      expect(prisma.payment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'SETTLED' }),
        }),
      );
    });

    it('should filter by property and tenancy', async () => {
      const landlordId = 'landlord-123';

      prisma.payment.findMany.mockResolvedValue([]);
      prisma.payment.count.mockResolvedValue(0);

      await service.listPayments(landlordId, {
        propertyId: 'prop-1',
        tenancyId: 'ten-1',
      });

      expect(prisma.payment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            propertyId: 'prop-1',
            tenancyId: 'ten-1',
          }),
        }),
      );
    });
  });

  describe('PSP webhook handling', () => {
    it('should handle webhook replay idempotently', async () => {
      const landlordId = 'landlord-123';
      const providerRef = 'webhook-payment-123';
      
      // First webhook call
      const invoice = createTestInvoice({ landlordId });
      const tenancy = createTestTenancy(landlordId);
      const dto = {
        invoiceId: invoice.id,
        amountGBP: 1200.0,
        method: PaymentMethod.BANK_TRANSFER,
        providerRef,
        paidAt: new Date().toISOString(),
      };

      const payment = createTestPayment({
        landlordId,
        providerRef,
      });

      prisma.payment.findUnique.mockResolvedValue(null);
      prisma.invoice.findFirst.mockResolvedValue({
        ...invoice,
        tenancy,
      });
      prisma.payment.create.mockResolvedValue(payment);
      prisma.paymentAllocation.create.mockResolvedValue({});
      prisma.ledgerAccount.findFirst.mockResolvedValue({
        id: 'account-1',
        landlordId,
        type: 'INCOME',
      });
      prisma.ledgerEntry.create.mockResolvedValue({});
      prisma.payment.findFirst.mockResolvedValue({
        ...payment,
        allocations: [],
      });

      const result1 = await service.recordPayment(landlordId, dto);
      expect(prisma.payment.create).toHaveBeenCalledTimes(1);

      // Clear mocks for second call
      jest.clearAllMocks();

      // Second webhook call (replay)
      prisma.payment.findUnique.mockResolvedValue(payment);
      prisma.payment.findFirst.mockResolvedValue({
        ...payment,
        allocations: [],
      });

      const result2 = await service.recordPayment(landlordId, dto);

      expect(result1.providerRef).toBe(result2.providerRef);
      expect(prisma.payment.create).not.toHaveBeenCalled();
      expect(prisma.paymentAllocation.create).not.toHaveBeenCalled();
    });
  });

  describe('currency and rounding', () => {
    it('should handle currency precision correctly', async () => {
      const landlordId = 'landlord-123';
      const invoice = createTestInvoice({
        landlordId,
        amountGBP: 1234.56,
      });
      const tenancy = createTestTenancy(landlordId);
      const dto = {
        invoiceId: invoice.id,
        amountGBP: 1234.56,
        method: PaymentMethod.BANK_TRANSFER,
        providerRef: `payment-${Date.now()}`,
        paidAt: new Date().toISOString(),
      };

      const payment = createTestPayment({
        landlordId,
        amountGBP: 1234.56,
      });

      prisma.payment.findUnique.mockResolvedValue(null);
      prisma.invoice.findFirst.mockResolvedValue({
        ...invoice,
        tenancy,
      });
      prisma.payment.create.mockResolvedValue(payment);
      prisma.paymentAllocation.create.mockResolvedValue({});
      prisma.ledgerAccount.findFirst.mockResolvedValue({
        id: 'account-1',
        landlordId,
        type: 'INCOME',
      });
      prisma.ledgerEntry.create.mockResolvedValue({});
      prisma.payment.findFirst.mockResolvedValue({
        ...payment,
        allocations: [],
      });

      const result = await service.recordPayment(landlordId, dto);

      expect(result).toBeDefined();
      expect(prisma.payment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            amountGBP: 1234.56,
          }),
        }),
      );
    });

    it('should handle very small payment amounts', async () => {
      const landlordId = 'landlord-123';
      const invoice = createTestInvoice({
        landlordId,
        amountGBP: 0.01,
      });
      const tenancy = createTestTenancy(landlordId);
      const dto = {
        invoiceId: invoice.id,
        amountGBP: 0.01,
        method: PaymentMethod.BANK_TRANSFER,
        providerRef: `payment-${Date.now()}`,
        paidAt: new Date().toISOString(),
      };

      const payment = createTestPayment({
        landlordId,
        amountGBP: 0.01,
      });

      prisma.payment.findUnique.mockResolvedValue(null);
      prisma.invoice.findFirst.mockResolvedValue({
        ...invoice,
        tenancy,
      });
      prisma.payment.create.mockResolvedValue(payment);
      prisma.paymentAllocation.create.mockResolvedValue({});
      prisma.ledgerAccount.findFirst.mockResolvedValue({
        id: 'account-1',
        landlordId,
        type: 'INCOME',
      });
      prisma.ledgerEntry.create.mockResolvedValue({});
      prisma.payment.findFirst.mockResolvedValue({
        ...payment,
        allocations: [],
      });

      const result = await service.recordPayment(landlordId, dto);

      expect(result).toBeDefined();
    });
  });
});
