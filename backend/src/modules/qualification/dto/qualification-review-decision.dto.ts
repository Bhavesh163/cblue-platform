import { FixerTier } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';

export enum QualificationReviewDecision {
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
}

export class QualificationReviewDecisionDto {
  @IsEnum(QualificationReviewDecision)
  decision: QualificationReviewDecision;

  @IsOptional()
  @IsEnum(FixerTier)
  approvedTier?: FixerTier;

  @IsString()
  @MinLength(10)
  reason: string;
}
