import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class AcceptInviteDto {
  @IsString()
  token: string;

  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsString()
  @IsNotEmpty()
  displayName: string;
}