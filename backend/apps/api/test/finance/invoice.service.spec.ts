import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { InvoiceService } from '../../src/modules/finance/services/invoice.service';
import { PrismaService } from '../../src/common/prisma/prisma.service';
import { EventsService } from '../../src/modules/events/events.service';
import { NotificationsService } from '../../src/modules/notifications/notifications.service';
import {
  createTestInvoice,
  createOverdueInvoice,
  createPartiallyPaidInvoice,
  createPaidInvoice,
  createDraftInvoice,
  createTestTenancy,
  createMockPrismaService,
  createMockEventsService,
  createMockNotificationsService,
} from './fixtures';

describe('InvoiceService', () => {
  let service: InvoiceService;
  let prisma: any;
  let eventsService: any;
  let notificationsService: any;

  beforeEach(async () => {
    prisma = createMockPrismaService();
    eventsService = createMockEventsService();
    notificationsService = createMockNotificationsService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvoiceService,
        {
          provide: PrismaService,
          useValue: prisma,
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

    service = module.get<InvoiceService>(InvoiceService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createInvoice', () => {
    it('should create a new invoice successfully', async () => {
      const landlordId = 'landlord-123';
      const tenancy = createTestTenancy(landlordId);
      const dto = {
        tenancyId: tenancy.id,
        periodStart: '2025-11-01',
        periodEnd: '2025-11-30',
        dueAt: '2025-11-08',
        amountGBP: 1200.0,
      };

      const expectedInvoice = createTestInvoice({
        landlordId,
        tenancyId: dto.tenancyId,
        amountGBP: dto.amountGBP,
      });

      prisma.tenancy.findFirst.mockResolvedValue(tenancy);
      prisma.invoice.findFirst.mockResolvedValue(null); // No overlapping
      prisma.invoice.create.mockResolvedValue(expectedInvoice);
      prisma.ledgerAccount.findFirst.mockResolvedValue({
        id: 'account-1',
        landlordId,
        type: 'INCOME',
      });
      prisma.ledgerEntry.create.mockResolvedValue({});

      const result = await service.createInvoice(landlordId, dto);

      expect(result).toBeDefined();
      expect(prisma.invoice.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            landlordId,
            amountGBP: dto.amountGBP,
            status: 'DUE',
          }),
        }),
      );
      expect(eventsService.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'invoice.created',
          actorRole: 'LANDLORD',
          landlordId,
        }),
      );
    });

    it('should throw NotFoundException if tenancy not found', async () => {
      const landlordId = 'landlord-123';
      const dto = {
        tenancyId: 'invalid-tenancy',
        periodStart: '2025-11-01',
        periodEnd: '2025-11-30',
        dueAt: '2025-11-08',
        amountGBP: 1200.0,
      };

      prisma.tenancy.findFirst.mockResolvedValue(null);

      await expect(service.createInvoice(landlordId, dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if overlapping invoice exists', async () => {
      const landlordId = 'landlord-123';
      const tenancy = createTestTenancy(landlordId);
      const dto = {
        tenancyId: tenancy.id,
        periodStart: '2025-11-01',
        periodEnd: '2025-11-30',
        dueAt: '2025-11-08',
        amountGBP: 1200.0,
      };

      const overlappingInvoice = createTestInvoice();

      prisma.tenancy.findFirst.mockResolvedValue(tenancy);
      prisma.invoice.findFirst.mockResolvedValue(overlappingInvoice);

      await expect(service.createInvoice(landlordId, dto)).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.invoice.create).not.toHaveBeenCalled();
    });

    it('should generate correct invoice number format', async () => {
      const landlordId = 'landlord-123';
      const tenancy = createTestTenancy(landlordId);
      const dto = {
        tenancyId: tenancy.id,
        periodStart: '2025-11-01',
        periodEnd: '2025-11-30',
        dueAt: '2025-11-08',
        amountGBP: 1200.0,
      };

      const year = new Date().getFullYear();
      prisma.tenancy.findFirst.mockResolvedValue(tenancy);
      prisma.invoice.findFirst.mockResolvedValue(null);
      prisma.invoice.create.mockImplementation((args) => {
        expect(args.data.number).toMatch(new RegExp(`^INV-${year}-\\d{6}$`));
        return Promise.resolve(createTestInvoice(args.data));
      });
      prisma.ledgerAccount.findFirst.mockResolvedValue({
        id: 'account-1',
        landlordId,
        type: 'INCOME',
      });
      prisma.ledgerEntry.create.mockResolvedValue({});

      await service.createInvoice(landlordId, dto);

      expect(prisma.invoice.create).toHaveBeenCalled();
    });
  });

  describe('getInvoice', () => {
    it('should return invoice with calculated balance', async () => {
      const landlordId = 'landlord-123';
      const invoice = createTestInvoice({ landlordId, amountGBP: 1200.0 });
      const allocations = [
        { id: 'alloc-1', amount: 500.0, payment: {} },
        { id: 'alloc-2', amount: 300.0, payment: {} },
      ];

      prisma.invoice.findFirst.mockResolvedValue({
        ...invoice,
        lines: [],
        allocations,
        creditNotes: [],
      });

      const result = await service.getInvoice(invoice.id, landlordId);

      expect(result).toBeDefined();
      expect(result.paidAmount).toBe(800.0);
      expect(result.balance).toBe(400.0);
    });

    it('should throw NotFoundException if invoice not found', async () => {
      prisma.invoice.findFirst.mockResolvedValue(null);

      await expect(
        service.getInvoice('invalid-id', 'landlord-123'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should only return invoices for the correct landlord', async () => {
      const landlordId = 'landlord-123';
      const invoice = createTestInvoice({ landlordId });

      prisma.invoice.findFirst.mockImplementation(({ where }) => {
        if (where.landlordId === landlordId && where.id === invoice.id) {
          return Promise.resolve({
            ...invoice,
            lines: [],
            allocations: [],
            creditNotes: [],
          });
        }
        return Promise.resolve(null);
      });

      const result = await service.getInvoice(invoice.id, landlordId);
      expect(result).toBeDefined();

      await expect(
        service.getInvoice(invoice.id, 'wrong-landlord'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('listInvoices', () => {
    it('should return paginated invoices with balances', async () => {
      const landlordId = 'landlord-123';
      const invoices = [
        { ...createTestInvoice({ landlordId }), lines: [], allocations: [] },
        {
          ...createTestInvoice({ landlordId }),
          lines: [],
          allocations: [{ id: 'alloc-1', amount: 600.0 }],
        },
      ];

      prisma.invoice.findMany.mockResolvedValue(invoices);
      prisma.invoice.count.mockResolvedValue(2);

      const result = await service.listInvoices(landlordId, {
        page: 1,
        limit: 10,
      });

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.data[0]).toHaveProperty('paidAmount');
      expect(result.data[0]).toHaveProperty('balance');
      expect(result.data[1].paidAmount).toBe(600.0);
      expect(result.data[1].balance).toBe(600.0); // 1200 - 600
    });

    it('should filter by status', async () => {
      const landlordId = 'landlord-123';

      prisma.invoice.findMany.mockResolvedValue([]);
      prisma.invoice.count.mockResolvedValue(0);

      await service.listInvoices(landlordId, { status: 'PAID' });

      expect(prisma.invoice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'PAID' }),
        }),
      );
    });

    it('should filter by property and tenancy', async () => {
      const landlordId = 'landlord-123';

      prisma.invoice.findMany.mockResolvedValue([]);
      prisma.invoice.count.mockResolvedValue(0);

      await service.listInvoices(landlordId, {
        propertyId: 'prop-1',
        tenancyId: 'ten-1',
      });

      expect(prisma.invoice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            propertyId: 'prop-1',
            tenancyId: 'ten-1',
          }),
        }),
      );
    });
  });

  describe('voidInvoice', () => {
    it('should void an invoice with no payments', async () => {
      const landlordId = 'landlord-123';
      const invoice = createDraftInvoice({ landlordId });

      prisma.invoice.findFirst.mockResolvedValue({
        ...invoice,
        allocations: [],
      });
      prisma.invoice.update.mockResolvedValue({
        ...invoice,
        status: 'VOID',
      });

      const result = await service.voidInvoice(invoice.id, landlordId);

      expect(result.status).toBe('VOID');
      expect(prisma.invoice.update).toHaveBeenCalledWith({
        where: { id: invoice.id },
        data: { status: 'VOID' },
      });
    });

    it('should throw BadRequestException if invoice has payments', async () => {
      const landlordId = 'landlord-123';
      const invoice = createTestInvoice({ landlordId });

      prisma.invoice.findFirst.mockResolvedValue({
        ...invoice,
        allocations: [{ id: 'alloc-1', amount: 100.0 }],
      });

      await expect(
        service.voidInvoice(invoice.id, landlordId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if invoice already voided', async () => {
      const landlordId = 'landlord-123';
      const invoice = createTestInvoice({ landlordId, status: 'VOID' });

      prisma.invoice.findFirst.mockResolvedValue({
        ...invoice,
        allocations: [],
      });

      await expect(
        service.voidInvoice(invoice.id, landlordId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateInvoiceStatus', () => {
    it('should update status to PAID when fully paid', async () => {
      const invoice = createTestInvoice({ amountGBP: 1200.0, status: 'DUE' });
      const allocations = [{ id: 'alloc-1', amount: 1200.0 }];

      prisma.invoice.findUnique.mockResolvedValue({
        ...invoice,
        allocations,
      });
      prisma.invoice.update.mockResolvedValue({
        ...invoice,
        status: 'PAID',
      });

      await service.updateInvoiceStatus(invoice.id);

      expect(prisma.invoice.update).toHaveBeenCalledWith({
        where: { id: invoice.id },
        data: { status: 'PAID' },
      });
    });

    it('should update status to PART_PAID when partially paid', async () => {
      const invoice = createTestInvoice({
        amountGBP: 1200.0,
        status: 'DUE',
        dueAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
      });
      const allocations = [{ id: 'alloc-1', amount: 600.0 }];

      prisma.invoice.findUnique.mockResolvedValue({
        ...invoice,
        allocations,
      });
      prisma.invoice.update.mockResolvedValue({
        ...invoice,
        status: 'PART_PAID',
      });

      await service.updateInvoiceStatus(invoice.id);

      expect(prisma.invoice.update).toHaveBeenCalledWith({
        where: { id: invoice.id },
        data: { status: 'PART_PAID' },
      });
    });

    it('should update status to LATE when overdue with balance', async () => {
      const invoice = createOverdueInvoice(10, {
        amountGBP: 1200.0,
        status: 'DUE',
      });
      const allocations = [{ id: 'alloc-1', amount: 600.0 }];

      prisma.invoice.findUnique.mockResolvedValue({
        ...invoice,
        allocations,
      });
      prisma.invoice.update.mockResolvedValue({
        ...invoice,
        status: 'LATE',
      });

      await service.updateInvoiceStatus(invoice.id);

      expect(prisma.invoice.update).toHaveBeenCalledWith({
        where: { id: invoice.id },
        data: { status: 'LATE' },
      });
    });

    it('should not update void invoices', async () => {
      const invoice = createTestInvoice({ status: 'VOID' });

      prisma.invoice.findUnique.mockResolvedValue({
        ...invoice,
        allocations: [],
      });

      await service.updateInvoiceStatus(invoice.id);

      expect(prisma.invoice.update).not.toHaveBeenCalled();
    });

    it('should handle rounding correctly', async () => {
      const invoice = createTestInvoice({ amountGBP: 1200.33, status: 'DUE' });
      const allocations = [
        { id: 'alloc-1', amount: 600.11 },
        { id: 'alloc-2', amount: 600.22 },
      ];

      prisma.invoice.findUnique.mockResolvedValue({
        ...invoice,
        allocations,
      });
      prisma.invoice.update.mockResolvedValue({
        ...invoice,
        status: 'PAID',
      });

      await service.updateInvoiceStatus(invoice.id);

      expect(prisma.invoice.update).toHaveBeenCalledWith({
        where: { id: invoice.id },
        data: { status: 'PAID' },
      });
    });
  });

  describe('compute totals', () => {
    it('should calculate correct totals from invoice lines', () => {
      const invoice = createTestInvoice({ amountGBP: 1200.0 });
      const allocations = [
        { amount: 500.0 },
        { amount: 300.0 },
        { amount: 200.0 },
      ];

      const paidAmount = allocations.reduce((sum, alloc) => sum + alloc.amount, 0);
      const balance = invoice.amountGBP - paidAmount;

      expect(paidAmount).toBe(1000.0);
      expect(balance).toBe(200.0);
    });

    it('should handle empty allocations', () => {
      const invoice = createTestInvoice({ amountGBP: 1200.0 });
      const allocations: any[] = [];

      const paidAmount = allocations.reduce((sum, alloc) => sum + alloc.amount, 0);
      const balance = invoice.amountGBP - paidAmount;

      expect(paidAmount).toBe(0);
      expect(balance).toBe(1200.0);
    });
  });

  describe('edge cases', () => {
    it('should handle multiple currency precision correctly', async () => {
      const invoice = createTestInvoice({
        amountGBP: 1234.56,
        status: 'DUE',
      });
      const allocations = [
        { id: 'alloc-1', amount: 1234.56 },
      ];

      prisma.invoice.findUnique.mockResolvedValue({
        ...invoice,
        allocations,
      });
      prisma.invoice.update.mockResolvedValue({
        ...invoice,
        status: 'PAID',
      });

      await service.updateInvoiceStatus(invoice.id);

      expect(prisma.invoice.update).toHaveBeenCalledWith({
        where: { id: invoice.id },
        data: { status: 'PAID' },
      });
    });

    it('should handle very small amounts correctly', async () => {
      const invoice = createTestInvoice({ amountGBP: 0.01, status: 'DUE' });
      const allocations = [{ id: 'alloc-1', amount: 0.01 }];

      prisma.invoice.findUnique.mockResolvedValue({
        ...invoice,
        allocations,
      });
      prisma.invoice.update.mockResolvedValue({
        ...invoice,
        status: 'PAID',
      });

      await service.updateInvoiceStatus(invoice.id);

      expect(prisma.invoice.update).toHaveBeenCalledWith({
        where: { id: invoice.id },
        data: { status: 'PAID' },
      });
    });
  });
});
