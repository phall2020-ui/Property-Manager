import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsDateString, IsOptional, Min, IsEnum } from 'class-validator';

export enum PaymentMethod {
  BANK_TRANSFER = 'BANK_TRANSFER',
  DD = 'DD',
  CARD = 'CARD',
  CASH = 'CASH',
  OTHER = 'OTHER',
}

export enum PaymentProvider {
  TEST = 'TEST',
  GOCARDLESS = 'GOCARDLESS',
  STRIPE = 'STRIPE',
  OPEN_BANKING = 'OPEN_BANKING',
}

export class RecordPaymentDto {
  @ApiProperty({ description: 'Invoice ID to allocate payment to' })
  @IsString()
  invoiceId: string;

  @ApiProperty({ description: 'Amount in GBP', example: 1200.00 })
  @IsNumber()
  @Min(0.01)
  amountGBP: number;

  @ApiProperty({ description: 'Payment date (ISO 8601)' })
  @IsDateString()
  paidAt: string;

  @ApiProperty({ enum: PaymentMethod, description: 'Payment method' })
  @IsEnum(PaymentMethod)
  method: PaymentMethod;

  @ApiProperty({ enum: PaymentProvider, default: 'OTHER', description: 'Payment provider' })
  @IsOptional()
  @IsEnum(PaymentProvider)
  provider?: PaymentProvider;

  @ApiProperty({ description: 'Provider reference for idempotency', example: 'manual_payment_12345' })
  @IsString()
  providerRef: string;

  @ApiProperty({ required: false, description: 'Payment processing fee in GBP' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  feeGBP?: number;

  @ApiProperty({ required: false, description: 'VAT on fee in GBP' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  vatGBP?: number;
}
