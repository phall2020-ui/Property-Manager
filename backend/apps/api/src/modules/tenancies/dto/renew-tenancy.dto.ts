import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsDateString,
  IsOptional,
  Min,
  IsBoolean,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RenewTenancyDto {
  @ApiProperty({ description: 'Start date of the new tenancy' })
  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @ApiProperty({ description: 'End date of the new tenancy' })
  @IsDateString()
  @IsNotEmpty()
  endDate: string;

  @ApiProperty({ description: 'Monthly rent amount' })
  @IsNumber()
  @Min(0)
  rentPcm: number;

  @ApiPropertyOptional({ description: 'Deposit amount' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  deposit?: number;

  @ApiPropertyOptional({ description: 'Primary tenant user ID' })
  @IsOptional()
  @IsString()
  primaryTenant?: string;

  @ApiPropertyOptional({
    description: 'Whether to copy guarantors from previous tenancy',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  copyGuarantors?: boolean;
}
