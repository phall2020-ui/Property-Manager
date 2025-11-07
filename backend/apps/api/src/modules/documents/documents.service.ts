import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { StorageService } from '../../lib/storage/storage.service';

@Injectable()
export class DocumentsService {
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
    // For now, return a mock response until the document table is added to the schema
    // In production, this would use: return this.prisma.document.create({ data });
    return {
      id: `doc-${Date.now()}`,
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }
}