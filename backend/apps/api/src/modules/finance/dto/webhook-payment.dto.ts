import { IsString, IsNumber, IsDateString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class WebhookPaymentDto {
  @ApiProperty({
    description: 'Invoice ID this payment is for',
    example: 'inv-123',
  })
  @IsString()
  invoiceId: string;

  @ApiProperty({
    description: 'Payment amount',
    example: 1500.0,
  })
  @IsNumber()
  amount: number;

  @ApiProperty({
    description: 'Date payment was received',
    example: '2025-11-06T10:00:00Z',
  })
  @IsDateString()
  paidAt: string;

  @ApiProperty({
    description: 'Provider reference (e.g., Stripe payment ID)',
    example: 'ch_123456',
  })
  @IsString()
  providerRef: string;

  @ApiProperty({
    description: 'Payment provider name',
    example: 'stripe',
    required: false,
  })
  @IsOptional()
  @IsString()
  provider?: string;
}
