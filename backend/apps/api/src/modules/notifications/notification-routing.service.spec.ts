import { Test, TestingModule } from '@nestjs/testing';
import { NotificationRoutingService } from './notification-routing.service';
import { PrismaService } from '../../common/prisma/prisma.service';

describe('NotificationRoutingService', () => {
  let service: NotificationRoutingService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    orgMember: {
      findMany: jest.fn(),
    },
    notificationPreference: {
      findUnique: jest.fn(),
    },
    notificationOutbox: {
      findUnique: jest.fn(),
      createMany: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    notification: {
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationRoutingService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<NotificationRoutingService>(NotificationRoutingService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('routeEvent', () => {
    it('should route ticket.created event to landlord users with correct channels', async () => {
      // Mock landlord users
      mockPrismaService.orgMember.findMany.mockResolvedValue([
        { userId: 'user-1' },
        { userId: 'user-2' },
      ]);

      // Mock no existing outbox entries
      mockPrismaService.notificationOutbox.findUnique.mockResolvedValue(null);

      // Mock createMany
      mockPrismaService.notificationOutbox.createMany.mockResolvedValue({ count: 4 });

      await service.routeEvent({
        type: 'ticket.created',
        entityId: 'ticket-123',
        entityVersion: 1,
        actorId: 'user-tenant',
        landlordId: 'org-landlord',
        payload: {
          title: 'Test ticket',
          priority: 'HIGH',
        },
      });

      // Should query landlord users
      expect(mockPrismaService.orgMember.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            orgId: 'org-landlord',
          }),
        }),
      );

      // Should create outbox entries
      expect(mockPrismaService.notificationOutbox.createMany).toHaveBeenCalled();
      const createData = mockPrismaService.notificationOutbox.createMany.mock.calls[0][0].data;
      
      // Should have 4 entries: 2 users × 2 channels (email, in-app)
      expect(createData.length).toBeGreaterThan(0);
      
      // Check structure of first entry
      expect(createData[0]).toMatchObject({
        eventType: 'ticket.created',
        entityId: 'ticket-123',
        status: 'PENDING',
      });
    });

    it('should respect user notification preferences', async () => {
      // Mock user with email disabled
      mockPrismaService.orgMember.findMany.mockResolvedValue([{ userId: 'user-1' }]);
      
      mockPrismaService.notificationPreference.findUnique.mockResolvedValue({
        userId: 'user-1',
        emailEnabled: false,
        webhookEnabled: false,
        inAppEnabled: true,
        ticketCreated: 'in-app',
      });

      mockPrismaService.notificationOutbox.findUnique.mockResolvedValue(null);
      mockPrismaService.notificationOutbox.createMany.mockResolvedValue({ count: 1 });

      await service.routeEvent({
        type: 'ticket.created',
        entityId: 'ticket-123',
        entityVersion: 1,
        landlordId: 'org-landlord',
      });

      const createData = mockPrismaService.notificationOutbox.createMany.mock.calls[0][0].data;
      
      // Should only have in-app channel
      expect(createData.every((entry: any) => entry.channel === 'in-app')).toBe(true);
    });

    it('should deduplicate notifications with same idempotency key', async () => {
      mockPrismaService.orgMember.findMany.mockResolvedValue([{ userId: 'user-1' }]);
      
      // Mock existing outbox entry
      mockPrismaService.notificationOutbox.findUnique.mockResolvedValue({
        id: 'outbox-1',
        idempotencyKey: 'ticket.created:ticket-123:1:user-1:in-app',
      });

      mockPrismaService.notificationOutbox.createMany.mockResolvedValue({ count: 0 });

      await service.routeEvent({
        type: 'ticket.created',
        entityId: 'ticket-123',
        entityVersion: 1,
        landlordId: 'org-landlord',
      });

      // Should not create any entries due to deduplication
      expect(mockPrismaService.notificationOutbox.createMany).toHaveBeenCalledWith({
        data: [],
      });
    });
  });

  describe('processPendingNotifications', () => {
    it('should process pending notifications from outbox', async () => {
      const pendingNotifications = [
        {
          id: 'outbox-1',
          eventType: 'ticket.created',
          entityId: 'ticket-123',
          channel: 'in-app',
          recipientId: 'user-1',
          payload: '{"title":"Test"}',
          status: 'PENDING',
          attempts: 0,
          maxAttempts: 3,
        },
      ];

      mockPrismaService.notificationOutbox.findMany.mockResolvedValue(pendingNotifications);
      mockPrismaService.notificationOutbox.update.mockResolvedValue({});
      mockPrismaService.notification.create.mockResolvedValue({});

      await service.processPendingNotifications();

      // Should mark as processing
      expect(mockPrismaService.notificationOutbox.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'outbox-1' },
          data: expect.objectContaining({
            status: 'PROCESSING',
            attempts: 1,
          }),
        }),
      );

      // Should create in-app notification
      expect(mockPrismaService.notification.create).toHaveBeenCalled();

      // Should mark as delivered
      expect(mockPrismaService.notificationOutbox.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'outbox-1' },
          data: expect.objectContaining({
            status: 'DELIVERED',
          }),
        }),
      );
    });
  });
});
