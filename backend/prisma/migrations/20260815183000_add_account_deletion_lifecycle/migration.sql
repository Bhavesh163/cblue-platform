ALTER TABLE "users"
  ADD COLUMN "deletedAt" TIMESTAMP(3),
  ADD COLUMN "deletionPolicyVersion" TEXT;

CREATE TABLE "account_deletion_audits" (
  "id" TEXT NOT NULL,
  "subjectHash" TEXT NOT NULL,
  "policyVersion" TEXT NOT NULL,
  "requestedAt" TIMESTAMP(3) NOT NULL,
  "completedAt" TIMESTAMP(3) NOT NULL,
  "retentionDeleteAt" TIMESTAMP(3) NOT NULL,
  "legalHoldUntil" TIMESTAMP(3),
  "retainedCategories" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "account_deletion_audits_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "account_deletion_audits_subjectHash_key"
  ON "account_deletion_audits"("subjectHash");

CREATE INDEX "account_deletion_audits_retentionDeleteAt_idx"
  ON "account_deletion_audits"("retentionDeleteAt");

CREATE INDEX "account_deletion_audits_legalHoldUntil_idx"
  ON "account_deletion_audits"("legalHoldUntil");
