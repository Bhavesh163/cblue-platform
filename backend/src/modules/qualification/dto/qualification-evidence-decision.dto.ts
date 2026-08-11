import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  Matches,
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
}
