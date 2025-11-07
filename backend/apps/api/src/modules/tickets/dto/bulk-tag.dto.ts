import { IsArray, IsString, IsOptional, ArrayMaxSize, ArrayMinSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class BulkTagDto {
  @ApiProperty({
    description: 'Array of ticket IDs to tag',
    example: ['t1', 't2', 't3'],
    minItems: 1,
    maxItems: 50,
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one ticket ID must be provided' })
  @ArrayMaxSize(50, { message: 'Cannot tag more than 50 tickets at once' })
  @IsString({ each: true })
  ticket_ids: string[];

  @ApiProperty({
    description: 'Tags to add to tickets',
    example: ['urgent', 'high-priority'],
    required: false,
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  add?: string[];

  @ApiProperty({
    description: 'Tags to remove from tickets',
    example: ['low-priority'],
    required: false,
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  remove?: string[];
}
