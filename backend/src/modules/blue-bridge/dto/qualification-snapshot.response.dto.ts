export interface QualificationSnapshotResponse {
  sourceVersion: 'cblue-fixer-qualification-v3';
  subject: { id: string; displayName: string };
  fixer: {
    id: string;
    status: string;
    verified: boolean;
    tier: string;
    yearsExperience: number | null;
    aiScore: number | null;
    aiTier: string | null;
    aiCredentialStatus: string | null;
  };
  requiredEvidence: readonly ['id-front', 'selfie-with-id'];
  optionalEvidence: readonly ['company-affidavit'];
  submission: Record<string, unknown> | null;
  reviewStatus: {
    kyc: Record<string, unknown> | null;
    tier: Record<string, unknown> | null;
  };
  tierQualification: Record<string, unknown> | null;
  kyc: Record<string, unknown>;
  tier: Record<string, unknown>;
  verification: Record<string, unknown>;
}
