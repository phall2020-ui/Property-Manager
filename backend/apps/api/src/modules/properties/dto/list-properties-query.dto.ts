import { IsOptional, IsString, IsInt, Min, Max, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';

export class ListPropertiesQueryDto {
  @ApiProperty({ required: false, description: 'Search term for address, city, or postcode' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({ 
    required: false, 
    description: 'Filter by property type',
    enum: ['HOUSE', 'FLAT', 'HMO', 'OTHER', 'House', 'Flat', 'Maisonette', 'Bungalow'],
  })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiProperty({ required: false, description: 'Filter by city' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiProperty({ required: false, description: 'Filter by postcode' })
  @IsOptional()
  @IsString()
  postcode?: string;

  @ApiProperty({ required: false, description: 'Page number (default: 1)', minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiProperty({ 
    required: false, 
    description: 'Number of items per page (default: 20)', 
    minimum: 1, 
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;

  @ApiProperty({ 
    required: false, 
    description: 'Sort field',
    enum: ['updatedAt', 'addressLine1', 'address1', 'createdAt'],
  })
  @IsOptional()
  @IsString()
  sort?: string;

  @ApiProperty({ 
    required: false, 
    description: 'Sort order',
    enum: ['asc', 'desc'],
  })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  order?: 'asc' | 'desc';
}
