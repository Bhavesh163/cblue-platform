import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  Max,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export const CREDENTIAL_VERIFICATION_STATUSES = [
  'PENDING',
  'VERIFIED',
  'REJECTED',
  'UNVERIFIABLE',
] as const;

export const CREDENTIAL_ISSUER_TYPES = [
  'EDUCATIONAL_INSTITUTION',
  'PROFESSIONAL_BODY',
  'SET_LISTED_COMPANY',
  'INTERNATIONAL_COMPANY',
  'GOVERNMENT',
  'OTHER',
] as const;

export class QualificationCredentialVerificationDto {
  @IsIn(CREDENTIAL_VERIFICATION_STATUSES)
  status: (typeof CREDENTIAL_VERIFICATION_STATUSES)[number];

  @IsOptional()
  @IsIn(CREDENTIAL_ISSUER_TYPES)
  issuerType?: (typeof CREDENTIAL_ISSUER_TYPES)[number];

  @IsOptional()
  @IsString()
  @MaxLength(200)
  issuerName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  credentialType?: string;
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  credentialCount?: number;

  @IsString()
  @MinLength(3)
  @MaxLength(80)
  verificationMethod: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  externalReference?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  projectValueBaht?: number;

  @IsBoolean()
  corporateEndorsement: boolean;

  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  reason: string;
}
