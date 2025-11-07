import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { TenanciesService } from './tenancies.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { TenancyStatus } from './tenancy-status.util';

describe('TenanciesService', () => {
  let service: TenanciesService;
  let prisma: PrismaService;

  const mockPrisma = {
    tenancy: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    property: {
      findUnique: jest.fn(),
    },
    breakClause: {
      upsert: jest.fn(),
    },
    rentRevision: {
      create: jest.fn(),
    },
    guarantor: {
      create: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TenanciesService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<TenanciesService>(TenanciesService);
    prisma = module.get<PrismaService>(PrismaService);

    // Reset mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a tenancy with valid data', async () => {
      const propertyId = 'prop-123';
      const tenantOrgId = 'tenant-org';
      const ownerOrgId = 'owner-org';
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2026-01-01');
      const rentPcm = 1200;
      const deposit = 1200;

      const mockProperty = {
        id: propertyId,
        ownerOrgId,
      };

      const mockCreatedTenancy = {
        id: 'tenancy-123',
        propertyId,
        tenantOrgId,
        start: startDate,
        end: endDate,
        rentPcm,
        deposit,
        status: TenancyStatus.SCHEDULED,
      };

      jest.spyOn(prisma.property, 'findUnique').mockResolvedValue(mockProperty as any);
      jest.spyOn(prisma.tenancy, 'create').mockResolvedValue(mockCreatedTenancy as any);

      const result = await service.create({
        propertyId,
        tenantOrgId,
        startDate,
        endDate,
        rentPcm,
        deposit,
        ownerOrgId,
      });

      expect(result).toEqual(mockCreatedTenancy);
      expect(prisma.property.findUnique).toHaveBeenCalledWith({
        where: { id: propertyId },
      });
      expect(prisma.tenancy.create).toHaveBeenCalled();
    });

    it('should throw ForbiddenException when property owner does not match', async () => {
      const mockProperty = {
        id: 'prop-123',
        ownerOrgId: 'different-org',
      };

      jest.spyOn(prisma.property, 'findUnique').mockResolvedValue(mockProperty as any);

      await expect(
        service.create({
          propertyId: 'prop-123',
          tenantOrgId: 'tenant-org',
          startDate: new Date('2025-01-01'),
          endDate: new Date('2026-01-01'),
          rentPcm: 1200,
          deposit: 1200,
          ownerOrgId: 'owner-org',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException when start date is after end date', async () => {
      const mockProperty = {
        id: 'prop-123',
        ownerOrgId: 'owner-org',
      };

      jest.spyOn(prisma.property, 'findUnique').mockResolvedValue(mockProperty as any);

      await expect(
        service.create({
          propertyId: 'prop-123',
          tenantOrgId: 'tenant-org',
          startDate: new Date('2026-01-01'),
          endDate: new Date('2025-01-01'),
          rentPcm: 1200,
          deposit: 1200,
          ownerOrgId: 'owner-org',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('update', () => {
    it('should update tenancy with valid changes', async () => {
      const tenancyId = 'tenancy-123';
      const userOrgIds = ['owner-org'];
      const userId = 'user-123';

      const mockTenancy = {
        id: tenancyId,
        propertyId: 'prop-123',
        start: new Date('2025-01-01'),
        end: new Date('2026-01-01'),
        rentPcm: 1200,
        deposit: 1200,
        terminatedAt: null,
        property: {
          ownerOrgId: 'owner-org',
        },
      };

      const updateDto = {
        rentPcm: 1300,
      };

      jest.spyOn(prisma.tenancy, 'findUnique').mockResolvedValue(mockTenancy as any);
      jest.spyOn(prisma.tenancy, 'findFirst').mockResolvedValue(null);
      jest.spyOn(prisma.rentRevision, 'create').mockResolvedValue({} as any);
      jest.spyOn(prisma.tenancy, 'update').mockResolvedValue({
        ...mockTenancy,
        rentPcm: 1300,
      } as any);
      jest.spyOn(prisma.auditLog, 'create').mockResolvedValue({} as any);

      const result = await service.update(tenancyId, updateDto, userOrgIds, userId);

      expect(result.rentPcm).toBe(1300);
      expect(prisma.rentRevision.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenancyId,
            rentPcm: 1300,
          }),
        }),
      );
      expect(prisma.auditLog.create).toHaveBeenCalled();
    });

    it('should throw ForbiddenException when user is not the landlord', async () => {
      const mockTenancy = {
        id: 'tenancy-123',
        property: {
          ownerOrgId: 'owner-org',
        },
      };

      jest.spyOn(prisma.tenancy, 'findUnique').mockResolvedValue(mockTenancy as any);

      await expect(
        service.update('tenancy-123', { rentPcm: 1300 }, ['different-org'], 'user-123'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ConflictException when dates overlap with renewed tenancy', async () => {
      const mockTenancy = {
        id: 'tenancy-123',
        start: new Date('2025-01-01'),
        end: new Date('2026-01-01'),
        rentPcm: 1200,
        terminatedAt: null,
        property: {
          ownerOrgId: 'owner-org',
        },
      };

      const mockRenewedTenancy = {
        id: 'tenancy-456',
        start: new Date('2026-01-02'),
        renewalOfId: 'tenancy-123',
      };

      jest.spyOn(prisma.tenancy, 'findUnique').mockResolvedValue(mockTenancy as any);
      jest.spyOn(prisma.tenancy, 'findFirst').mockResolvedValue(mockRenewedTenancy as any);

      await expect(
        service.update(
          'tenancy-123',
          { endDate: '2026-02-01' },
          ['owner-org'],
          'user-123',
        ),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('terminate', () => {
    it('should terminate tenancy with valid reason', async () => {
      const tenancyId = 'tenancy-123';
      const userOrgIds = ['owner-org'];
      const userId = 'user-123';

      const mockTenancy = {
        id: tenancyId,
        status: TenancyStatus.ACTIVE,
        property: {
          ownerOrgId: 'owner-org',
        },
        breakClause: null,
      };

      const terminateDto = {
        reason: 'Tenant requested termination',
      };

      jest.spyOn(prisma.tenancy, 'findUnique').mockResolvedValue(mockTenancy as any);
      jest.spyOn(prisma.tenancy, 'update').mockResolvedValue({
        ...mockTenancy,
        status: TenancyStatus.TERMINATED,
        terminationReason: terminateDto.reason,
      } as any);
      jest.spyOn(prisma.auditLog, 'create').mockResolvedValue({} as any);

      const result = await service.terminate(tenancyId, terminateDto, userOrgIds, userId);

      expect(result.status).toBe(TenancyStatus.TERMINATED);
      expect(prisma.tenancy.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: tenancyId },
          data: expect.objectContaining({
            status: TenancyStatus.TERMINATED,
            terminationReason: terminateDto.reason,
          }),
        }),
      );
    });

    it('should throw ConflictException when terminating before break clause date', async () => {
      const mockTenancy = {
        id: 'tenancy-123',
        status: TenancyStatus.ACTIVE,
        property: {
          ownerOrgId: 'owner-org',
        },
        breakClause: {
          earliestBreakDate: new Date('2025-12-01'),
          noticeMonths: 2,
        },
      };

      jest.spyOn(prisma.tenancy, 'findUnique').mockResolvedValue(mockTenancy as any);

      await expect(
        service.terminate(
          'tenancy-123',
          {
            reason: 'Early termination',
            terminatedAt: '2025-06-01',
          },
          ['owner-org'],
          'user-123',
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException when tenancy is already terminated', async () => {
      const mockTenancy = {
        id: 'tenancy-123',
        status: TenancyStatus.TERMINATED,
        property: {
          ownerOrgId: 'owner-org',
        },
      };

      jest.spyOn(prisma.tenancy, 'findUnique').mockResolvedValue(mockTenancy as any);

      await expect(
        service.terminate(
          'tenancy-123',
          { reason: 'Test' },
          ['owner-org'],
          'user-123',
        ),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('renew', () => {
    it('should renew tenancy with valid data', async () => {
      const oldTenancyId = 'tenancy-123';
      const userOrgIds = ['owner-org'];
      const userId = 'user-123';

      const mockOldTenancy = {
        id: oldTenancyId,
        propertyId: 'prop-123',
        tenantOrgId: 'tenant-org',
        landlordId: 'landlord-123',
        primaryTenant: 'user-456',
        start: new Date('2025-01-01'),
        end: new Date('2026-01-01'),
        deposit: 1200,
        status: TenancyStatus.EXPIRING,
        property: {
          ownerOrgId: 'owner-org',
        },
        guarantors: [],
      };

      const renewDto = {
        startDate: '2026-01-02',
        endDate: '2027-01-01',
        rentPcm: 1300,
      };

      const mockNewTenancy = {
        id: 'tenancy-456',
        propertyId: mockOldTenancy.propertyId,
        tenantOrgId: mockOldTenancy.tenantOrgId,
        start: new Date(renewDto.startDate),
        end: new Date(renewDto.endDate),
        rentPcm: renewDto.rentPcm,
        renewalOfId: oldTenancyId,
      };

      jest.spyOn(prisma.tenancy, 'findUnique').mockResolvedValue(mockOldTenancy as any);
      jest.spyOn(prisma, '$transaction').mockImplementation(async (callback: any) => {
        return callback({
          tenancy: {
            create: jest.fn().mockResolvedValue(mockNewTenancy),
            update: jest.fn().mockResolvedValue({}),
          },
        });
      });
      jest.spyOn(prisma.auditLog, 'create').mockResolvedValue({} as any);

      const result = await service.renew(oldTenancyId, renewDto, userOrgIds, userId);

      expect(result).toBeDefined();
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('should throw ConflictException when renewing terminated tenancy', async () => {
      const mockTenancy = {
        id: 'tenancy-123',
        status: TenancyStatus.TERMINATED,
        end: new Date('2026-01-01'),
        property: {
          ownerOrgId: 'owner-org',
        },
      };

      jest.spyOn(prisma.tenancy, 'findUnique').mockResolvedValue(mockTenancy as any);

      await expect(
        service.renew(
          'tenancy-123',
          {
            startDate: '2026-01-02',
            endDate: '2027-01-01',
            rentPcm: 1300,
          },
          ['owner-org'],
          'user-123',
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException when new start date overlaps with old tenancy', async () => {
      const mockTenancy = {
        id: 'tenancy-123',
        status: TenancyStatus.ACTIVE,
        end: new Date('2026-01-01'),
        property: {
          ownerOrgId: 'owner-org',
        },
        guarantors: [],
      };

      jest.spyOn(prisma.tenancy, 'findUnique').mockResolvedValue(mockTenancy as any);

      await expect(
        service.renew(
          'tenancy-123',
          {
            startDate: '2025-12-01', // Before old tenancy ends
            endDate: '2026-12-01',
            rentPcm: 1300,
          },
          ['owner-org'],
          'user-123',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('applyRentIncrease', () => {
    it('should apply rent increase with future effective date', async () => {
      const tenancyId = 'tenancy-123';
      const userOrgIds = ['owner-org'];
      const userId = 'user-123';

      const mockTenancy = {
        id: tenancyId,
        rentPcm: 1200,
        property: {
          ownerOrgId: 'owner-org',
        },
      };

      const rentIncreaseDto = {
        effectiveFrom: '2026-01-01',
        newRentPcm: 1300,
        reason: 'Annual increase',
      };

      jest.spyOn(prisma.tenancy, 'findUnique').mockResolvedValue(mockTenancy as any);
      jest.spyOn(prisma.rentRevision, 'create').mockResolvedValue({} as any);
      jest.spyOn(prisma.tenancy, 'update').mockResolvedValue({
        ...mockTenancy,
        rentPcm: 1200, // Not updated yet as effective date is in future
      } as any);
      jest.spyOn(prisma.auditLog, 'create').mockResolvedValue({} as any);

      await service.applyRentIncrease(tenancyId, rentIncreaseDto, userOrgIds, userId);

      expect(prisma.rentRevision.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenancyId,
            rentPcm: 1300,
            reason: 'Annual increase',
          }),
        }),
      );
    });

    it('should update current rent when effective date is today or earlier', async () => {
      const tenancyId = 'tenancy-123';
      const mockTenancy = {
        id: tenancyId,
        rentPcm: 1200,
        property: {
          ownerOrgId: 'owner-org',
        },
      };

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      jest.spyOn(prisma.tenancy, 'findUnique').mockResolvedValue(mockTenancy as any);
      jest.spyOn(prisma.rentRevision, 'create').mockResolvedValue({} as any);
      jest.spyOn(prisma.tenancy, 'update').mockResolvedValue({
        ...mockTenancy,
        rentPcm: 1300,
      } as any);
      jest.spyOn(prisma.auditLog, 'create').mockResolvedValue({} as any);

      const result = await service.applyRentIncrease(
        tenancyId,
        {
          effectiveFrom: yesterday.toISOString().split('T')[0],
          newRentPcm: 1300,
        },
        ['owner-org'],
        'user-123',
      );

      expect(result.rentPcm).toBe(1300);
    });
  });

  describe('addGuarantor', () => {
    it('should add guarantor to tenancy', async () => {
      const tenancyId = 'tenancy-123';
      const mockTenancy = {
        id: tenancyId,
        property: {
          ownerOrgId: 'owner-org',
        },
      };

      const guarantorDto = {
        name: 'John Guarantor',
        email: 'john@example.com',
        phone: '1234567890',
      };

      const mockGuarantor = {
        id: 'guarantor-123',
        tenancyId,
        ...guarantorDto,
      };

      jest.spyOn(prisma.tenancy, 'findUnique').mockResolvedValue(mockTenancy as any);
      jest.spyOn(prisma.guarantor, 'create').mockResolvedValue(mockGuarantor as any);
      jest.spyOn(prisma.auditLog, 'create').mockResolvedValue({} as any);

      const result = await service.addGuarantor(
        tenancyId,
        guarantorDto,
        ['owner-org'],
        'user-123',
      );

      expect(result).toEqual(mockGuarantor);
      expect(prisma.guarantor.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenancyId,
            name: guarantorDto.name,
            email: guarantorDto.email,
          }),
        }),
      );
    });
  });

  describe('removeGuarantor', () => {
    it('should remove guarantor', async () => {
      const guarantorId = 'guarantor-123';
      const mockGuarantor = {
        id: guarantorId,
        tenancyId: 'tenancy-123',
        name: 'John Guarantor',
        tenancy: {
          property: {
            ownerOrgId: 'owner-org',
          },
        },
      };

      jest.spyOn(prisma.guarantor, 'findUnique').mockResolvedValue(mockGuarantor as any);
      jest.spyOn(prisma.guarantor, 'delete').mockResolvedValue(mockGuarantor as any);
      jest.spyOn(prisma.auditLog, 'create').mockResolvedValue({} as any);

      const result = await service.removeGuarantor(guarantorId, ['owner-org'], 'user-123');

      expect(result.success).toBe(true);
      expect(prisma.guarantor.delete).toHaveBeenCalledWith({
        where: { id: guarantorId },
      });
    });

    it('should throw NotFoundException when guarantor does not exist', async () => {
      jest.spyOn(prisma.guarantor, 'findUnique').mockResolvedValue(null);

      await expect(
        service.removeGuarantor('non-existent', ['owner-org'], 'user-123'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
