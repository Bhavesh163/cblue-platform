ALTER TABLE "kyc_documents" ADD COLUMN "subjectNameHash" TEXT;
CREATE INDEX "kyc_documents_subjectNameHash_idx" ON "kyc_documents"("subjectNameHash");

CREATE TABLE "qualification_evidence_assessment_jobs" (
  "id" TEXT NOT NULL,
  "documentId" TEXT NOT NULL,
  "submissionId" TEXT NOT NULL,
  "status" "QualificationEvaluationStatus" NOT NULL DEFAULT 'QUEUED',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "claimedAt" TIMESTAMP(3),
  "claimedBy" TEXT,
  "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "eligibleAt" TIMESTAMP(3),
  "lastError" TEXT,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "qualification_evidence_assessment_jobs_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "qualification_evidence_assessment_jobs_documentId_key" ON "qualification_evidence_assessment_jobs"("documentId");
CREATE INDEX "qualification_evidence_assessment_jobs_status_nextAttemptAt_claimedAt_idx" ON "qualification_evidence_assessment_jobs"("status","nextAttemptAt","claimedAt");
CREATE INDEX "qualification_evidence_assessment_jobs_submissionId_status_idx" ON "qualification_evidence_assessment_jobs"("submissionId","status");
ALTER TABLE "qualification_evidence_assessment_jobs" ADD CONSTRAINT "qualification_evidence_assessment_jobs_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "kyc_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "qualification_evidence_assessment_jobs" ADD CONSTRAINT "qualification_evidence_assessment_jobs_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "kyc_submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
