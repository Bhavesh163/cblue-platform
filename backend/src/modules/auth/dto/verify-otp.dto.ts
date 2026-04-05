import { IsString, IsNotEmpty, Matches, Length } from 'class-validator';

export class VerifyOtpDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^(\+66|0)\d{8,9}$/, {
    message: 'Phone must be a valid Thai phone number',
  })
  phone: string;

  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  code: string;
}
