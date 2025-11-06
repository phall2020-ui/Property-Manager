import { IsString, IsNumber, IsDateString, IsOptional, IsEnum, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum WebhookPaymentMethod {
  BANK_TRANSFER = 'BANK_TRANSFER',
  DD = 'DD',
  CARD = 'CARD',
  CASH = 'CASH',
  OTHER = 'OTHER',
}

export enum WebhookPaymentProvider {
  TEST = 'TEST',
  GOCARDLESS = 'GOCARDLESS',
  STRIPE = 'STRIPE',
  OPEN_BANKING = 'OPEN_BANKING',
}

export class WebhookPaymentDto {
  @ApiProperty({
    description: 'Invoice ID this payment is for',
    example: 'inv-123',
  })
  @IsString()
  invoiceId: string;

  @ApiProperty({
    description: 'Payment amount in GBP',
    example: 1500.0,
  })
  @IsNumber()
  @Min(0.01)
  amountGBP: number;

  @ApiProperty({
    description: 'Date payment was received (ISO 8601)',
    example: '2025-11-06T10:00:00Z',
  })
  @IsDateString()
  paidAt: string;

  @ApiProperty({
    description: 'Provider reference for idempotency (must be unique)',
    example: 'test_payment_12345',
  })
  @IsString()
  providerRef: string;

  @ApiProperty({
    description: 'Payment method',
    enum: WebhookPaymentMethod,
    default: 'OTHER',
  })
  @IsOptional()
  @IsEnum(WebhookPaymentMethod)
  method?: WebhookPaymentMethod;

  @ApiProperty({
    description: 'Payment provider name',
    enum: WebhookPaymentProvider,
    default: 'TEST',
  })
  @IsOptional()
  @IsEnum(WebhookPaymentProvider)
  provider?: WebhookPaymentProvider;
}
