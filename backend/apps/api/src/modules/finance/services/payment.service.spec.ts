import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { InvoiceService } from './invoice.service';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { EventsService } from '../../events/events.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { PaymentMethod, PaymentProvider } from '../dto/record-payment.dto';
import {
  createMockPayment,
  createMockInvoice,
  createMockPaymentAllocation,
} from '../../../../../../test/finance/fixtures';

describe('PaymentService', () => {
  let service: PaymentService;
  let prisma: PrismaService;
  let invoiceService: InvoiceService;
  let eventsService: EventsService;
  let notificationsService: NotificationsService;

  const mockPrisma = {
    payment: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    invoice: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
    },
    paymentAllocation: {
      create: jest.fn(),
      createMany: jest.fn(),
      findMany: jest.fn(),
    },
    ledgerAccount: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    ledgerEntry: {
      create: jest.fn(),
    },
  };

  const mockInvoiceService = {
    updateInvoiceStatus: jest.fn(),
    getInvoice: jest.fn(),
  };

  const mockEventsService = {
    emit: jest.fn(),
  };

  const mockNotificationsService = {
    create: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
        {
          provide: InvoiceService,
          useValue: mockInvoiceService,
        },
        {
          provide: EventsService,
          useValue: mockEventsService,
        },
        {
          provide: NotificationsService,
          useValue: mockNotificationsService,
        },
      ],
    }).compile();

    service = module.get<PaymentService>(PaymentService);
    prisma = module.get<PrismaService>(PrismaService);
    invoiceService = module.get<InvoiceService>(InvoiceService);
    eventsService = module.get<EventsService>(EventsService);
    notificationsService = module.get<NotificationsService>(NotificationsService);

    // Reset mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('recordPayment', () => {
    const landlordId = 'landlord-1';
    const recordDto = {
      invoiceId: 'inv-123',
      amountGBP: 1200.0,
      method: PaymentMethod.BANK_TRANSFER,
      provider: PaymentProvider.TEST,
      providerRef: 'test-ref-123',
      paidAt: '2025-01-07T00:00:00Z',
      feeGBP: 0,
      vatGBP: 0,
    };

    it('should record a payment with valid data', async () => {
      const mockInvoice = createMockInvoice({
        tenancy: {
          property: { ownerOrgId: landlordId },
        },
      });
      const mockPayment = createMockPayment();
      const mockLedgerAccount = {
        id: 'account-1',
        landlordId,
        code: 'RENT-001',
        type: 'INCOME',
        name: 'Rent Receivable',
      };

      mockPrisma.payment.findUnique.mockResolvedValue(null); // No duplicate
      mockPrisma.invoice.findFirst.mockResolvedValue(mockInvoice);
      mockPrisma.payment.create.mockResolvedValue(mockPayment);
      mockPrisma.paymentAllocation.create.mockResolvedValue({});
      mockPrisma.ledgerAccount.findFirst.mockResolvedValue(mockLedgerAccount);
      mockPrisma.ledgerEntry.create.mockResolvedValue({});
      mockPrisma.payment.findFirst.mockResolvedValue({
        ...mockPayment,
        allocations: [createMockPaymentAllocation()],
      });

      const result = await service.recordPayment(landlordId, recordDto);

      expect(mockPrisma.payment.create).toHaveBeenCalled();
      expect(mockPrisma.paymentAllocation.create).toHaveBeenCalledWith({
        data: {
          paymentId: mockPayment.id,
          invoiceId: recordDto.invoiceId,
          amount: recordDto.amountGBP,
        },
      });
      expect(mockInvoiceService.updateInvoiceStatus).toHaveBeenCalledWith(
        recordDto.invoiceId,
      );
      expect(mockEventsService.emit).toHaveBeenCalled();
    });

    it('should return existing payment if providerRef already exists (idempotency)', async () => {
      const existingPayment = createMockPayment({ id: 'existing-pay' });
      const mockPaymentWithAllocations = {
        ...existingPayment,
        allocations: [{ invoice: createMockInvoice() }],
      };

      mockPrisma.payment.findUnique.mockResolvedValue(existingPayment);
      mockPrisma.payment.findFirst.mockResolvedValue(mockPaymentWithAllocations);

      const result = await service.recordPayment(landlordId, recordDto);

      expect(result).toBeDefined();
      expect(mockPrisma.payment.create).not.toHaveBeenCalled();
      expect(mockPrisma.paymentAllocation.create).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if invoice not found', async () => {
      mockPrisma.payment.findUnique.mockResolvedValue(null);
      mockPrisma.invoice.findFirst.mockResolvedValue(null);

      await expect(service.recordPayment(landlordId, recordDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException if invoice belongs to different landlord', async () => {
      const mockInvoice = createMockInvoice({
        landlordId: 'different-landlord',
      });

      mockPrisma.payment.findUnique.mockResolvedValue(null);
      mockPrisma.invoice.findFirst.mockResolvedValue(null); // Returns null for different landlord

      await expect(service.recordPayment(landlordId, recordDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should handle payment with fees and VAT', async () => {
      const dtoWithFees = {
        ...recordDto,
        feeGBP: 10.5,
        vatGBP: 2.1,
      };
      const mockInvoice = createMockInvoice({
        tenancy: { property: { ownerOrgId: landlordId } },
      });
      const mockPayment = createMockPayment({
        feeGBP: 10.5,
        vatGBP: 2.11,
      });
      const mockLedgerAccount = {
        id: 'account-1',
      };

      mockPrisma.payment.findUnique.mockResolvedValue(null);
      mockPrisma.invoice.findFirst.mockResolvedValue(mockInvoice);
      mockPrisma.payment.create.mockResolvedValue(mockPayment);
      mockPrisma.paymentAllocation.create.mockResolvedValue({});
      mockPrisma.ledgerAccount.findFirst.mockResolvedValue(mockLedgerAccount);
      mockPrisma.ledgerEntry.create.mockResolvedValue({});
      mockPrisma.payment.findFirst.mockResolvedValue({
        ...mockPayment,
        allocations: [createMockPaymentAllocation()],
      });

      const result = await service.recordPayment(landlordId, dtoWithFees);

      expect(mockPrisma.payment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            feeGBP: 10.5,
            vatGBP: 2.1,
          }),
        }),
      );
    });
  });

  describe('handleWebhookPayment (PSP webhook handling)', () => {
    const webhookDto = {
      provider: PaymentProvider.GOCARDLESS,
      providerRef: 'webhook-ref-123',
      providerPaymentId: 'pm-123',
      amountGBP: 1200.0,
      status: 'SETTLED',
      paidAt: '2025-01-07T00:00:00Z',
      metadata: {
        invoiceId: 'inv-123',
        landlordId: 'landlord-1',
      },
    };

    it('should handle webhook payment and be idempotent', async () => {
      const mockInvoice = createMockInvoice({
        tenancy: { property: { ownerOrgId: 'landlord-1' } },
      });
      const mockPayment = createMockPayment();
      const mockLedgerAccount = { id: 'account-1' };
      const mockPaymentWithAllocations = {
        ...mockPayment,
        allocations: [{ invoice: mockInvoice }],
      };

      mockPrisma.payment.findUnique.mockResolvedValue(null); // First call
      mockPrisma.invoice.findFirst.mockResolvedValue(mockInvoice);
      mockPrisma.payment.create.mockResolvedValue(mockPayment);
      mockPrisma.paymentAllocation.create.mockResolvedValue({});
      mockPrisma.ledgerAccount.findFirst.mockResolvedValue(mockLedgerAccount);
      mockPrisma.ledgerEntry.create.mockResolvedValue({});
      mockPrisma.payment.findFirst.mockResolvedValue(mockPaymentWithAllocations);

      // First webhook call
      await service.recordPayment('landlord-1', {
        invoiceId: webhookDto.metadata.invoiceId,
        amountGBP: webhookDto.amountGBP,
        method: PaymentMethod.DD,
        provider: webhookDto.provider,
        providerRef: webhookDto.providerRef,
        paidAt: webhookDto.paidAt,
        feeGBP: 0,
        vatGBP: 0,
      });

      // Second webhook call (replay)
      mockPrisma.payment.findUnique.mockResolvedValue(mockPayment);
      await service.recordPayment('landlord-1', {
        invoiceId: webhookDto.metadata.invoiceId,
        amountGBP: webhookDto.amountGBP,
        method: PaymentMethod.DD,
        provider: webhookDto.provider,
        providerRef: webhookDto.providerRef,
        paidAt: webhookDto.paidAt,
        feeGBP: 0,
        vatGBP: 0,
      });

      // Payment created only once
      expect(mockPrisma.payment.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('getPayment', () => {
    const paymentId = 'pay-123';
    const landlordId = 'landlord-1';

    it('should return payment with allocations', async () => {
      const mockPayment = {
        ...createMockPayment(),
        allocations: [
          {
            ...createMockPaymentAllocation(),
            invoice: createMockInvoice(),
          },
        ],
      };

      mockPrisma.payment.findFirst.mockResolvedValue(mockPayment);

      const result = await service.getPayment(paymentId, landlordId);

      expect(result).toBeDefined();
      expect(result.allocations).toHaveLength(1);
      expect(mockPrisma.payment.findFirst).toHaveBeenCalledWith({
        where: {
          id: paymentId,
          landlordId,
        },
        include: {
          allocations: {
            include: {
              invoice: true,
            },
          },
        },
      });
    });

    it('should throw NotFoundException if payment not found', async () => {
      mockPrisma.payment.findFirst.mockResolvedValue(null);

      await expect(service.getPayment(paymentId, landlordId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('listPayments', () => {
    const landlordId = 'landlord-1';

    it('should list payments with pagination', async () => {
      const mockPayments = [
        {
          ...createMockPayment(),
          allocations: [createMockPaymentAllocation()],
        },
        {
          ...createMockPayment({ id: 'pay-124' }),
          allocations: [createMockPaymentAllocation()],
        },
      ];

      mockPrisma.payment.findMany.mockResolvedValue(mockPayments);
      mockPrisma.payment.count.mockResolvedValue(10);

      const result = await service.listPayments(landlordId, { page: 1, limit: 2 });

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(10);
      expect(result.totalPages).toBe(5);
    });

    it('should filter by propertyId', async () => {
      const propertyId = 'prop-1';
      mockPrisma.payment.findMany.mockResolvedValue([]);
      mockPrisma.payment.count.mockResolvedValue(0);

      await service.listPayments(landlordId, { propertyId });

      expect(mockPrisma.payment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ propertyId }),
        }),
      );
    });

    it('should filter by status', async () => {
      const status = 'SETTLED';
      mockPrisma.payment.findMany.mockResolvedValue([]);
      mockPrisma.payment.count.mockResolvedValue(0);

      await service.listPayments(landlordId, { status });

      expect(mockPrisma.payment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status }),
        }),
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle partial payments correctly', async () => {
      const landlordId = 'landlord-1';
      const partialDto = {
        invoiceId: 'inv-123',
        amountGBP: 600.0, // Partial payment of 1200
        method: PaymentMethod.BANK_TRANSFER,
        provider: PaymentProvider.TEST,
        providerRef: 'partial-ref-123',
        paidAt: '2025-01-07T00:00:00Z',
        feeGBP: 0,
        vatGBP: 0,
      };
      const mockInvoice = createMockInvoice({
        amountGBP: 1200.0,
        tenancy: { property: { ownerOrgId: landlordId } },
      });
      const mockPayment = createMockPayment({ amountGBP: 600.0 });
      const mockLedgerAccount = { id: 'account-1' };
      const mockPaymentWithAllocations = {
        ...mockPayment,
        allocations: [{ invoice: mockInvoice }],
      };

      mockPrisma.payment.findUnique.mockResolvedValue(null);
      mockPrisma.invoice.findFirst.mockResolvedValue(mockInvoice);
      mockPrisma.payment.create.mockResolvedValue(mockPayment);
      mockPrisma.paymentAllocation.create.mockResolvedValue({});
      mockPrisma.ledgerAccount.findFirst.mockResolvedValue(mockLedgerAccount);
      mockPrisma.ledgerEntry.create.mockResolvedValue({});
      mockPrisma.payment.findFirst.mockResolvedValue(mockPaymentWithAllocations);

      const result = await service.recordPayment(landlordId, partialDto);

      expect(mockPrisma.paymentAllocation.create).toHaveBeenCalledWith({
        data: {
          paymentId: mockPayment.id,
          invoiceId: partialDto.invoiceId,
          amount: 600.0,
        },
      });
    });

    it('should handle currency rounding in payments', async () => {
      const landlordId = 'landlord-1';
      const roundingDto = {
        invoiceId: 'inv-123',
        amountGBP: 1200.33,
        method: PaymentMethod.BANK_TRANSFER,
        provider: PaymentProvider.TEST,
        providerRef: 'rounding-ref-123',
        paidAt: '2025-01-07T00:00:00Z',
        feeGBP: 10.55,
        vatGBP: 2.11,
      };
      const mockInvoice = createMockInvoice({
        tenancy: { property: { ownerOrgId: landlordId } },
      });
      const mockPayment = createMockPayment({
        amountGBP: 1200.33,
        feeGBP: 10.55,
        vatGBP: 2.11,
      });
      const mockLedgerAccount = { id: 'account-1' };
      const mockPaymentWithAllocations = {
        ...mockPayment,
        allocations: [{ invoice: mockInvoice }],
      };

      mockPrisma.payment.findUnique.mockResolvedValue(null);
      mockPrisma.invoice.findFirst.mockResolvedValue(mockInvoice);
      mockPrisma.payment.create.mockResolvedValue(mockPayment);
      mockPrisma.paymentAllocation.create.mockResolvedValue({});
      mockPrisma.ledgerAccount.findFirst.mockResolvedValue(mockLedgerAccount);
      mockPrisma.ledgerEntry.create.mockResolvedValue({});
      mockPrisma.payment.findFirst.mockResolvedValue(mockPaymentWithAllocations);

      const result = await service.recordPayment(landlordId, roundingDto);

      expect(mockPrisma.payment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            amountGBP: 1200.33,
            feeGBP: 10.55,
            vatGBP: 2.11,
          }),
        }),
      );
    });

    it('should handle multiple webhook replays with same providerRef', async () => {
      const landlordId = 'landlord-1';
      const recordDto = {
        invoiceId: 'inv-123',
        amountGBP: 1200.0,
        method: PaymentMethod.BANK_TRANSFER,
        provider: PaymentProvider.TEST,
        providerRef: 'replay-ref-123',
        paidAt: '2025-01-07T00:00:00Z',
        feeGBP: 0,
        vatGBP: 0,
      };
      const existingPayment = createMockPayment({ id: 'existing-pay' });
      const mockInvoice = createMockInvoice({
        allocations: [createMockPaymentAllocation()],
      });

      mockPrisma.payment.findUnique.mockResolvedValue(existingPayment);
      mockPrisma.payment.findFirst.mockResolvedValue({
        ...existingPayment,
        allocations: [createMockPaymentAllocation()],
      });

      // Replay 5 times
      for (let i = 0; i < 5; i++) {
        await service.getPayment(existingPayment.id, landlordId);
      }

      // getPayment called 5 times (uses findFirst internally)
      expect(mockPrisma.payment.findFirst).toHaveBeenCalledTimes(5);
      // Payment never created (uses existing)
      expect(mockPrisma.payment.create).not.toHaveBeenCalled();
    });
  });
});
