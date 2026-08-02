export type QualificationReasonCode =
  | 'DOCUMENT_VALID'
  | 'WRONG_DOCUMENT_TYPE'
  | 'UNREADABLE_DOCUMENT'
  | 'EXPIRED_ID'
  | 'IDENTITY_CONTRADICTION'
  | 'INVALID_ID_NUMBER'
  | 'SELFIE_REVIEW_REQUIRED'
  | 'AFFIDAVIT_REVIEW_REQUIRED'
  | 'AFFIDAVIT_EXPIRED'
  | 'LIVENESS_FAILED'
  | 'MISSING_REQUIRED_EVIDENCE'
  | 'PROVIDER_UNAVAILABLE'
  | 'HUMAN_REVIEW_REQUIRED';

export type QualificationDocumentAssessment = {
  evidenceStatus:
    | 'VALIDATED'
    | 'CONTRADICTED'
    | 'EXPIRED'
    | 'INSUFFICIENT'
    | 'UNCHECKED';
  route:
    | 'NEEDS_RESUBMISSION'
    | 'NEEDS_MORE_EVIDENCE'
    | 'NEEDS_REVIEW'
    | 'AI_PRECLEARED';
  confidence: number | null;
  identityConfidence: number | null;
  documentAuthenticityConfidence: number | null;
  faceMatchConfidence: number | null;
  livenessConfidence: number | null;
  reasonCodes: QualificationReasonCode[];
  extractedFields?: Record<string, string | number | null> | null;
  identityNumberLast4?: string | null;
  identityNumberHash?: string | null;
  identityExpiryDate?: Date | null;
  provider: string;
  model: string | null;
  assessedAt: Date;
};
