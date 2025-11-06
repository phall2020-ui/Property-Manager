import { IsString, IsOptional, IsEnum, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum BankProvider {
  MOCK = 'MOCK',
  PLAID = 'PLAID',
  TRUELAYER = 'TRUELAYER',
}

export enum ConnectionStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  ERROR = 'ERROR',
  DISCONNECTED = 'DISCONNECTED',
}

export class CreateBankConnectionDto {
  @ApiProperty({ enum: BankProvider, default: BankProvider.MOCK })
  @IsEnum(BankProvider)
  provider: BankProvider;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  meta?: Record<string, any>;
}

export class BankConnectionResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  landlordId: string;

  @ApiProperty({ enum: BankProvider })
  provider: string;

  @ApiProperty({ enum: ConnectionStatus })
  status: string;

  @ApiProperty({ required: false })
  meta?: Record<string, any>;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class SyncBankAccountsDto {
  @ApiProperty()
  @IsString()
  connectionId: string;
}
