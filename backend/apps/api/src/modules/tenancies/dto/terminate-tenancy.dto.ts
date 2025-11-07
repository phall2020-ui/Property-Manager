import { IsNotEmpty, IsString, IsDateString, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TerminateTenancyDto {
  @ApiProperty({ description: 'Reason for termination' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason: string;

  @ApiPropertyOptional({ description: 'Date of termination (defaults to now)' })
  @IsOptional()
  @IsDateString()
  terminatedAt?: string;
}
