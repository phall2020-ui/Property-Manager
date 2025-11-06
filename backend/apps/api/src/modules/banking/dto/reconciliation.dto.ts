import { IsString, IsOptional, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ReconcileAutoDto {
  @ApiProperty({ description: 'Start date for reconciliation range (ISO 8601)' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ description: 'End date for reconciliation range (ISO 8601)' })
  @IsDateString()
  endDate: string;

  @ApiProperty({ required: false, description: 'Bank account ID to filter by' })
  @IsOptional()
  @IsString()
  bankAccountId?: string;
}

export class ReconcileManualDto {
  @ApiProperty({ description: 'Bank transaction ID to match' })
  @IsString()
  bankTransactionId: string;

  @ApiProperty({ description: 'Invoice ID to match with' })
  @IsString()
  invoiceId: string;
}

export class UnmatchDto {
  @ApiProperty({ description: 'Bank transaction ID to unmatch' })
  @IsString()
  bankTransactionId: string;
}

export class ReconciliationResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  bankTransactionId: string;

  @ApiProperty()
  matchType: string;

  @ApiProperty()
  confidence: number;

  @ApiProperty({ required: false })
  matchedEntityType?: string;

  @ApiProperty({ required: false })
  matchedEntityId?: string;

  @ApiProperty()
  createdAt: Date;
}
