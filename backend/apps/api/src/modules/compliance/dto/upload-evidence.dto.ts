import { IsString, IsOptional, IsDateString } from 'class-validator';

export class UploadEvidenceDto {
  @IsString()
  complianceType: string;

  @IsDateString()
  @IsOptional()
  expiryDate?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
