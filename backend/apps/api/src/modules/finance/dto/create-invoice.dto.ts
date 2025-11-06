import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsDateString, IsNumber, IsOptional, Min } from 'class-validator';

export class CreateInvoiceDto {
  @ApiProperty({ description: 'Tenancy ID' })
  @IsString()
  tenancyId: string;

  @ApiProperty({ description: 'Billing period start date (ISO 8601)' })
  @IsDateString()
  periodStart: string;

  @ApiProperty({ description: 'Billing period end date (ISO 8601)' })
  @IsDateString()
  periodEnd: string;

  @ApiProperty({ description: 'Due date (ISO 8601)' })
  @IsDateString()
  dueAt: string;

  @ApiProperty({ description: 'Amount in GBP', example: 1200.00 })
  @IsNumber()
  @Min(0.01)
  amountGBP: number;

  @ApiProperty({ description: 'Human-readable reference', required: false, example: '2025-03 Rent' })
  @IsOptional()
  @IsString()
  reference?: string;

  @ApiProperty({ description: 'Optional notes', required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}
