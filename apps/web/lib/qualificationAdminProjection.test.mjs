import assert from "node:assert/strict";
import test from "node:test";
import {
  biometricAssessmentLabel,
  buildQualificationDecisionPayload,
  qualificationAssessmentTimestamp,
  qualificationHistoryDocuments,
  qualificationAssessmentSummary,
  qualificationDocumentChecks,
  qualificationFindingsForDocument,
  qualificationReasonLabels,
  safeQualificationExtractedFields,
  visibleQualificationDocuments,
} from "./qualificationAdminProjection.mjs";

test("keeps current evidence and removes retired legacy back-ID records", () => {
  const result = visibleQualificationDocuments([
    {
      id: "front",
      documentType: "id-front",
      isActive: true,
      lifecycleState: "READY",
    },
    {
      id: "selfie",
      documentType: "selfie-with-id",
      isActive: true,
      lifecycleState: "READY",
    },
    {
      id: "back",
      documentType: "id-back",
      isActive: true,
      lifecycleState: "READY",
    },
    {
      id: "deleted",
      documentType: "portfolio",
      isActive: false,
      lifecycleState: "DELETE_PENDING",
    },
  ]);

  assert.deepEqual(
    result.map((document) => document.id),
    ["front", "selfie"],
  );
});

test("qualification history retains inactive assessed evidence but hides ID backs and deleted objects", () => {
  const documents = qualificationHistoryDocuments([
    {
      id: "active",
      documentType: "id-front",
      isActive: true,
      lifecycleState: "READY",
    },
    {
      id: "rejected",
      documentType: "selfie-with-id",
      isActive: false,
      lifecycleState: "READY",
    },
    {
      id: "legacy-back",
      documentType: "id-back",
      isActive: false,
      lifecycleState: "READY",
    },
    {
      id: "deleted",
      documentType: "portfolio",
      isActive: false,
      lifecycleState: "DELETE_PENDING",
    },
    {
      id: "object-deleted",
      documentType: "portfolio",
      isActive: false,
      lifecycleState: "READY",
      objectDeletedAt: "2026-08-09T00:00:00.000Z",
    },
  ]);

  assert.deepEqual(
    documents.map((document) => document.id),
    ["active", "rejected"],
  );
});

test("projects document-specific checks without claiming biometric work", () => {
  const idChecks = qualificationDocumentChecks({
    documentType: "id-front",
    assessmentReasonCodes: ["DOCUMENT_VALID", "HUMAN_REVIEW_REQUIRED"],
    identityNumberLast4: "3450",
    identityExpiryDate: "2030-12-31",
  });
  const selfieChecks = qualificationDocumentChecks({
    documentType: "selfie-with-id",
    assessmentReasonCodes: [
      "DOCUMENT_VALID",
      "SELFIE_REVIEW_REQUIRED",
      "BIOMETRIC_CHECK_NOT_PERFORMED",
      "LIVENESS_FAILED",
    ],
  });

  assert.deepEqual(
    idChecks.map(({ label, status }) => ({ label, status })),
    [
      { label: "Document type", status: "Passed" },
      { label: "Readability", status: "Passed" },
      { label: "Identity number", status: "Recorded" },
      { label: "Expiry", status: "Recorded" },
      { label: "Applicant name", status: "Administrator review" },
    ],
  );
  assert.equal(
    selfieChecks.find(({ label }) => label === "Face match")?.status,
    "Not performed",
  );
  assert.equal(
    selfieChecks.find(({ label }) => label === "Liveness")?.status,
    "Not performed",
  );
  assert.equal(biometricAssessmentLabel(null), "Not performed");
  assert.equal(biometricAssessmentLabel(91), "91%");
});

test("projects only non-sensitive extracted affidavit and company fields", () => {
  const result = safeQualificationExtractedFields({
    documentType: "company-affidavit",
    extractedFields: {
      companyName: "Example Company Limited",
      companyRegistrationNumber: "0100000000000",
      directorNames: ["Director One", "Director Two"],
      authorityHolderName: "Director One",
      credentialNumber: "private-credential",
      confidence: 92,
    },
  });

  assert.deepEqual(result, [
    {
      key: "companyName",
      label: "Company name",
      value: "Example Company Limited",
    },
    {
      key: "companyRegistrationNumber",
      label: "Company registration number",
      value: "0100000000000",
    },
    {
      key: "directorNames",
      label: "Directors",
      value: "Director One, Director Two",
    },
    {
      key: "authorityHolderName",
      label: "Authorized person",
      value: "Director One",
    },
  ]);
  assert.deepEqual(
    safeQualificationExtractedFields({
      documentType: "id-front",
      extractedFields: { documentName: "Private Person" },
    }),
    [],
  );
});

