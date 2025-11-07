import { IsArray, IsString, IsOptional, ArrayMinSize, ArrayMaxSize } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BulkTagDto {
  @ApiProperty({
    description: 'Array of ticket IDs to update tags (max 50)',
    example: ['ticket-1', 'ticket-2', 'ticket-3'],
    minItems: 1,
    maxItems: 50,
  })
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1, { message: 'At least one ticket ID is required' })
  @ArrayMaxSize(50, { message: 'Cannot update more than 50 tickets at once' })
  ticket_ids: string[];

  @ApiPropertyOptional({
    description: 'Tags to add to tickets',
    example: ['urgent', 'priority'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  add?: string[];

  @ApiPropertyOptional({
    description: 'Tags to remove from tickets',
    example: ['low-priority'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  remove?: string[];
}
