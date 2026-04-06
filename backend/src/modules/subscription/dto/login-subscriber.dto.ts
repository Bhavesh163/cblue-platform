import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class LoginSubscriberDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password: string;
}
