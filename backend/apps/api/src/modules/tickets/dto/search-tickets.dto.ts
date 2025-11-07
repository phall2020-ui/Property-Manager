import { IsOptional, IsString, IsInt, Min, Max, IsIn, IsDateString, MinLength } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class SearchTicketsDto {
  @ApiPropertyOptional({ 
    description: 'Search query for title and description (minimum 2 characters)',
    example: 'leak',
    minLength: 2,
  })
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Search query must be at least 2 characters' })
  q?: string;

  @ApiPropertyOptional({ 
    description: 'Filter by ticket ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsString()
  id?: string;

  @ApiPropertyOptional({ 
    description: 'Filter tickets created on or after this date (ISO 8601)',
    example: '2024-01-01',
  })
  @IsOptional()
  @IsDateString()
  date_from?: string;

  @ApiPropertyOptional({ 
    description: 'Filter tickets created on or before this date (ISO 8601)',
    example: '2024-12-31',
  })
  @IsOptional()
  @IsDateString()
  date_to?: string;

  @ApiPropertyOptional({ 
    description: 'Filter by category',
    example: 'plumbing',
  })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ 
    description: 'Filter by assigned contractor ID',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @IsOptional()
  @IsString()
  contractor_id?: string;

  @ApiPropertyOptional({ 
    description: 'Filter by property ID',
    example: '123e4567-e89b-12d3-a456-426614174002',
  })
  @IsOptional()
  @IsString()
  propertyId?: string;

  @ApiPropertyOptional({ 
    description: 'Filter by ticket status',
    example: 'OPEN',
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ 
    description: 'Filter by priority',
    example: 'HIGH',
  })
  @IsOptional()
  @IsString()
  priority?: string;

  @ApiPropertyOptional({ 
    description: 'Page number (default: 1)',
    example: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ 
    description: 'Items per page (default: 25, max: 100)',
    example: 25,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100, { message: 'Page size cannot exceed 100' })
  page_size?: number = 25;

  @ApiPropertyOptional({ 
    description: 'Sort field',
    example: 'created_at',
    enum: ['created_at', 'updated_at', 'priority', 'status', 'title'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['created_at', 'updated_at', 'priority', 'status', 'title'])
  sort_by?: string = 'created_at';

  @ApiPropertyOptional({ 
    description: 'Sort direction',
    example: 'desc',
    enum: ['asc', 'desc'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['asc', 'desc'])
  sort_dir?: 'asc' | 'desc' = 'desc';
}
