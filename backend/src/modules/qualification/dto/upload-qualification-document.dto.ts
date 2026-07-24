import { IsIn, IsNotEmpty, IsString } from 'class-validator';

export const QUALIFICATION_DOCUMENT_TYPES = [
  'id-front',
  'id-back',
  'selfie-with-id',
  'education-certificate',
  'professional-certificate',
  'corporate-certificate',
  'project-completion-certificate',
  'international-award',
  'portfolio',
] as const;

export class UploadQualificationDocumentDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(QUALIFICATION_DOCUMENT_TYPES)
  documentType: (typeof QUALIFICATION_DOCUMENT_TYPES)[number];
}
