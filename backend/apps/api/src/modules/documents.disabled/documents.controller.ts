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
    return this.documentsService.signUpload(contentType);
  }

  @Post('documents')
  @ApiOperation({ summary: 'Create document metadata after uploading' })
  @ApiBearerAuth()
  async create(@Body() dto: CreateDocumentDto) {
    const expiryDate = dto.expiryDate ? new Date(dto.expiryDate) : undefined;
    return this.documentsService.createDocument({ ...dto, expiryDate });
  }
}