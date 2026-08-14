import { IsString, Matches } from 'class-validator';

export class UpdateUserDto {
  @IsString()
  @Matches(/^[0-9\s\-+()]{9,15}$/)
  phone: string;
}
