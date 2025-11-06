import { IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ApproveQuoteDto {
  @ApiProperty({
    description: 'Idempotency key for the approval',
    required: false,
    example: 'approve-quote-123-456',
  })
  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}
