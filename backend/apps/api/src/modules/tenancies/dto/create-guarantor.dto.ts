import { IsNotEmpty, IsString, IsEmail, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateGuarantorDto {
  @ApiProperty({ description: 'Guarantor full name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Guarantor email address' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiPropertyOptional({ description: 'Guarantor phone number' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ description: 'Additional notes about the guarantor' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
