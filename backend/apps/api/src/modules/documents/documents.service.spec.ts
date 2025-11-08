import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, UnprocessableEntityException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentsService } from './documents.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { StorageService } from '../../common/storage/storage.service';

describe('DocumentsService', () => {
  let service: DocumentsService;
  let prisma: PrismaService;
  let storage: StorageService;
  let config: ConfigService;

  const mockPrismaService = {
    property: {
      findUniqueOrThrow: jest.fn(),
    },
    propertyDocument: {
      create: jest.fn(),
    },
    ticket: {
      findUniqueOrThrow: jest.fn(),
    },
    ticketAttachment: {
      create: jest.fn(),
    },
    tenancy: {
      findUniqueOrThrow: jest.fn(),
    },
    tenancyDocument: {
      create: jest.fn(),
    },
  };

  const mockStorageService = {
    getPresignedUploadUrl: jest.fn(),
    getUrl: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: any) => {
      const config = {
        'app.storage.allowedMimeTypes': [
          'image/jpeg',
          'image/png',
          'application/pdf',
        ],
        'app.storage.maxFileSize': 10485760, // 10MB
      };
      return config[key] || defaultValue;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: StorageService, useValue: mockStorageService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<DocumentsService>(DocumentsService);
    prisma = module.get<PrismaService>(PrismaService);
    storage = module.get<StorageService>(StorageService);
    config = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('signUpload', () => {
    it('should generate a presigned URL for valid content type', async () => {
      mockStorageService.getPresignedUploadUrl.mockResolvedValue({
        url: 'https://example.com/upload',
        key: 'uploads/test.pdf',
        fields: { 'Content-Type': 'application/pdf' },
      });

      const result = await service.signUpload('application/pdf');

      expect(result).toHaveProperty('url');
      expect(result).toHaveProperty('key');
      expect(result).toHaveProperty('expiresIn', 300);
      expect(result).toHaveProperty('maxSize');
      expect(mockStorageService.getPresignedUploadUrl).toHaveBeenCalledWith(
        'application/pdf',
        10485760,
      );
    });

    it('should reject invalid content type', async () => {
      await expect(service.signUpload('application/exe')).rejects.toThrow(
        UnprocessableEntityException,
      );
      expect(mockStorageService.getPresignedUploadUrl).not.toHaveBeenCalled();
    });

    it('should enforce max file size limit', async () => {
      // Mock to return config that would allow the large size
      mockConfigService.get.mockImplementation((key: string, defaultValue?: any) => {
        if (key === 'app.storage.allowedMimeTypes') {
          return ['image/jpeg', 'image/png', 'application/pdf'];
        }
        if (key === 'app.storage.maxFileSize') {
          return 100000000; // Allow 100MB in config
        }
        return defaultValue;
      });

      await expect(service.signUpload('application/pdf', 100000000)).rejects.toThrow(
        UnprocessableEntityException,
      );
      
      // Restore original mock
      mockConfigService.get.mockImplementation((key: string, defaultValue?: any) => {
        const config = {
          'app.storage.allowedMimeTypes': [
            'image/jpeg',
            'image/png',
            'application/pdf',
          ],
          'app.storage.maxFileSize': 10485760,
        };
        return config[key] || defaultValue;
      });
    });

    it('should respect custom max size if smaller than config', async () => {
      mockStorageService.getPresignedUploadUrl.mockResolvedValue({
        url: 'https://example.com/upload',
        key: 'uploads/test.pdf',
        fields: {},
      });

      await service.signUpload('application/pdf', 5000000);

      expect(mockStorageService.getPresignedUploadUrl).toHaveBeenCalledWith(
        'application/pdf',
        5000000,
      );
    });
  });

  describe('createDocument', () => {
    it('should create a property document', async () => {
      const mockProperty = { id: 'property-123', ownerOrgId: 'org-123' };
      const mockDocument = {
        id: 'doc-123',
        propertyId: 'property-123',
        docType: 'EPC',
        filename: 'certificate.pdf',
        filepath: 'uploads/test.pdf',
        mimetype: 'application/pdf',
        size: 524288,
      };

      mockPrismaService.property.findUniqueOrThrow.mockResolvedValue(mockProperty);
      mockPrismaService.propertyDocument.create.mockResolvedValue(mockDocument);
      mockStorageService.getUrl.mockResolvedValue('https://example.com/uploads/test.pdf');

      const result = await service.createDocument({
        propertyId: 'property-123',
        docType: 'EPC',
        filename: 'certificate.pdf',
        storageKey: 'uploads/test.pdf',
        contentType: 'application/pdf',
        size: 524288,
      });

      expect(result).toEqual(mockDocument);
      expect(mockPrismaService.property.findUniqueOrThrow).toHaveBeenCalledWith({
        where: { id: 'property-123' },
      });
      expect(mockPrismaService.propertyDocument.create).toHaveBeenCalled();
    });

    it('should create a ticket attachment', async () => {
      const mockTicket = { id: 'ticket-123' };
      const mockAttachment = {
        id: 'attach-123',
        ticketId: 'ticket-123',
        filename: 'photo.jpg',
        filepath: 'uploads/test.jpg',
        mimetype: 'image/jpeg',
        size: 102400,
      };

      mockPrismaService.ticket.findUniqueOrThrow.mockResolvedValue(mockTicket);
      mockPrismaService.ticketAttachment.create.mockResolvedValue(mockAttachment);

      const result = await service.createDocument({
        ticketId: 'ticket-123',
        docType: 'Photo',
        filename: 'photo.jpg',
        storageKey: 'uploads/test.jpg',
        contentType: 'image/jpeg',
        size: 102400,
      });

      expect(result).toEqual(mockAttachment);
      expect(mockPrismaService.ticket.findUniqueOrThrow).toHaveBeenCalled();
      expect(mockPrismaService.ticketAttachment.create).toHaveBeenCalled();
    });

    it('should create a tenancy document', async () => {
      const mockTenancy = { id: 'tenancy-123' };
      const mockDocument = {
        id: 'doc-123',
        tenancyId: 'tenancy-123',
        filename: 'lease.pdf',
        filepath: 'uploads/lease.pdf',
        mimetype: 'application/pdf',
        size: 256000,
      };

      mockPrismaService.tenancy.findUniqueOrThrow.mockResolvedValue(mockTenancy);
      mockPrismaService.tenancyDocument.create.mockResolvedValue(mockDocument);

      const result = await service.createDocument({
        tenancyId: 'tenancy-123',
        docType: 'Lease',
        filename: 'lease.pdf',
        storageKey: 'uploads/lease.pdf',
        contentType: 'application/pdf',
        size: 256000,
      });

      expect(result).toEqual(mockDocument);
      expect(mockPrismaService.tenancy.findUniqueOrThrow).toHaveBeenCalled();
      expect(mockPrismaService.tenancyDocument.create).toHaveBeenCalled();
    });

    it('should reject when no resource type is specified', async () => {
      await expect(
        service.createDocument({
          docType: 'EPC',
          filename: 'certificate.pdf',
          storageKey: 'uploads/test.pdf',
          contentType: 'application/pdf',
          size: 524288,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject when multiple resource types are specified', async () => {
      await expect(
        service.createDocument({
          propertyId: 'property-123',
          ticketId: 'ticket-123',
          docType: 'EPC',
          filename: 'certificate.pdf',
          storageKey: 'uploads/test.pdf',
          contentType: 'application/pdf',
          size: 524288,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should support legacy ownerType/ownerId format', async () => {
      const mockProperty = { id: 'property-123', ownerOrgId: 'org-123' };
      const mockDocument = {
        id: 'doc-123',
        propertyId: 'property-123',
        docType: 'EPC',
        filename: 'certificate.pdf',
      };

      mockPrismaService.property.findUniqueOrThrow.mockResolvedValue(mockProperty);
      mockPrismaService.propertyDocument.create.mockResolvedValue(mockDocument);
      mockStorageService.getUrl.mockResolvedValue('https://example.com/uploads/test.pdf');

      const result = await service.createDocument({
        ownerType: 'property',
        ownerId: 'property-123',
        docType: 'EPC',
        filename: 'certificate.pdf',
        storageKey: 'uploads/test.pdf',
        contentType: 'application/pdf',
        size: 524288,
      });

      expect(result).toEqual(mockDocument);
      expect(mockPrismaService.property.findUniqueOrThrow).toHaveBeenCalled();
    });

    it('should throw error when resource does not exist', async () => {
      mockPrismaService.property.findUniqueOrThrow.mockRejectedValue({
        code: 'P2025',
        message: 'Record not found',
      });

      await expect(
        service.createDocument({
          propertyId: 'nonexistent',
          docType: 'EPC',
          filename: 'certificate.pdf',
          storageKey: 'uploads/test.pdf',
          contentType: 'application/pdf',
          size: 524288,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('scanForVirus', () => {
    it('should return true (no-op implementation)', async () => {
      const result = await service.scanForVirus('uploads/test.pdf');
      expect(result).toBe(true);
    });
  });
});
