import { IsIn, IsString } from 'class-validator';

export class PreflightQualificationDocumentDto {
  @IsString()
  @IsIn(['id-front', 'selfie-with-id'])
  documentType: 'id-front' | 'selfie-with-id';
}
