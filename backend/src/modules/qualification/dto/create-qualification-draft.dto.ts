import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateQualificationDraftDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  consentVersion!: string;
}
