import { IsNotEmpty, IsOptional, IsString, IsUUID, IsJSON, IsInt, ValidateIf, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateDocumentDto {
  @ApiProperty({
    description: 'Property ID (if attaching to a property)',
    example: '550e8400-e29b-41d4-a716-446655440000',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  propertyId?: string;

  @ApiProperty({
    description: 'Ticket ID (if attaching to a ticket)',
    example: '550e8400-e29b-41d4-a716-446655440001',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  ticketId?: string;

  @ApiProperty({
    description: 'Tenancy ID (if attaching to a tenancy)',
    example: '550e8400-e29b-41d4-a716-446655440002',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  tenancyId?: string;

  @ApiProperty({
    description: 'Type of document (e.g., EPC, Insurance, Photo, Receipt)',
    example: 'EPC',
  })
  @IsString()
  @IsNotEmpty()
  docType: string;

  @ApiProperty({
    description: 'Filename of the uploaded document',
    example: 'certificate.pdf',
  })
  @IsString()
  @IsNotEmpty()
  filename: string;

  @ApiProperty({
    description: 'Storage key/path returned from the presigned URL upload',
    example: 'uploads/1699123456789-abc123.pdf',
  })
  @IsString()
  @IsNotEmpty()
  storageKey: string;

  @ApiProperty({
    description: 'MIME type of the document',
    example: 'application/pdf',
  })
  @IsString()
  @IsNotEmpty()
  contentType: string;

  @ApiProperty({
    description: 'File size in bytes',
    example: 524288,
  })
  @IsInt()
  @Min(1)
  size: number;

  @ApiProperty({
    description: 'Hash of the file content (optional)',
    example: 'sha256:abc123...',
    required: false,
  })
  @IsOptional()
  @IsString()
  hash?: string;

  @ApiProperty({
    description: 'Expiry date for the document (ISO 8601 format)',
    example: '2025-12-31T00:00:00Z',
    required: false,
  })
  @IsOptional()
  @IsString()
  expiryDate?: string;

  @ApiProperty({
    description: 'Extracted metadata or text content',
    required: false,
  })
  @IsOptional()
  @IsJSON()
  extracted?: any;

  // Legacy fields for backward compatibility
  @IsOptional()
  @IsString()
  ownerType?: string;

  @IsOptional()
  @IsString()
  ownerId?: string;

  @IsOptional()
  @IsString()
  url?: string;
}
