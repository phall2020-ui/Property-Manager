import { IsNotEmpty, IsNumber, IsString, IsOptional, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateQuoteDto {
  @ApiProperty({ 
    description: 'Quote amount in dollars',
    minimum: 10,
    maximum: 50000,
    example: 150.00
  })
  @IsNumber()
  @Min(10, { message: 'Quote amount must be at least $10' })
  @Max(50000, { message: 'Quote amount cannot exceed $50,000' })
  amount: number;

  @ApiProperty({ 
    description: 'Optional notes about the quote',
    required: false
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
