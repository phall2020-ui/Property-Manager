import { IsNotEmpty, IsString, IsOptional, IsIn } from 'class-validator';

export class CreateTicketDto {
  @IsOptional()
  @IsString()
  propertyId?: string;

  @IsOptional()
  @IsString()
  tenancyId?: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsString()
  @IsIn(['LOW', 'MEDIUM', 'HIGH'])
  priority: string;
}
