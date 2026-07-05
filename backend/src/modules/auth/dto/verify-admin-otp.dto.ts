import { IsEmail, IsNotEmpty, IsString, Length } from 'class-validator';

export class VerifyAdminOtpDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  code: string;
}
