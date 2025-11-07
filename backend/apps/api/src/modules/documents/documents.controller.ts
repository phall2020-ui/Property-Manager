import { Body, Controller, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DocumentsService } from './documents.service';
import { CreateDocumentDto } from './dto/create-document.dto';

@ApiTags('documents')
@Controller()
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post('attachments/sign')
  @ApiOperation({ summary: 'Get a signed S3 URL for uploading a document' })
  @ApiBearerAuth()
  async sign(@Body('contentType') contentType: string) {
    // Validate content type to prevent XSS
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];
    
    if (!contentType || !allowedTypes.includes(contentType)) {
      throw new Error('Invalid or unsupported content type');
    }
    
    return this.documentsService.signUpload(contentType);
  }

  @Post('documents')
  @ApiOperation({ summary: 'Create document metadata after uploading' })
  @ApiBearerAuth()
  async create(@Body() dto: CreateDocumentDto) {
    const expiryDate = dto.expiryDate ? new Date(dto.expiryDate) : undefined;
    
    // Create a sanitized object to prevent XSS
    const sanitizedData = {
      ownerType: dto.ownerType,
      ownerId: dto.ownerId,
      docType: dto.docType,
      url: dto.url,
      hash: dto.hash,
      expiryDate,
      extracted: dto.extracted,
    };
    
    return this.documentsService.createDocument(sanitizedData);
  }
}