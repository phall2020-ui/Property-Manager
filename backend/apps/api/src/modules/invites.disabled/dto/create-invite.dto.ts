import { IsEmail, IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class CreateInviteDto {
  @IsUUID()
  tenancyId: string;

  @IsEmail()
  email: string;
}