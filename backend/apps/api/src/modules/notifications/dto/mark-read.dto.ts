import { IsArray, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class MarkReadDto {
  @ApiProperty({
    description: 'Array of notification IDs to mark as read',
    example: ['notif-123', 'notif-456'],
  })
  @IsArray()
  @IsString({ each: true })
  ids: string[];
}
