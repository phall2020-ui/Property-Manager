import { IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class DeletePropertyQueryDto {
  @ApiProperty({ 
    required: false, 
    description: 'Force delete even if there are active or scheduled tenancies',
    type: Boolean,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  force?: boolean;

  @ApiProperty({ 
    required: false, 
    description: 'Remove associated images when deleting',
    type: Boolean,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  purgeImages?: boolean;
}