test("associates persisted findings and timestamps with their document", () => {
  const findings = [
    { documentId: "front", code: "DOCUMENT_VALID" },
    { documentId: "affidavit", code: "AFFIDAVIT_REVIEW_REQUIRED" },
    { documentId: null, code: "SUBMISSION_REVIEW" },
  ];

  assert.deepEqual(qualificationFindingsForDocument(findings, "affidavit"), [
    findings[1],
  ]);
  assert.equal(
    qualificationAssessmentTimestamp({
      extractedAt: "2026-08-08T01:00:00.000Z",
      assessmentJob: { completedAt: "2026-08-08T01:05:00.000Z" },
    }),
    "2026-08-08T01:05:00.000Z",
  );
  assert.deepEqual(
    qualificationReasonLabels(["WRONG_DOCUMENT_TYPE", "HUMAN_REVIEW_REQUIRED"]),
    ["Wrong document type", "Administrator review required"],
  );
});

test("builds the accepted KYC provider identity decision contract", () => {
  assert.deepEqual(
    buildQualificationDecisionPayload({
      kind: "KYC",
      decision: "APPROVE",
      reason: "Identity evidence reviewed",
      providerIdentityType: "PERSONAL",
      approvedProviderName: "Ignored Company",
    }),
    {
      decision: "APPROVE",
      reason: "Identity evidence reviewed",
      providerIdentityType: "PERSONAL",
    },
  );
  assert.deepEqual(
    buildQualificationDecisionPayload({
      kind: "KYC",
      decision: "APPROVE",
      reason: "Company authority reviewed",
      providerIdentityType: "COMPANY",
      approvedProviderName: "Example Company Limited",
    }),
    {
      decision: "APPROVE",
      reason: "Company authority reviewed",
      providerIdentityType: "COMPANY",
      approvedProviderName: "Example Company Limited",
    },
  );
  assert.deepEqual(
    buildQualificationDecisionPayload({
      kind: "TIER",
      decision: "APPROVE",
      reason: "Evidence supports the tier",
      approvedTier: "STANDARD",
    }),
    {
      decision: "APPROVE",
      reason: "Evidence supports the tier",
      approvedTier: "STANDARD",
    },
  );
});

test("summarizes persisted company authorization checks for administrators", () => {
  const document = {
    documentType: "company-letter-of-intent",
    assessmentReasonCodes: [
      "DOCUMENT_VALID",
      "COMPANY_CONTACT_MISSING",
      "HUMAN_REVIEW_REQUIRED",
    ],
    extractedFields: {
      companyName: "Example Company Limited",
      authorityHolderName: "Director One",
      contactEmail: null,
      intentToJoinCblue: true,
      authorizedApplicantName: "Applicant Person",
    },
  };

  assert.deepEqual(
    safeQualificationExtractedFields(document).map(({ key, value }) => ({
      key,
      value,
    })),
    [
      { key: "companyName", value: "Example Company Limited" },
      { key: "authorityHolderName", value: "Director One" },
      { key: "intentToJoinCblue", value: "true" },
      { key: "authorizedApplicantName", value: "Applicant Person" },
    ],
  );
  const summary = qualificationAssessmentSummary([document]);
  assert.equal(summary.failed, 1);
  assert.equal(summary.review, 1);
  assert.ok(summary.passed >= 3);
});

test("does not count unassessed company letter fields as passed", () => {
  const checks = qualificationDocumentChecks({
    documentType: "company-letter-of-intent",
    assessmentReasonCodes: ["PROVIDER_UNAVAILABLE"],
    extractedFields: null,
  });

  assert.equal(
    checks.find(({ label }) => label === "Application intent")?.status,
    "Not recorded",
  );
  assert.equal(
    checks.find(({ label }) => label === "Authorized applicant")?.status,
    "Not recorded",
  );
});
