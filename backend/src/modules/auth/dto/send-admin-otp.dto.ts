import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class SendAdminOtpDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsOptional()
  @IsString()
  recaptchaToken?: string;
}
