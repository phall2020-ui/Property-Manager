import { IsNotEmpty, IsString, IsISO8601, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ProposeAppointmentDto {
  @ApiProperty({ description: 'Start time of the appointment (ISO 8601 format)', example: '2024-12-15T10:00:00Z' })
  @IsISO8601()
  @IsNotEmpty()
  startAt: string;

  @ApiProperty({ description: 'End time of the appointment (ISO 8601 format)', example: '2024-12-15T12:00:00Z', required: false })
  @IsISO8601()
  @IsOptional()
  endAt?: string;

  @ApiProperty({ description: 'Additional notes for the appointment', required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}
