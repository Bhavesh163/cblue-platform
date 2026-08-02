ALTER TABLE "kyc_documents"
DROP CONSTRAINT IF EXISTS "kyc_documents_documentType_allowed";

ALTER TABLE "kyc_documents"
ADD CONSTRAINT "kyc_documents_documentType_allowed"
CHECK ("documentType" IN ('id-front', 'id-back', 'selfie-with-id', 'company-affidavit', 'education-certificate', 'professional-certificate', 'corporate-certificate', 'project-completion-certificate', 'international-award', 'portfolio')) NOT VALID;
