ALTER TABLE "qualification_credential_verifications"
ADD COLUMN "credentialCount" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "qualification_credential_verifications"
ADD CONSTRAINT "qualification_credential_verifications_credentialCount_check"
CHECK ("credentialCount" BETWEEN 1 AND 20);
