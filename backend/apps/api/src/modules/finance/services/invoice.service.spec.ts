import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { InvoiceService } from './invoice.service';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { EventsService } from '../../events/events.service';
import { NotificationsService } from '../../notifications/notifications.service';
import {
  createMockInvoice,
  createMockTenancy,
  createMockPaymentAllocation,
} from '../../../../../../test/finance/fixtures';

describe('InvoiceService', () => {
  let service: InvoiceService;
  let prisma: PrismaService;
  let eventsService: EventsService;
  let notificationsService: NotificationsService;

  const mockPrisma = {
    invoice: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    tenancy: {
      findFirst: jest.fn(),
    },
    ledgerAccount: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    ledgerEntry: {
      create: jest.fn(),
    },
    paymentAllocation: {
      aggregate: jest.fn(),
    },
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
        InvoiceService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
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

    service = module.get<InvoiceService>(InvoiceService);
    prisma = module.get<PrismaService>(PrismaService);
    eventsService = module.get<EventsService>(EventsService);
    notificationsService = module.get<NotificationsService>(NotificationsService);

    // Reset mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createInvoice', () => {
    const landlordId = 'landlord-1';
    const createDto = {
      tenancyId: 'tenancy-1',
      periodStart: '2025-01-01',
      periodEnd: '2025-01-31',
      dueAt: '2025-01-07',
      amountGBP: 1200.0,
      notes: 'Monthly rent',
    };

    it('should create an invoice with valid data', async () => {
      const mockTenancy = createMockTenancy();
      const mockInvoice = createMockInvoice();
      const mockLedgerAccount = {
        id: 'account-1',
        landlordId,
        code: 'RENT-001',
        type: 'INCOME',
        name: 'Rent Receivable',
      };

      mockPrisma.tenancy.findFirst.mockResolvedValue(mockTenancy);
      mockPrisma.invoice.findFirst.mockResolvedValue(null); // No overlapping
      mockPrisma.invoice.findFirst.mockResolvedValueOnce(null); // Latest invoice for numbering
      mockPrisma.invoice.create.mockResolvedValue(mockInvoice);
      mockPrisma.ledgerAccount.findFirst.mockResolvedValue(mockLedgerAccount);
      mockPrisma.ledgerEntry.create.mockResolvedValue({});

      const result = await service.createInvoice(landlordId, createDto);

      expect(result).toEqual(mockInvoice);
      expect(mockPrisma.tenancy.findFirst).toHaveBeenCalledWith({
        where: { id: createDto.tenancyId },
        include: { property: true },
      });
      expect(mockPrisma.invoice.create).toHaveBeenCalled();
      expect(mockEventsService.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'invoice.created',
          landlordId,
        }),
      );
    });

    it('should throw NotFoundException if tenancy not found', async () => {
      mockPrisma.tenancy.findFirst.mockResolvedValue(null);

      await expect(service.createInvoice(landlordId, createDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException if tenancy belongs to different landlord', async () => {
      const mockTenancy = createMockTenancy({
        property: { ownerOrgId: 'different-landlord' },
      });
      mockPrisma.tenancy.findFirst.mockResolvedValue(mockTenancy);

      await expect(service.createInvoice(landlordId, createDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException for overlapping period invoices', async () => {
      const mockTenancy = createMockTenancy();
      const existingInvoice = createMockInvoice();

      mockPrisma.tenancy.findFirst.mockResolvedValue(mockTenancy);
      mockPrisma.invoice.findFirst
        .mockResolvedValueOnce(existingInvoice) // Overlapping check
        .mockResolvedValueOnce(null); // Latest invoice check

      await expect(service.createInvoice(landlordId, createDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should generate sequential invoice numbers', async () => {
      const mockTenancy = createMockTenancy();
      const latestInvoice = createMockInvoice({
        number: 'INV-2025-000005',
      });
      const mockLedgerAccount = {
        id: 'account-1',
        landlordId,
        code: 'RENT-001',
        type: 'INCOME',
        name: 'Rent Receivable',
      };

      mockPrisma.tenancy.findFirst.mockResolvedValue(mockTenancy);
      // Mock invoice.findFirst differently based on parameters
      mockPrisma.invoice.findFirst.mockImplementation((args: any) => {
        // Check for overlapping invoice query
        if (args.where && args.where.OR) {
          return Promise.resolve(null); // No overlapping
        }
        // Check for latest invoice number query
        if (args.where && args.where.number && args.where.number.startsWith) {
          return Promise.resolve(latestInvoice);
        }
        return Promise.resolve(null);
      });
      mockPrisma.invoice.create.mockResolvedValue(
        createMockInvoice({ number: 'INV-2025-000006' }),
      );
      mockPrisma.ledgerAccount.findFirst.mockResolvedValue(mockLedgerAccount);
      mockPrisma.ledgerEntry.create.mockResolvedValue({});

      const result = await service.createInvoice(landlordId, createDto);

      expect(result.number).toBe('INV-2025-000006');
    });
  });

  describe('getInvoice', () => {
    const landlordId = 'landlord-1';
    const invoiceId = 'inv-123';

    it('should return invoice with calculated balance', async () => {
      const mockInvoice = {
        ...createMockInvoice({
          amountGBP: 1200.0,
        }),
        allocations: [
          createMockPaymentAllocation({ amount: 500.0 }),
          createMockPaymentAllocation({ amount: 300.0 }),
        ],
        lines: [],
        creditNotes: [],
      };

      mockPrisma.invoice.findFirst.mockResolvedValue(mockInvoice);

      const result = await service.getInvoice(invoiceId, landlordId);

      expect(result).toMatchObject({
        id: invoiceId,
        paidAmount: 800.0,
        balance: 400.0,
      });
    });

    it('should throw NotFoundException if invoice not found', async () => {
      mockPrisma.invoice.findFirst.mockResolvedValue(null);

      await expect(service.getInvoice(invoiceId, landlordId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should correctly calculate balance for fully paid invoice', async () => {
      const mockInvoice = {
        ...createMockInvoice({
          amountGBP: 1200.0,
        }),
        allocations: [createMockPaymentAllocation({ amount: 1200.0 })],
        lines: [],
        creditNotes: [],
      };

      mockPrisma.invoice.findFirst.mockResolvedValue(mockInvoice);

      const result = await service.getInvoice(invoiceId, landlordId);

      expect(result.paidAmount).toBe(1200.0);
      expect(result.balance).toBe(0);
    });
  });

  describe('voidInvoice', () => {
    const landlordId = 'landlord-1';
    const invoiceId = 'inv-123';

    it('should void an invoice with no payments', async () => {
      const mockInvoice = createMockInvoice({
        status: 'DUE',
        allocations: [],
      });

      mockPrisma.invoice.findFirst.mockResolvedValue(mockInvoice);
      mockPrisma.invoice.update.mockResolvedValue({
        ...mockInvoice,
        status: 'VOID',
      });

      const result = await service.voidInvoice(invoiceId, landlordId);

      expect(result.status).toBe('VOID');
      expect(mockPrisma.invoice.update).toHaveBeenCalledWith({
        where: { id: invoiceId },
        data: { status: 'VOID' },
      });
    });

    it('should throw BadRequestException if invoice has payments', async () => {
      const mockInvoice = createMockInvoice({
        allocations: [createMockPaymentAllocation()],
      });

      mockPrisma.invoice.findFirst.mockResolvedValue(mockInvoice);

      await expect(service.voidInvoice(invoiceId, landlordId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if invoice already voided', async () => {
      const mockInvoice = createMockInvoice({
        status: 'VOID',
        allocations: [],
      });

      mockPrisma.invoice.findFirst.mockResolvedValue(mockInvoice);

      await expect(service.voidInvoice(invoiceId, landlordId)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('updateInvoiceStatus', () => {
    const invoiceId = 'inv-123';

    it('should update status to PAID when fully paid', async () => {
      const mockInvoice = createMockInvoice({
        amountGBP: 1200.0,
        status: 'DUE',
        allocations: [createMockPaymentAllocation({ amount: 1200.0 })],
      });

      mockPrisma.invoice.findUnique.mockResolvedValue(mockInvoice);
      mockPrisma.invoice.update.mockResolvedValue({
        ...mockInvoice,
        status: 'PAID',
      });

      await service.updateInvoiceStatus(invoiceId);

      expect(mockPrisma.invoice.update).toHaveBeenCalledWith({
        where: { id: invoiceId },
        data: { status: 'PAID' },
      });
      expect(mockEventsService.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'invoice.paid',
        }),
      );
    });

    it('should update status to PART_PAID when partially paid and not overdue', async () => {
      const futureDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
      const mockInvoice = createMockInvoice({
        amountGBP: 1200.0,
        status: 'DUE',
        dueAt: futureDate,
        allocations: [createMockPaymentAllocation({ amount: 600.0 })],
      });

      mockPrisma.invoice.findUnique.mockResolvedValue(mockInvoice);
      mockPrisma.invoice.update.mockResolvedValue({
        ...mockInvoice,
        status: 'PART_PAID',
      });

      await service.updateInvoiceStatus(invoiceId);

      expect(mockPrisma.invoice.update).toHaveBeenCalledWith({
        where: { id: invoiceId },
        data: { status: 'PART_PAID' },
      });
    });

    it('should update status to LATE when overdue with balance', async () => {
      const pastDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
      const mockInvoice = createMockInvoice({
        amountGBP: 1200.0,
        status: 'DUE',
        dueAt: pastDate,
        allocations: [],
      });

      mockPrisma.invoice.findUnique.mockResolvedValue(mockInvoice);
      mockPrisma.invoice.update.mockResolvedValue({
        ...mockInvoice,
        status: 'LATE',
      });

      await service.updateInvoiceStatus(invoiceId);

      expect(mockPrisma.invoice.update).toHaveBeenCalledWith({
        where: { id: invoiceId },
        data: { status: 'LATE' },
      });
      expect(mockEventsService.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'invoice.late',
        }),
      );
    });

    it('should not update status if already correct', async () => {
      const futureDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
      const mockInvoice = createMockInvoice({
        amountGBP: 1200.0,
        status: 'DUE',
        dueAt: futureDate, // Not overdue
        allocations: [],
      });

      mockPrisma.invoice.findUnique.mockResolvedValue(mockInvoice);

      await service.updateInvoiceStatus(invoiceId);

      expect(mockPrisma.invoice.update).not.toHaveBeenCalled();
    });

    it('should not process VOID invoices', async () => {
      const mockInvoice = createMockInvoice({
        status: 'VOID',
      });

      mockPrisma.invoice.findUnique.mockResolvedValue(mockInvoice);

      await service.updateInvoiceStatus(invoiceId);

      expect(mockPrisma.invoice.update).not.toHaveBeenCalled();
    });
  });

  describe('listInvoices', () => {
    const landlordId = 'landlord-1';

    it('should list invoices with pagination', async () => {
      const mockInvoices = [
        createMockInvoice({ allocations: [] }),
        createMockInvoice({ id: 'inv-124', allocations: [] }),
      ];

      mockPrisma.invoice.findMany.mockResolvedValue(mockInvoices);
      mockPrisma.invoice.count.mockResolvedValue(10);

      const result = await service.listInvoices(landlordId, { page: 1, limit: 2 });

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(10);
      expect(result.totalPages).toBe(5);
    });

    it('should filter by propertyId', async () => {
      const propertyId = 'prop-1';
      mockPrisma.invoice.findMany.mockResolvedValue([]);
      mockPrisma.invoice.count.mockResolvedValue(0);

      await service.listInvoices(landlordId, { propertyId });

      expect(mockPrisma.invoice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ propertyId }),
        }),
      );
    });

    it('should filter by status', async () => {
      const status = 'LATE';
      mockPrisma.invoice.findMany.mockResolvedValue([]);
      mockPrisma.invoice.count.mockResolvedValue(0);

      await service.listInvoices(landlordId, { status });

      expect(mockPrisma.invoice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status }),
        }),
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle currency rounding correctly', async () => {
      const mockInvoice = {
        ...createMockInvoice({
          amountGBP: 1200.33,
        }),
        allocations: [
          createMockPaymentAllocation({ amount: 600.16 }),
          createMockPaymentAllocation({ amount: 600.17 }),
        ],
        lines: [],
        creditNotes: [],
      };

      mockPrisma.invoice.findFirst.mockResolvedValue(mockInvoice);

      const result = await service.getInvoice('inv-123', 'landlord-1');

      expect(result.paidAmount).toBe(1200.33);
      expect(result.balance).toBe(0);
    });

    it('should handle zero-amount invoices', async () => {
      const mockTenancy = createMockTenancy();
      const createDto = {
        tenancyId: 'tenancy-1',
        periodStart: '2025-01-01',
        periodEnd: '2025-01-31',
        dueAt: '2025-01-07',
        amountGBP: 0,
      };

      mockPrisma.tenancy.findFirst.mockResolvedValue(mockTenancy);
      mockPrisma.invoice.findFirst.mockResolvedValue(null);
      mockPrisma.invoice.create.mockResolvedValue(
        createMockInvoice({ amountGBP: 0 }),
      );
      mockPrisma.ledgerAccount.findFirst.mockResolvedValue({
        id: 'account-1',
      });
      mockPrisma.ledgerEntry.create.mockResolvedValue({});

      const result = await service.createInvoice('landlord-1', createDto);

      expect(result.amountGBP).toBe(0);
    });
  });
});
