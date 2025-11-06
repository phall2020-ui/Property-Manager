import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, ValidateNested, IsString, IsNumber, Min } from 'class-validator';

export class AllocationItemDto {
  @ApiProperty()
  @IsString()
  invoiceId: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  amount: number;
}

export class AllocatePaymentDto {
  @ApiProperty({ type: [AllocationItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AllocationItemDto)
  allocations: AllocationItemDto[];
}
