import { IsIn, IsOptional, IsString } from 'class-validator';

export const LEGAL_POLICY_LOCALES = ['en', 'th', 'zh'] as const;
export type LegalPolicyLocale = (typeof LEGAL_POLICY_LOCALES)[number];

export class LegalPoliciesQueryDto {
  @IsOptional()
  @IsString()
  @IsIn(LEGAL_POLICY_LOCALES)
  locale?: LegalPolicyLocale;
}

export class LegalPoliciesResponseDto {
  termsOfUseUrl!: string;
  refundPolicyUrl!: string;
  retentionPolicyUrl!: string;
}
