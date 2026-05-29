import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, ValidateNested } from 'class-validator';
import { UploadOrderAttachmentDto } from './upload-order-attachment.dto';

export class UploadOrderAttachmentsBatchDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => UploadOrderAttachmentDto)
  attachments: UploadOrderAttachmentDto[];
}
