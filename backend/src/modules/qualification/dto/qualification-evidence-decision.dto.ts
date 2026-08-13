import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export const REVIEWABLE_EVIDENCE_STATUSES = [
  'VALIDATED',
  'CONTRADICTED',
  'INSUFFICIENT',
  'EXPIRED',
] as const;

export type ReviewableEvidenceStatus =
  (typeof REVIEWABLE_EVIDENCE_STATUSES)[number];

export class QualificationEvidenceDecisionDto {
  @IsIn(REVIEWABLE_EVIDENCE_STATUSES)
  evidenceStatus: ReviewableEvidenceStatus;

  @IsString()
  @MinLength(10)
  reason: string;

  @IsOptional()
  @IsString()
  @Matches(/^[0-9\u0E50-\u0E59\s-]{13,30}$/)
  identityNumber?: string;

  @IsOptional()
  @IsDateString()
  identityExpiryDate?: string;

  @IsOptional()
  @IsBoolean()
  documentTypeConfirmed?: boolean;

  @IsOptional()
  @IsBoolean()
  documentReadable?: boolean;

  @IsOptional()
  @IsBoolean()
  applicantNameMatches?: boolean;

  @IsOptional()
  @IsBoolean()
  identityUnexpiredConfirmed?: boolean;

  @IsOptional()
  @IsBoolean()
  faceMatchConfirmed?: boolean;

  @IsOptional()
  @IsBoolean()
  selfieReviewCompleted?: boolean;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  companyName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  companyRegistrationNumber?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(200, { each: true })
  directorNames?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(200)
  authorityHolderName?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  contactEmail?: string;

  @IsOptional()
  @IsBoolean()
  intentToJoinCblue?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  authorizedApplicantName?: string;

  @IsOptional()
  @IsBoolean()
  companyNameMatches?: boolean;

  @IsOptional()
  @IsBoolean()
  companyAuthorityConfirmed?: boolean;
}
