CREATE TYPE "QualificationCredentialVerificationStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED', 'UNVERIFIABLE');

CREATE TYPE "QualificationCredentialIssuerType" AS ENUM ('EDUCATIONAL_INSTITUTION', 'PROFESSIONAL_BODY', 'SET_LISTED_COMPANY', 'INTERNATIONAL_COMPANY', 'GOVERNMENT', 'OTHER');

CREATE TABLE "qualification_credential_verifications" (
  "id" UUID NOT NULL,
  "documentId" UUID NOT NULL,
  "submissionId" UUID NOT NULL,
  "status" "QualificationCredentialVerificationStatus" NOT NULL DEFAULT 'PENDING',
  "issuerType" "QualificationCredentialIssuerType",
  "issuerName" TEXT,
  "credentialType" TEXT,
  "verificationMethod" TEXT NOT NULL,
  "externalReference" TEXT,
  "projectValueBaht" INTEGER,
  "corporateEndorsement" BOOLEAN NOT NULL DEFAULT false,
  "sourceSnapshotHash" TEXT,
  "reason" TEXT NOT NULL,
  "verifiedBy" UUID NOT NULL,
  "verifiedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "qualification_credential_verifications_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "qualification_credential_verifications_documentId_createdAt_idx" ON "qualification_credential_verifications"("documentId", "createdAt");
CREATE INDEX "qualification_credential_verifications_submissionId_status_createdAt_idx" ON "qualification_credential_verifications"("submissionId", "status", "createdAt");
CREATE INDEX "qualification_credential_verifications_status_createdAt_idx" ON "qualification_credential_verifications"("status", "createdAt");

ALTER TABLE "qualification_credential_verifications" ADD CONSTRAINT "qualification_credential_verifications_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "kyc_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "qualification_credential_verifications" ADD CONSTRAINT "qualification_credential_verifications_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "kyc_submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
