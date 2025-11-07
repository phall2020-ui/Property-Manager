import { IsArray, IsString, ArrayMinSize, ArrayMaxSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class BulkReassignDto {
  @ApiProperty({
    description: 'Array of ticket IDs to reassign (max 50)',
    example: ['ticket-1', 'ticket-2', 'ticket-3'],
    minItems: 1,
    maxItems: 50,
  })
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1, { message: 'At least one ticket ID is required' })
  @ArrayMaxSize(50, { message: 'Cannot reassign more than 50 tickets at once' })
  ticket_ids: string[];

  @ApiProperty({
    description: 'New contractor ID to assign tickets to',
    example: 'contractor-uuid',
  })
  @IsString()
  contractor_id: string;
}
