import { IsString, IsNotEmpty, Matches } from 'class-validator';

export class SendOtpDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^(\+66|0)\d{8,9}$/, {
    message: 'Phone must be a valid Thai phone number',
  })
  phone: string;
}
