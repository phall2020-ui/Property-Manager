import { IsNotEmpty, IsOptional, IsString, IsInt, Min } from 'class-validator';

export class CreatePropertyDto {
  @IsString()
  @IsNotEmpty()
  address1: string;

  @IsOptional()
  @IsString()
  address2?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsString()
  @IsNotEmpty()
  postcode: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  bedrooms?: number;
}