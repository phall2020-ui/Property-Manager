import { IsEmail, IsIn, IsOptional, IsString, MinLength } from 'class-validator';

export class SignupDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  displayName: string;

  @IsIn(['LANDLORD', 'TENANT', 'CONTRACTOR', 'OPS'])
  role: string;

  @IsOptional()
  @IsString()
  name?: string; // landlord or contractor name
}