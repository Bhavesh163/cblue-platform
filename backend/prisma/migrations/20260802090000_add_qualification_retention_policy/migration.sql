ALTER TABLE "users"
  ADD COLUMN "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "inactiveNoticeAt" TIMESTAMP(3),
  ADD COLUMN "inactiveDeleteAt" TIMESTAMP(3),
  ADD COLUMN "legalHoldUntil" TIMESTAMP(3);

ALTER TABLE "kyc_submissions"
  ADD COLUMN "consentRetentionDeleteAt" TIMESTAMP(3);

UPDATE "kyc_submissions"
SET "consentRetentionDeleteAt" = "consentAt" + INTERVAL '3 years'
WHERE "consentAt" IS NOT NULL
  AND "consentRetentionDeleteAt" IS NULL;

CREATE INDEX "users_lastActivityAt_legalHoldUntil_idx"
  ON "users"("lastActivityAt", "legalHoldUntil");

CREATE INDEX "kyc_submissions_consentRetentionDeleteAt_idx"
  ON "kyc_submissions"("consentRetentionDeleteAt");
