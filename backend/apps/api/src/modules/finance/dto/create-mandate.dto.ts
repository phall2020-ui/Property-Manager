import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEnum } from 'class-validator';

export enum MandateProvider {
  GOCARDLESS = 'GOCARDLESS',
  STRIPE = 'STRIPE',
}

export class CreateMandateDto {
  @ApiProperty()
  @IsString()
  tenancyId: string;

  @ApiProperty()
  @IsString()
  tenantUserId: string;

  @ApiProperty({ enum: MandateProvider })
  @IsEnum(MandateProvider)
  provider: MandateProvider;
}
