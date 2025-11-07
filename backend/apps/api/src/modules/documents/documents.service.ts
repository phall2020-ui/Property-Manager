import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { StorageService } from '../../lib/storage/storage.service';
import { Logger } from '@nestjs/common';

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    private readonly prisma: PrismaService, 
    private readonly storage: StorageService
  ) {}

  async signUpload(contentType: string) {
    return this.storage.getSignedUploadUrl(contentType);
  }

  async createDocument(data: { 
    ownerType: string; 
    ownerId: string; 
    docType: string; 
    url: string; 
    hash?: string; 
    expiryDate?: Date; 
    extracted?: any; 
  }) {
    // TODO: Add document table to Prisma schema
    // For now, return a mock response with clear warning
    this.logger.warn('Document module is using mock implementation - add Document model to Prisma schema for persistence');
    
    // In production, this should use: return this.prisma.document.create({ data });
    return {
      id: `doc-${Date.now()}`,
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }
}