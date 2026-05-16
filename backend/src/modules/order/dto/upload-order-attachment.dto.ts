import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class UploadOrderAttachmentDto {
  @IsString()
  @IsNotEmpty()
  url: string;

  @IsString()
  @IsOptional()
  key?: string;
}
