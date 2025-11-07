import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsDateString,
  IsOptional,
  Min,
  IsObject,
  ValidateNested,
  IsInt,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BreakClauseDto {
  @ApiProperty({ description: 'Earliest date the tenancy can be broken' })
  @IsDateString()
  earliestBreakDate: string;

  @ApiProperty({ description: 'Required notice period in months' })
  @IsInt()
  @Min(1)
  noticeMonths: number;

  @ApiPropertyOptional({ description: 'Additional notes about the break clause' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class UpdateTenancyDto {
  @ApiPropertyOptional({ description: 'Start date of the tenancy' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date of the tenancy' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Monthly rent amount' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  rentPcm?: number;

  @ApiPropertyOptional({ description: 'Deposit amount' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  deposit?: number;

  @ApiPropertyOptional({ description: 'Primary tenant user ID' })
  @IsOptional()
  @IsString()
  primaryTenant?: string;

  @ApiPropertyOptional({ description: 'Break clause details', type: BreakClauseDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => BreakClauseDto)
  breakClause?: BreakClauseDto;
}
