import { IsString, IsNotEmpty } from 'class-validator';

export class UploadKycDto {
  @IsString()
  @IsNotEmpty()
  url: string;

  @IsString()
  @IsNotEmpty()
  key: string;
}
