import { IsArray, IsString, IsNotEmpty, ArrayMaxSize, ArrayMinSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class BulkCategoryDto {
  @ApiProperty({
    description: 'Array of ticket IDs to update category',
    example: ['t1', 't2', 't3'],
    minItems: 1,
    maxItems: 50,
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one ticket ID must be provided' })
  @ArrayMaxSize(50, { message: 'Cannot update more than 50 tickets at once' })
  @IsString({ each: true })
  ticket_ids: string[];

  @ApiProperty({
    description: 'New category for the tickets',
    example: 'plumbing',
  })
  @IsString()
  @IsNotEmpty()
  category: string;
}
