import { IsArray, IsString, IsNotEmpty, ArrayMaxSize, ArrayMinSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class BulkAssignDto {
  @ApiProperty({
    description: 'Array of ticket IDs to assign',
    example: ['123e4567-e89b-12d3-a456-426614174000', '123e4567-e89b-12d3-a456-426614174001'],
    minItems: 1,
    maxItems: 50,
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one ticket ID must be provided' })
  @ArrayMaxSize(50, { message: 'Cannot assign more than 50 tickets at once' })
  @IsString({ each: true })
  ticketIds: string[];

  @ApiProperty({
    description: 'ID of the contractor to assign to the tickets',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  @IsNotEmpty()
  contractorId: string;
}
