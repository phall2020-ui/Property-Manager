import { IsNotEmpty, IsString, IsOptional, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTicketDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  propertyId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  tenancyId?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ 
    enum: ['LOW', 'STANDARD', 'HIGH', 'URGENT'],
    description: 'Priority level: LOW (routine), STANDARD (normal), HIGH (important), URGENT (critical)'
  })
  @IsString()
  @IsIn(['LOW', 'STANDARD', 'HIGH', 'URGENT'])
  priority: string;
}
