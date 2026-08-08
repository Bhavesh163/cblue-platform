import { FixerTier } from '@prisma/client';
import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export enum QualificationReviewDecision {
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
}

export enum QualificationProviderIdentityType {
  PERSONAL = 'PERSONAL',
  COMPANY = 'COMPANY',
}

export class QualificationReviewDecisionDto {
  @IsEnum(QualificationReviewDecision)
  decision: QualificationReviewDecision;

  @IsOptional()
  @IsEnum(FixerTier)
  approvedTier?: FixerTier;

  @IsOptional()
  @IsEnum(QualificationProviderIdentityType)
  providerIdentityType?: QualificationProviderIdentityType;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  approvedProviderName?: string;

  @IsString()
  @MinLength(10)
  reason: string;
}
