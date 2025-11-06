import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { PropertiesService } from './properties.service';
import { PrismaService } from '../../common/prisma/prisma.service';

describe('PropertiesService', () => {
  let service: PropertiesService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PropertiesService,
        {
          provide: PrismaService,
          useValue: {
            property: {
              create: jest.fn(),
              findUnique: jest.fn(),
              findMany: jest.fn(),
              update: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<PropertiesService>(PropertiesService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('update', () => {
    it('should update property when owner matches', async () => {
      const propertyId = 'prop-123';
      const ownerOrgId = 'org-456';
      const updateData = {
        addressLine1: '123 New Street',
        city: 'London',
        postcode: 'SW1A 1AA',
      };

      const existingProperty = {
        id: propertyId,
        ownerOrgId,
      };

      const updatedProperty = {
        id: propertyId,
        ownerOrgId,
        addressLine1: '123 New Street',
        city: 'London',
        postcode: 'SW1A 1AA',
      };

      jest.spyOn(prisma.property, 'findUnique').mockResolvedValue(existingProperty as any);
      jest.spyOn(prisma.property, 'update').mockResolvedValue(updatedProperty as any);

      const result = await service.update(propertyId, ownerOrgId, updateData);

      expect(result).toEqual(updatedProperty);
      expect(prisma.property.findUnique).toHaveBeenCalledWith({
        where: { id: propertyId },
        select: { id: true, ownerOrgId: true },
      });
      expect(prisma.property.update).toHaveBeenCalledWith({
        where: { id: propertyId },
        data: expect.objectContaining({
          addressLine1: '123 New Street',
          city: 'London',
          postcode: 'SW1A 1AA',
        }),
      });
    });

    it('should normalize postcode to uppercase', async () => {
      const propertyId = 'prop-123';
      const ownerOrgId = 'org-456';
      const updateData = {
        postcode: 'sw1a 1aa',
      };

      const existingProperty = {
        id: propertyId,
        ownerOrgId,
      };

      jest.spyOn(prisma.property, 'findUnique').mockResolvedValue(existingProperty as any);
      jest.spyOn(prisma.property, 'update').mockResolvedValue({} as any);

      await service.update(propertyId, ownerOrgId, updateData);

      expect(prisma.property.update).toHaveBeenCalledWith({
        where: { id: propertyId },
        data: expect.objectContaining({
          postcode: 'SW1A 1AA',
        }),
      });
    });

    it('should handle attributes object', async () => {
      const propertyId = 'prop-123';
      const ownerOrgId = 'org-456';
      const updateData = {
        attributes: {
          propertyType: 'Flat',
          furnished: 'Full',
          epcRating: 'B',
        },
      };

      const existingProperty = {
        id: propertyId,
        ownerOrgId,
      };

      jest.spyOn(prisma.property, 'findUnique').mockResolvedValue(existingProperty as any);
      jest.spyOn(prisma.property, 'update').mockResolvedValue({} as any);

      await service.update(propertyId, ownerOrgId, updateData);

      expect(prisma.property.update).toHaveBeenCalledWith({
        where: { id: propertyId },
        data: expect.objectContaining({
          propertyType: 'Flat',
          furnished: 'Full',
          epcRating: 'B',
        }),
      });
    });

    it('should throw NotFoundException when property does not exist', async () => {
      const propertyId = 'non-existent';
      const ownerOrgId = 'org-456';

      jest.spyOn(prisma.property, 'findUnique').mockResolvedValue(null);

      await expect(service.update(propertyId, ownerOrgId, {})).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.property.update).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when ownerOrgId does not match', async () => {
      const propertyId = 'prop-123';
      const ownerOrgId = 'org-456';
      const wrongOrgId = 'org-999';

      const existingProperty = {
        id: propertyId,
        ownerOrgId: wrongOrgId,
      };

      jest.spyOn(prisma.property, 'findUnique').mockResolvedValue(existingProperty as any);

      await expect(service.update(propertyId, ownerOrgId, {})).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.property.update).not.toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return property when owner matches', async () => {
      const propertyId = 'prop-123';
      const ownerOrgId = 'org-456';
      const property = {
        id: propertyId,
        ownerOrgId,
        addressLine1: '123 Test St',
      };

      jest.spyOn(prisma.property, 'findUnique').mockResolvedValue(property as any);

      const result = await service.findOne(propertyId, ownerOrgId);

      expect(result).toEqual(property);
    });

    it('should throw NotFoundException when property does not exist', async () => {
      jest.spyOn(prisma.property, 'findUnique').mockResolvedValue(null);

      await expect(service.findOne('non-existent', 'org-456')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException when ownerOrgId does not match', async () => {
      const property = {
        id: 'prop-123',
        ownerOrgId: 'org-999',
      };

      jest.spyOn(prisma.property, 'findUnique').mockResolvedValue(property as any);

      await expect(service.findOne('prop-123', 'org-456')).rejects.toThrow(NotFoundException);
    });
  });
});
