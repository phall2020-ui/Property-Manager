import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateTicketDto {
  @IsUUID()
  propertyId: string;

  @IsOptional()
  @IsUUID()
  tenancyId?: string;

  @IsString()
  @IsNotEmpty()
  category: string;

  @IsString()
  @IsNotEmpty()
  priority: string;

  @IsOptional()
  @IsString()
  description?: string;
}