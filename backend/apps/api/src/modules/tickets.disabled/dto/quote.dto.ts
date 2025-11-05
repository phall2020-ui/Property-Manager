import { IsNumberString, IsOptional, IsString } from 'class-validator';

export class QuoteDto {
  @IsNumberString()
  amount: string;

  @IsOptional()
  @IsString()
  message?: string;
}