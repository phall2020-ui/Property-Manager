import { Injectable, BadRequestException, UnprocessableEntityException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { StorageService } from '../../common/storage/storage.service';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    private readonly prisma: PrismaService, 
    private readonly storage: StorageService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Generate a presigned URL for uploading a document
   */
  async signUpload(contentType: string, maxSize?: number) {
    // Validate content type
    const allowedTypes = this.config.get<string[]>('app.storage.allowedMimeTypes');
    if (!allowedTypes || !allowedTypes.includes(contentType)) {
      throw new UnprocessableEntityException({
        message: 'Invalid or unsupported content type',
        errors: {
          contentType: [`Content type '${contentType}' is not allowed`],
        },
      });
    }

    // Validate max size
    const configMaxSize = this.config.get<number>('app.storage.maxFileSize', 10485760);
    const effectiveMaxSize = maxSize && maxSize < configMaxSize ? maxSize : configMaxSize;

    if (effectiveMaxSize > 52428800) { // 50MB hard limit
      throw new UnprocessableEntityException({
        message: 'File size exceeds maximum allowed',
        errors: {
          maxSize: ['Maximum file size is 50MB'],
        },
      });
    }

    // Generate presigned URL
    const result = await this.storage.getPresignedUploadUrl(contentType, effectiveMaxSize);

    return {
      ...result,
      expiresIn: 300, // 5 minutes
      maxSize: effectiveMaxSize,
    };
  }

  /**
   * Create document metadata after upload
   */
  async createDocument(data: { 
    propertyId?: string;
    ticketId?: string;
    tenancyId?: string;
    docType: string;
    filename: string;
    storageKey: string;
    contentType: string;
    size: number;
    hash?: string;
    expiryDate?: Date;
    extracted?: any;
    // Legacy fields
    ownerType?: string;
    ownerId?: string;
    url?: string;
  }) {
    // Validate that exactly one resource type is specified
    const resourceTypes = [data.propertyId, data.ticketId, data.tenancyId].filter(Boolean);
    
    // Support legacy ownerType/ownerId format
    if (resourceTypes.length === 0 && data.ownerType && data.ownerId) {
      // Map legacy format to new format
      switch (data.ownerType.toLowerCase()) {
        case 'property':
          data.propertyId = data.ownerId;
          break;
        case 'ticket':
          data.ticketId = data.ownerId;
          break;
        case 'tenancy':
          data.tenancyId = data.ownerId;
          break;
        default:
          throw new BadRequestException({
            message: 'Invalid resource type',
            errors: {
              ownerType: ['Must be one of: property, ticket, tenancy'],
            },
          });
      }
      resourceTypes.push(data.ownerId);
    }

    if (resourceTypes.length === 0) {
      throw new BadRequestException({
        message: 'Resource type required',
        errors: {
          resource: ['Exactly one of propertyId, ticketId, or tenancyId must be provided'],
        },
      });
    }

    if (resourceTypes.length > 1) {
      throw new BadRequestException({
        message: 'Multiple resource types specified',
        errors: {
          resource: ['Only one of propertyId, ticketId, or tenancyId can be provided'],
        },
      });
    }

    // Create document based on resource type
    let document;
    
    try {
      if (data.propertyId) {
        // Verify property exists
        await this.prisma.property.findUniqueOrThrow({
          where: { id: data.propertyId },
        });

        document = await this.prisma.propertyDocument.create({
          data: {
            propertyId: data.propertyId,
            docType: data.docType,
            filename: data.filename,
            filepath: data.storageKey,
            url: data.url || await this.storage.getUrl(data.storageKey),
            mimetype: data.contentType,
            size: data.size,
            expiryDate: data.expiryDate,
          },
        });

        this.emitDocumentCreated({
          documentId: document.id,
          resourceType: 'property',
          resourceId: data.propertyId,
          docType: data.docType,
          filename: data.filename,
        });
      } else if (data.ticketId) {
        // Verify ticket exists
        await this.prisma.ticket.findUniqueOrThrow({
          where: { id: data.ticketId },
        });

        document = await this.prisma.ticketAttachment.create({
          data: {
            ticketId: data.ticketId,
            filename: data.filename,
            filepath: data.storageKey,
            mimetype: data.contentType,
            size: data.size,
          },
        });

        this.emitDocumentCreated({
          documentId: document.id,
          resourceType: 'ticket',
          resourceId: data.ticketId,
          docType: data.docType,
          filename: data.filename,
        });
      } else if (data.tenancyId) {
        // Verify tenancy exists
        await this.prisma.tenancy.findUniqueOrThrow({
          where: { id: data.tenancyId },
        });

        document = await this.prisma.tenancyDocument.create({
          data: {
            tenancyId: data.tenancyId,
            filename: data.filename,
            filepath: data.storageKey,
            mimetype: data.contentType,
            size: data.size,
          },
        });

        this.emitDocumentCreated({
          documentId: document.id,
          resourceType: 'tenancy',
          resourceId: data.tenancyId,
          docType: data.docType,
          filename: data.filename,
        });
      }

      return document;
    } catch (error) {
      if (error.code === 'P2025') {
        throw new BadRequestException({
          message: 'Resource not found',
          errors: {
            resource: ['The specified property, ticket, or tenancy does not exist'],
          },
        });
      }
      throw error;
    }
  }

  /**
   * Emit document.created event for notifications/audit
   */
  private emitDocumentCreated(event: {
    documentId: string;
    resourceType: string;
    resourceId: string;
    docType: string;
    filename: string;
  }) {
    this.logger.log(`Document created: ${event.documentId} for ${event.resourceType}:${event.resourceId}`);
    // In a full implementation, this would integrate with a proper event bus
    // For now, we just log the event
  }

  /**
   * Virus scan hook (no-op default implementation)
   * Override this method or listen to document.created event to implement virus scanning
   */
  async scanForVirus(storageKey: string): Promise<boolean> {
    // No-op implementation
    // In production, integrate with ClamAV, VirusTotal, or similar service
    this.logger.debug(`Virus scan hook called for ${storageKey} (no-op)`);
    return true;
  }
}
