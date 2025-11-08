import { IsString, IsNotEmpty, IsInt, IsOptional, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SignUploadDto {
  @ApiProperty({
    description: 'MIME type of the file to upload',
    example: 'image/jpeg',
    enum: [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'text/csv',
    ],
  })
  @IsString()
  @IsNotEmpty()
  contentType: string;

  @ApiProperty({
    description: 'Maximum file size in bytes (default: 10MB)',
    example: 5242880,
    required: false,
    minimum: 1,
    maximum: 52428800, // 50MB max
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(52428800)
  maxSize?: number;

  @ApiProperty({
    description: 'Filename for the upload',
    example: 'document.pdf',
    required: false,
  })
  @IsOptional()
  @IsString()
  filename?: string;
}
