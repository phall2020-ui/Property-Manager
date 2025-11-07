import { IsArray, IsIn, IsString, ArrayMaxSize, ArrayMinSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

const VALID_STATUSES = [
  'OPEN',
  'TRIAGED',
  'QUOTED',
  'APPROVED',
  'IN_PROGRESS',
  'COMPLETED',
  'AUDITED',
  'CANCELLED',
] as const;

export class BulkUpdateStatusDto {
  @ApiProperty({
    description: 'Array of ticket IDs to update',
    example: ['123e4567-e89b-12d3-a456-426614174000', '123e4567-e89b-12d3-a456-426614174001'],
    minItems: 1,
    maxItems: 50,
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one ticket ID must be provided' })
  @ArrayMaxSize(50, { message: 'Cannot update more than 50 tickets at once' })
  @IsString({ each: true })
  ticketIds: string[];

  @ApiProperty({
    description: 'New status for the tickets',
    enum: VALID_STATUSES,
    example: 'TRIAGED',
  })
  @IsString()
  @IsIn(VALID_STATUSES)
  status: typeof VALID_STATUSES[number];
}
