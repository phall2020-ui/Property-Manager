import { IsNotEmpty, IsOptional, IsString, IsUUID, IsJSON } from 'class-validator';

export class CreateDocumentDto {
  @IsString()
  @IsNotEmpty()
  ownerType: string;

  @IsString()
  @IsNotEmpty()
  ownerId: string;

  @IsString()
  @IsNotEmpty()
  docType: string;

  @IsString()
  @IsNotEmpty()
  url: string;

  @IsOptional()
  @IsString()
  hash?: string;

  @IsOptional()
  @IsString()
  expiryDate?: string;

  @IsOptional()
  @IsJSON()
  extracted?: any;
}