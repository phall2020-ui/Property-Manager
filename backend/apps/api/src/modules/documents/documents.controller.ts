import { Body, Controller, Post, UnauthorizedException } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiResponse, ApiBadRequestResponse, ApiUnprocessableEntityResponse } from '@nestjs/swagger';
import { DocumentsService } from './documents.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { SignUploadDto } from './dto/sign-upload.dto';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('documents')
@Controller()
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post('attachments/sign')
  @ApiOperation({ 
    summary: 'Get a presigned URL for uploading a document',
    description: 'Returns a presigned URL that can be used to upload a file directly to storage (S3/GCS/Local). The URL expires after 5 minutes.',
  })
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'Presigned URL generated successfully',
    schema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'Presigned URL for uploading',
          example: 'https://bucket.s3.amazonaws.com/uploads/1699123456-abc123.pdf?signature=...',
        },
        key: {
          type: 'string',
          description: 'Storage key/path for the uploaded file',
          example: 'uploads/1699123456-abc123.pdf',
        },
        fields: {
          type: 'object',
          description: 'Additional fields to include in the upload request',
          example: { 'Content-Type': 'application/pdf' },
        },
        expiresIn: {
          type: 'number',
          description: 'URL expiration time in seconds',
          example: 300,
        },
        maxSize: {
          type: 'number',
          description: 'Maximum file size allowed in bytes',
          example: 10485760,
        },
      },
    },
  })
  @ApiUnprocessableEntityResponse({
    description: 'Invalid content type or file size exceeds limit',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Invalid or unsupported content type' },
        errors: {
          type: 'object',
          example: {
            contentType: ["Content type 'application/exe' is not allowed"],
          },
        },
      },
    },
  })
  async sign(@Body() dto: SignUploadDto) {
    return this.documentsService.signUpload(dto.contentType, dto.maxSize);
  }

  @Post('documents')
  @ApiOperation({ 
    summary: 'Create document metadata after uploading',
    description: 'Registers a document in the system after it has been uploaded using the presigned URL. Links the document to a property, ticket, or tenancy.',
  })
  @ApiBearerAuth()
  @ApiResponse({
    status: 201,
    description: 'Document created successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', example: '550e8400-e29b-41d4-a716-446655440000' },
        propertyId: { type: 'string', nullable: true },
        ticketId: { type: 'string', nullable: true },
        tenancyId: { type: 'string', nullable: true },
        docType: { type: 'string', example: 'EPC' },
        filename: { type: 'string', example: 'certificate.pdf' },
        filepath: { type: 'string', example: 'uploads/1699123456-abc123.pdf' },
        url: { type: 'string', example: 'https://bucket.s3.amazonaws.com/uploads/1699123456-abc123.pdf' },
        mimetype: { type: 'string', example: 'application/pdf' },
        size: { type: 'number', example: 524288 },
        createdAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid request - missing resource type or multiple resource types specified',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Resource type required' },
        errors: {
          type: 'object',
          example: {
            resource: ['Exactly one of propertyId, ticketId, or tenancyId must be provided'],
          },
        },
      },
    },
  })
  async create(@Body() dto: CreateDocumentDto) {
    const expiryDate = dto.expiryDate ? new Date(dto.expiryDate) : undefined;
    
    return this.documentsService.createDocument({
      propertyId: dto.propertyId,
      ticketId: dto.ticketId,
      tenancyId: dto.tenancyId,
      docType: dto.docType,
      filename: dto.filename,
      storageKey: dto.storageKey,
      contentType: dto.contentType,
      size: dto.size,
      hash: dto.hash,
      expiryDate,
      extracted: dto.extracted,
      // Legacy support
      ownerType: dto.ownerType,
      ownerId: dto.ownerId,
      url: dto.url,
    });
  }
}
