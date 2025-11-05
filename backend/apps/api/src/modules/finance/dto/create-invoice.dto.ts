import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsString, IsDateString, IsArray, ValidateNested, IsNumber, IsOptional, Min } from 'class-validator';

export class InvoiceLineDto {
  @ApiProperty()
  @IsString()
  description: string;

  @ApiProperty({ default: 1 })
  @IsNumber()
  @Min(0)
  qty: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  unitPrice: number;

  @ApiProperty({ default: 0 })
  @IsNumber()
  @Min(0)
  taxRate: number;
}

export class CreateInvoiceDto {
  @ApiProperty()
  @IsString()
  tenancyId: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  tenantUserId?: string;

  @ApiProperty()
  @IsDateString()
  issueDate: string;

  @ApiProperty()
  @IsDateString()
  dueDate: string;

  @ApiProperty({ type: [InvoiceLineDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InvoiceLineDto)
  lines: InvoiceLineDto[];
}
