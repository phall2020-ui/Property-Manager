import { IsIn, IsString } from 'class-validator';
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

export class UpdateStatusDto {
  @ApiProperty({
    description: 'New status for the ticket',
    enum: VALID_STATUSES,
    example: 'TRIAGED',
  })
  @IsString()
  @IsIn(VALID_STATUSES)
  to: typeof VALID_STATUSES[number];
}
