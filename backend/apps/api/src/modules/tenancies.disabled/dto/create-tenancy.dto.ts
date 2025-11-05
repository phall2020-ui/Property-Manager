import { IsDateString, IsNotEmpty, IsOptional, IsString, IsNumberString } from 'class-validator';

export class CreateTenancyDto {
  @IsString()
  @IsNotEmpty()
  propertyId: string;

  @IsDateString()
  startDate: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsNumberString()
  rentAmount: string;

  @IsOptional()
  @IsString()
  depositScheme?: string;
}