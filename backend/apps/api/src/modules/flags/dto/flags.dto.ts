import { IsString, IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateFeatureFlagDto {
  @ApiProperty({ description: 'Feature flag key' })
  @IsString()
  key: string;

  @ApiProperty({ description: 'Whether flag is enabled', default: false })
  @IsBoolean()
  enabled: boolean;

  @ApiProperty({ required: false, description: 'Optional variant for A/B testing' })
  @IsOptional()
  @IsString()
  variant?: string;
}

export class UpdateFeatureFlagDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  variant?: string;
}

export class AssignExperimentDto {
  @ApiProperty({ description: 'Experiment key' })
  @IsString()
  experimentKey: string;

  @ApiProperty({ required: false, description: 'Specific variant to assign' })
  @IsOptional()
  @IsString()
  variant?: string;
}

export class CreateUpsellOpportunityDto {
  @ApiProperty({ description: 'Opportunity type' })
  @IsString()
  type: string;

  @ApiProperty({ description: 'Opportunity status' })
  @IsString()
  status: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}
