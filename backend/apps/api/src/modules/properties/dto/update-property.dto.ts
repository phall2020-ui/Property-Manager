import { IsOptional, IsString, IsInt, Min, IsObject, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdatePropertyDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  addressLine1?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  address2?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Matches(/^[A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2}$/i, {
    message: 'Invalid UK postcode format',
  })
  postcode?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  bedrooms?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  councilTaxBand?: string;

  @ApiProperty({ required: false, description: 'Property attributes like propertyType, furnished, etc.' })
  @IsOptional()
  @IsObject()
  attributes?: {
    propertyType?: string;
    furnished?: string;
    epcRating?: string;
    propertyValue?: number;
  };
}
