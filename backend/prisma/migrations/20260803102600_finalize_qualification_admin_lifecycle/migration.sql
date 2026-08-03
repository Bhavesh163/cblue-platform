WITH retired AS (
  UPDATE "kyc_documents"
  SET
    "isActive" = false,
    "lifecycleState" = 'DELETE_PENDING'::"QualificationDocumentLifecycleState",
    "retentionDeleteAt" = NOW(),
    "cleanupNextAttemptAt" = NOW(),
    "cleanupErrorCode" = NULL
  WHERE "documentType" = 'id-back'
    AND "isActive" = true
    AND "lifecycleState" IN ('UPLOADED', 'ASSESSING', 'READY', 'FAILED')
    AND ("legalHoldUntil" IS NULL OR "legalHoldUntil" < NOW())
  RETURNING "id", "submissionId"
)
INSERT INTO "qualification_audit_logs" (
  "id", "submissionId", "actorId", "action", "entityType", "entityId", "reason", "metadata", "createdAt"
)
SELECT md5(random()::text || clock_timestamp()::text)::uuid, "submissionId", NULL, 'LEGACY_ID_BACK_RETIRED', 'KycDocument', "id",
  'Legacy back-ID evidence retired after the two-file KYC policy change',
  jsonb_build_object('documentType', 'id-back', 'retentionDeleteScheduled', true),
  NOW()
FROM retired;
