import { IsArray, IsString, IsOptional, ArrayMaxSize, ArrayMinSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class BulkCloseDto {
  @ApiProperty({
    description: 'Array of ticket IDs to close',
    example: ['t1', 't2', 't3'],
    minItems: 1,
    maxItems: 50,
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one ticket ID must be provided' })
  @ArrayMaxSize(50, { message: 'Cannot close more than 50 tickets at once' })
  @IsString({ each: true })
  ticket_ids: string[];

  @ApiProperty({
    description: 'Optional resolution note for closed tickets',
    example: 'Bulk closure - no further action needed',
    required: false,
  })
  @IsString()
  @IsOptional()
  resolution_note?: string;
}
