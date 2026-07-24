import { IsIn, IsString, MinLength } from 'class-validator';

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
}
