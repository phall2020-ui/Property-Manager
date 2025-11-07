import { IsNotEmpty, IsString, IsNumber, IsDateString, Min, MaxLength, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RentIncreaseDto {
  @ApiProperty({ description: 'Effective date of the rent increase' })
  @IsDateString()
  @IsNotEmpty()
  effectiveFrom: string;

  @ApiProperty({ description: 'New monthly rent amount' })
  @IsNumber()
  @Min(0)
  newRentPcm: number;

  @ApiPropertyOptional({ description: 'Reason for rent increase' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
