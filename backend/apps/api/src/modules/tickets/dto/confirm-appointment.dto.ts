import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ConfirmAppointmentDto {
  @ApiProperty({ description: 'Idempotency key to prevent duplicate confirmations', required: false })
  @IsString()
  idempotencyKey?: string;
}
