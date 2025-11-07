import { IsArray, IsString, IsOptional, ArrayMinSize, ArrayMaxSize } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BulkCloseDto {
  @ApiProperty({
    description: 'Array of ticket IDs to close (max 50)',
    example: ['ticket-1', 'ticket-2', 'ticket-3'],
    minItems: 1,
    maxItems: 50,
  })
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1, { message: 'At least one ticket ID is required' })
  @ArrayMaxSize(50, { message: 'Cannot close more than 50 tickets at once' })
  ticket_ids: string[];

  @ApiPropertyOptional({
    description: 'Optional resolution note for all tickets',
    example: 'Resolved as duplicate',
  })
  @IsOptional()
  @IsString()
  resolution_note?: string;
}
