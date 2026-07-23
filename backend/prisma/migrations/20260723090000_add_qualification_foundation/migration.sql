CREATE TYPE "QualificationSubmissionStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'PROCESSING', 'NEEDS_REVIEW', 'NEEDS_MORE_EVIDENCE', 'APPROVED', 'REJECTED', 'EXPIRED');
CREATE TYPE "QualificationEvaluationStatus" AS ENUM ('QUEUED', 'RUNNING', 'COMPLETED', 'FAILED');
CREATE TYPE "QualificationEvidenceStatus" AS ENUM ('UNCHECKED', 'VALIDATED', 'CONTRADICTED', 'EXPIRED', 'INSUFFICIENT');
CREATE TYPE "QualificationReviewStatus" AS ENUM ('OPEN', 'ASSIGNED', 'DECIDED');
CREATE TYPE "QualificationDecisionSource" AS ENUM ('DETERMINISTIC', 'AI_ADVISORY', 'HUMAN');
CREATE TYPE "QualificationRisk" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

CREATE TABLE "kyc_submissions" (
  "id" TEXT NOT NULL,
  "fixerId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "status" "QualificationSubmissionStatus" NOT NULL DEFAULT 'DRAFT',
  "policyVersion" TEXT NOT NULL,
  "consentAt" TIMESTAMP(3),
  "consentVersion" TEXT,
  "submittedAt" TIMESTAMP(3),
  "reviewedAt" TIMESTAMP(3),
  "reviewerId" TEXT,
  "decisionReason" TEXT,
  "failedAttempts" INTEGER NOT NULL DEFAULT 0,
  "lockedUntil" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "kyc_submissions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "kyc_submissions_fixerId_version_key" ON "kyc_submissions"("fixerId", "version");
CREATE INDEX "kyc_submissions_status_createdAt_idx" ON "kyc_submissions"("status", "createdAt");
CREATE INDEX "kyc_submissions_fixerId_createdAt_idx" ON "kyc_submissions"("fixerId", "createdAt");

CREATE TABLE "kyc_documents" (
  "id" TEXT NOT NULL,
  "submissionId" TEXT NOT NULL,
  "documentType" TEXT NOT NULL,
  "storageKey" TEXT NOT NULL,
  "checksumSha256" TEXT NOT NULL,
  "contentType" TEXT NOT NULL,
  "sizeBytes" INTEGER NOT NULL,
  "encrypted" BOOLEAN NOT NULL DEFAULT true,
  "evidenceStatus" "QualificationEvidenceStatus" NOT NULL DEFAULT 'UNCHECKED',
  "extractedFields" JSONB,
  "expiresAt" TIMESTAMP(3),
  "retentionDeleteAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "kyc_documents_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "kyc_documents_submissionId_idx" ON "kyc_documents"("submissionId");
CREATE INDEX "kyc_documents_evidenceStatus_expiresAt_idx" ON "kyc_documents"("evidenceStatus", "expiresAt");

CREATE TABLE "qualification_evaluations" (
  "id" TEXT NOT NULL,
  "submissionId" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "model" TEXT,
  "promptVersion" TEXT,
  "policyVersion" TEXT NOT NULL,
  "status" "QualificationEvaluationStatus" NOT NULL DEFAULT 'QUEUED',
  "deterministicScore" INTEGER,
  "aiScore" INTEGER,
  "risk" "QualificationRisk",
  "recommendedTier" "FixerTier",
  "confidence" INTEGER,
  "inputHash" TEXT NOT NULL,
  "output" JSONB,
  "errorCode" TEXT,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "qualification_evaluations_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "qualification_evaluations_submissionId_createdAt_idx" ON "qualification_evaluations"("submissionId", "createdAt");
CREATE INDEX "qualification_evaluations_status_createdAt_idx" ON "qualification_evaluations"("status", "createdAt");

CREATE TABLE "qualification_evidence_findings" (
  "id" TEXT NOT NULL,
  "evaluationId" TEXT NOT NULL,
  "documentId" TEXT,
  "code" TEXT NOT NULL,
  "severity" TEXT NOT NULL,
  "claim" TEXT NOT NULL,
  "result" "QualificationEvidenceStatus" NOT NULL,
  "confidence" INTEGER,
  "sourceRef" TEXT,
  "details" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "qualification_evidence_findings_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "qualification_evidence_findings_evaluationId_idx" ON "qualification_evidence_findings"("evaluationId");
CREATE INDEX "qualification_evidence_findings_result_severity_idx" ON "qualification_evidence_findings"("result", "severity");

CREATE TABLE "tier_requirements" (
  "id" TEXT NOT NULL,
  "tier" "FixerTier" NOT NULL,
  "policyVersion" TEXT NOT NULL,
  "ruleKey" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "criteria" JSONB NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "tier_requirements_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "tier_requirements_tier_policyVersion_ruleKey_key" ON "tier_requirements"("tier", "policyVersion", "ruleKey");
CREATE INDEX "tier_requirements_tier_enabled_idx" ON "tier_requirements"("tier", "enabled");

CREATE TABLE "tier_qualifications" (
  "id" TEXT NOT NULL,
  "fixerId" TEXT NOT NULL,
  "submissionId" TEXT,
  "recommendedTier" "FixerTier",
  "approvedTier" "FixerTier",
  "source" "QualificationDecisionSource" NOT NULL,
  "policyVersion" TEXT NOT NULL,
  "reason" TEXT,
  "effectiveAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3),
  "approvedBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "tier_qualifications_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "tier_qualifications_fixerId_createdAt_idx" ON "tier_qualifications"("fixerId", "createdAt");
CREATE INDEX "tier_qualifications_approvedTier_expiresAt_idx" ON "tier_qualifications"("approvedTier", "expiresAt");

CREATE TABLE "qualification_review_tasks" (
  "id" TEXT NOT NULL,
  "submissionId" TEXT NOT NULL,
  "status" "QualificationReviewStatus" NOT NULL DEFAULT 'OPEN',
  "priority" INTEGER NOT NULL DEFAULT 0,
  "reasonCodes" JSONB NOT NULL,
  "assignedTo" TEXT,
  "assignedAt" TIMESTAMP(3),
  "decidedAt" TIMESTAMP(3),
  "decision" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "qualification_review_tasks_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "qualification_review_tasks_status_priority_createdAt_idx" ON "qualification_review_tasks"("status", "priority", "createdAt");
CREATE INDEX "qualification_review_tasks_submissionId_idx" ON "qualification_review_tasks"("submissionId");

CREATE TABLE "qualification_audit_logs" (
  "id" TEXT NOT NULL,
  "submissionId" TEXT NOT NULL,
  "actorId" TEXT,
  "action" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "reason" TEXT,
  "beforeHash" TEXT,
  "afterHash" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "qualification_audit_logs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "qualification_audit_logs_submissionId_createdAt_idx" ON "qualification_audit_logs"("submissionId", "createdAt");
CREATE INDEX "qualification_audit_logs_actorId_createdAt_idx" ON "qualification_audit_logs"("actorId", "createdAt");

ALTER TABLE "kyc_submissions" ADD CONSTRAINT "kyc_submissions_fixerId_fkey" FOREIGN KEY ("fixerId") REFERENCES "fixers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "kyc_documents" ADD CONSTRAINT "kyc_documents_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "kyc_submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "qualification_evaluations" ADD CONSTRAINT "qualification_evaluations_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "kyc_submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "qualification_evidence_findings" ADD CONSTRAINT "qualification_evidence_findings_evaluationId_fkey" FOREIGN KEY ("evaluationId") REFERENCES "qualification_evaluations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tier_qualifications" ADD CONSTRAINT "tier_qualifications_fixerId_fkey" FOREIGN KEY ("fixerId") REFERENCES "fixers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tier_qualifications" ADD CONSTRAINT "tier_qualifications_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "kyc_submissions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "qualification_review_tasks" ADD CONSTRAINT "qualification_review_tasks_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "kyc_submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "qualification_audit_logs" ADD CONSTRAINT "qualification_audit_logs_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "kyc_submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
