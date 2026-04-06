import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class CreateSubscriberDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsString()
  company?: string;

  @IsString()
  serviceCategory?: string;

  @IsString()
  description?: string;
}
