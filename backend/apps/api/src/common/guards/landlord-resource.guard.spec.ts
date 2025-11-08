import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, NotFoundException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { LandlordResourceGuard, RESOURCE_TYPE_KEY } from './landlord-resource.guard';
import { PrismaService } from '../prisma/prisma.service';

describe('LandlordResourceGuard', () => {
  let guard: LandlordResourceGuard;
  let reflector: Reflector;
  let prisma: PrismaService;

  const mockPrismaService = {
    property: {
      findUnique: jest.fn(),
    },
    tenancy: {
      findUnique: jest.fn(),
    },
    ticket: {
      findUnique: jest.fn(),
    },
    invoice: {
      findUnique: jest.fn(),
    },
    payment: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LandlordResourceGuard,
        Reflector,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    guard = module.get<LandlordResourceGuard>(LandlordResourceGuard);
    reflector = module.get<Reflector>(Reflector);
    prisma = module.get<PrismaService>(PrismaService);

    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  const createMockExecutionContext = (
    user: any,
    resourceId: string,
    resourceType?: string,
  ): ExecutionContext => {
    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({
          user,
          params: { id: resourceId },
        }),
      }),
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as any;

    // Mock reflector to return resourceType
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(resourceType);

    return mockContext;
  };

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('when no resource type is specified', () => {
    it('should allow access', async () => {
      const context = createMockExecutionContext(
        { id: 'user-1', orgs: [] },
        'resource-1',
        undefined, // No resource type
      );

      const result = await guard.canActivate(context);
      expect(result).toBe(true);
    });
  });

  describe('when no resource ID in params', () => {
    it('should allow access', async () => {
      const context = {
        switchToHttp: () => ({
          getRequest: () => ({
            user: { id: 'user-1', orgs: [] },
            params: {}, // No id in params
          }),
        }),
        getHandler: jest.fn(),
        getClass: jest.fn(),
      } as any;

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue('property');

      const result = await guard.canActivate(context);
      expect(result).toBe(true);
    });
  });

  describe('when user is not a landlord', () => {
    it('should allow access (lets RolesGuard handle role checks)', async () => {
      const context = createMockExecutionContext(
        { id: 'user-1', orgs: [{ orgId: 'org-1', role: 'TENANT' }] },
        'property-1',
        'property',
      );

      const result = await guard.canActivate(context);
      expect(result).toBe(true);
    });
  });

  describe('property resource access', () => {
    it('should allow access when user owns the property', async () => {
      const landlordOrgId = 'org-123';
      const user = {
        id: 'user-1',
        orgs: [{ orgId: landlordOrgId, role: 'LANDLORD' }],
      };

      const context = createMockExecutionContext(user, 'property-1', 'property');

      mockPrismaService.property.findUnique.mockResolvedValue({
        id: 'property-1',
        ownerOrgId: landlordOrgId,
      });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockPrismaService.property.findUnique).toHaveBeenCalledWith({
        where: { id: 'property-1' },
        select: { ownerOrgId: true },
      });
    });

    it('should throw NotFoundException when property does not exist', async () => {
      const user = {
        id: 'user-1',
        orgs: [{ orgId: 'org-123', role: 'LANDLORD' }],
      };

      const context = createMockExecutionContext(user, 'property-999', 'property');

      mockPrismaService.property.findUnique.mockResolvedValue(null);

      await expect(guard.canActivate(context)).rejects.toThrow(NotFoundException);
      await expect(guard.canActivate(context)).rejects.toThrow('Property not found');
    });

    it('should throw NotFoundException when user does not own the property (resource hiding)', async () => {
      const user = {
        id: 'user-1',
        orgs: [{ orgId: 'org-123', role: 'LANDLORD' }],
      };

      const context = createMockExecutionContext(user, 'property-1', 'property');

      mockPrismaService.property.findUnique.mockResolvedValue({
        id: 'property-1',
        ownerOrgId: 'org-999', // Different landlord
      });

      await expect(guard.canActivate(context)).rejects.toThrow(NotFoundException);
      await expect(guard.canActivate(context)).rejects.toThrow('Property not found');
    });
  });

  describe('tenancy resource access', () => {
    it('should allow access when user owns the tenancy property', async () => {
      const landlordOrgId = 'org-123';
      const user = {
        id: 'user-1',
        orgs: [{ orgId: landlordOrgId, role: 'LANDLORD' }],
      };

      const context = createMockExecutionContext(user, 'tenancy-1', 'tenancy');

      mockPrismaService.tenancy.findUnique.mockResolvedValue({
        id: 'tenancy-1',
        property: { ownerOrgId: landlordOrgId },
      });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockPrismaService.tenancy.findUnique).toHaveBeenCalledWith({
        where: { id: 'tenancy-1' },
        include: { property: { select: { ownerOrgId: true } } },
      });
    });

    it('should throw NotFoundException for cross-tenant tenancy access', async () => {
      const user = {
        id: 'user-1',
        orgs: [{ orgId: 'org-123', role: 'LANDLORD' }],
      };

      const context = createMockExecutionContext(user, 'tenancy-1', 'tenancy');

      mockPrismaService.tenancy.findUnique.mockResolvedValue({
        id: 'tenancy-1',
        property: { ownerOrgId: 'org-999' },
      });

      await expect(guard.canActivate(context)).rejects.toThrow(NotFoundException);
      await expect(guard.canActivate(context)).rejects.toThrow('Tenancy not found');
    });
  });

  describe('ticket resource access', () => {
    it('should allow access when user is the ticket landlord', async () => {
      const landlordOrgId = 'org-123';
      const user = {
        id: 'user-1',
        orgs: [{ orgId: landlordOrgId, role: 'LANDLORD' }],
      };

      const context = createMockExecutionContext(user, 'ticket-1', 'ticket');

      mockPrismaService.ticket.findUnique.mockResolvedValue({
        id: 'ticket-1',
        landlordId: landlordOrgId,
      });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should throw NotFoundException for cross-tenant ticket access', async () => {
      const user = {
        id: 'user-1',
        orgs: [{ orgId: 'org-123', role: 'LANDLORD' }],
      };

      const context = createMockExecutionContext(user, 'ticket-1', 'ticket');

      mockPrismaService.ticket.findUnique.mockResolvedValue({
        id: 'ticket-1',
        landlordId: 'org-999',
      });

      await expect(guard.canActivate(context)).rejects.toThrow(NotFoundException);
      await expect(guard.canActivate(context)).rejects.toThrow('Ticket not found');
    });
  });

  describe('invoice resource access', () => {
    it('should allow access when user owns the invoice', async () => {
      const landlordOrgId = 'org-123';
      const user = {
        id: 'user-1',
        orgs: [{ orgId: landlordOrgId, role: 'LANDLORD' }],
      };

      const context = createMockExecutionContext(user, 'invoice-1', 'invoice');

      mockPrismaService.invoice.findUnique.mockResolvedValue({
        id: 'invoice-1',
        landlordId: landlordOrgId,
      });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should throw NotFoundException for cross-tenant invoice access', async () => {
      const user = {
        id: 'user-1',
        orgs: [{ orgId: 'org-123', role: 'LANDLORD' }],
      };

      const context = createMockExecutionContext(user, 'invoice-1', 'invoice');

      mockPrismaService.invoice.findUnique.mockResolvedValue({
        id: 'invoice-1',
        landlordId: 'org-999',
      });

      await expect(guard.canActivate(context)).rejects.toThrow(NotFoundException);
      await expect(guard.canActivate(context)).rejects.toThrow('Invoice not found');
    });
  });

  describe('payment resource access', () => {
    it('should allow access when user owns the payment', async () => {
      const landlordOrgId = 'org-123';
      const user = {
        id: 'user-1',
        orgs: [{ orgId: landlordOrgId, role: 'LANDLORD' }],
      };

      const context = createMockExecutionContext(user, 'payment-1', 'payment');

      mockPrismaService.payment.findUnique.mockResolvedValue({
        id: 'payment-1',
        landlordId: landlordOrgId,
      });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should throw NotFoundException for cross-tenant payment access', async () => {
      const user = {
        id: 'user-1',
        orgs: [{ orgId: 'org-123', role: 'LANDLORD' }],
      };

      const context = createMockExecutionContext(user, 'payment-1', 'payment');

      mockPrismaService.payment.findUnique.mockResolvedValue({
        id: 'payment-1',
        landlordId: 'org-999',
      });

      await expect(guard.canActivate(context)).rejects.toThrow(NotFoundException);
      await expect(guard.canActivate(context)).rejects.toThrow('Payment not found');
    });
  });

  describe('user with multiple landlord orgs', () => {
    it('should allow access if user belongs to any matching landlord org', async () => {
      const user = {
        id: 'user-1',
        orgs: [
          { orgId: 'org-123', role: 'LANDLORD' },
          { orgId: 'org-456', role: 'LANDLORD' },
        ],
      };

      const context = createMockExecutionContext(user, 'property-1', 'property');

      mockPrismaService.property.findUnique.mockResolvedValue({
        id: 'property-1',
        ownerOrgId: 'org-456', // Matches second org
      });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should return null and log error when database query fails', async () => {
      const user = {
        id: 'user-1',
        orgs: [{ orgId: 'org-123', role: 'LANDLORD' }],
      };

      const context = createMockExecutionContext(user, 'property-1', 'property');

      mockPrismaService.property.findUnique.mockRejectedValue(
        new Error('Database connection failed'),
      );

      await expect(guard.canActivate(context)).rejects.toThrow(NotFoundException);
    });
  });
});
