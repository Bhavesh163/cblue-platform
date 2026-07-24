import { IsNotEmpty, IsString } from 'class-validator';

export class CreateQualificationSubmissionDto {
  @IsString()
  @IsNotEmpty()
  consentVersion: string;
}
