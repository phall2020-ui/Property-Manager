import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsDateString, IsOptional, Min, IsEnum } from 'class-validator';

export enum PaymentMethod {
  GOCARDLESS = 'GOCARDLESS',
  STRIPE = 'STRIPE',
  BANK_TRANSFER = 'BANK_TRANSFER',
  CASH = 'CASH',
  OTHER = 'OTHER',
}

export class RecordPaymentDto {
  @ApiProperty()
  @IsString()
  tenancyId: string;

  @ApiProperty({ enum: PaymentMethod })
  @IsEnum(PaymentMethod)
  method: PaymentMethod;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty()
  @IsDateString()
  receivedAt: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  externalId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  tenantUserId?: string;
}
