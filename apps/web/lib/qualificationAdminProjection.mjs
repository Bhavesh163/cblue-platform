export function visibleQualificationDocuments(documents) {
  return documents.filter(
    (document) =>
      document.documentType !== "id-back" &&
      document.isActive !== false &&
      document.lifecycleState !== "DELETE_PENDING",
  );
}

const FAILURE_REASONS = new Map([
  ["WRONG_DOCUMENT_TYPE", "Wrong document type"],
  ["UNREADABLE_DOCUMENT", "Document is unreadable"],
  ["EXPIRED_ID", "Identity document is expired"],
  ["INVALID_ID_NUMBER", "Identity number is invalid"],
  ["IDENTITY_CONTRADICTION", "Applicant identity does not match"],
  ["COMPANY_NAME_CONTRADICTION", "Company name does not match"],
  ["PORTFOLIO_IDENTITY_CONTRADICTION", "Portfolio identity does not match"],
  ["AFFIDAVIT_EXPIRED", "Company affidavit is expired"],
  ["LIVENESS_FAILED", "Liveness check failed"],
]);

const REVIEW_REASONS = new Map([
  ["SELFIE_REVIEW_REQUIRED", "Selfie requires administrator review"],
  ["AFFIDAVIT_REVIEW_REQUIRED", "Company affidavit requires review"],
  ["COMPANY_AUTHORITY_REVIEW_REQUIRED", "Company authority requires review"],
  ["HUMAN_REVIEW_REQUIRED", "Administrator review required"],
  ["MISSING_REQUIRED_EVIDENCE", "Required evidence is missing"],
]);

const SAFE_EXTRACTED_FIELDS = [
  ["companyName", "Company name"],
  ["companyRegistrationNumber", "Company registration number"],
  ["directorNames", "Directors"],
  ["authorityHolderName", "Authorized person"],
  ["authorityType", "Authority type"],
  ["issuerName", "Issuer"],
  ["documentName", "Document name"],
  ["credentialLevel", "Credential level"],
  ["projectName", "Project name"],
  ["projectLocation", "Project location"],
  ["projectValue", "Project value"],
  ["issuedAt", "Issued"],
  ["expiresAt", "Expires"],
];

function extractedRoot(extractedFields) {
  if (!extractedFields || typeof extractedFields !== "object") return {};
  const nested = extractedFields.fields;
  return nested && typeof nested === "object" && !Array.isArray(nested)
    ? nested
    : extractedFields;
}

function displayExtractedValue(value) {
  if (Array.isArray(value)) return value.filter(Boolean).join(", ");
  if (typeof value === "number") return String(value);
  return typeof value === "string" ? value.trim() : "";
}

export function safeQualificationExtractedFields(document) {
  if (["id-front", "selfie-with-id"].includes(document.documentType)) {
    return [];
  }
  const fields = extractedRoot(document.extractedFields);
  return SAFE_EXTRACTED_FIELDS.flatMap(([key, label]) => {
    const value = displayExtractedValue(fields[key]);
    return value ? [{ key, label, value }] : [];
  });
}

export function qualificationDocumentChecks(document) {
  const reasons = new Set(document.assessmentReasonCodes || []);
  const checks = [];
  const add = (label, status, tone = "neutral") =>
    checks.push({ label, status, tone });

  if (reasons.has("PROVIDER_UNAVAILABLE")) {
    add("Automated assessment", "Not performed", "neutral");
  } else if (reasons.has("WRONG_DOCUMENT_TYPE")) {
    add("Document type", "Failed", "danger");
  } else if (reasons.has("DOCUMENT_VALID")) {
    add("Document type", "Passed", "success");
  } else {
    add("Document type", "Not recorded", "neutral");
  }

  if (reasons.has("UNREADABLE_DOCUMENT")) {
    add("Readability", "Failed", "danger");
  } else if (reasons.has("DOCUMENT_VALID")) {
    add("Readability", "Passed", "success");
  }

  if (document.documentType === "id-front") {
    add(
      "Identity number",
      reasons.has("INVALID_ID_NUMBER")
        ? "Failed"
        : document.identityNumberLast4
          ? "Recorded"
          : "Not recorded",
      reasons.has("INVALID_ID_NUMBER") ? "danger" : "neutral",
    );
    add(
      "Expiry",
      reasons.has("EXPIRED_ID")
        ? "Expired"
        : document.identityExpiryDate
          ? "Recorded"
          : "Not recorded",
      reasons.has("EXPIRED_ID") ? "danger" : "neutral",
    );
    add(
      "Applicant name",
      reasons.has("IDENTITY_CONTRADICTION")
        ? "Mismatch found"
        : "Administrator review",
      reasons.has("IDENTITY_CONTRADICTION") ? "danger" : "review",
    );
  }

  if (document.documentType === "selfie-with-id") {
    add("Face match", "Not performed", "neutral");
    add(
      "Liveness",
      reasons.has("LIVENESS_FAILED") ? "Failed" : "Not performed",
      reasons.has("LIVENESS_FAILED") ? "danger" : "neutral",
    );
  }

  if (document.documentType === "company-affidavit") {
    add(
      "Company name",
      reasons.has("COMPANY_NAME_CONTRADICTION")
        ? "Mismatch found"
        : "Administrator review",
      reasons.has("COMPANY_NAME_CONTRADICTION") ? "danger" : "review",
    );
    add(
      "Applicant authority",
      "Administrator review",
      reasons.has("COMPANY_AUTHORITY_REVIEW_REQUIRED") ? "review" : "neutral",
    );
  }

  if (document.documentType === "portfolio") {
    add(
      "Applicant linkage",
      reasons.has("PORTFOLIO_IDENTITY_CONTRADICTION")
        ? "Mismatch found"
        : "Administrator review",
      reasons.has("PORTFOLIO_IDENTITY_CONTRADICTION")
        ? "danger"
        : "review",
    );
  }

  return checks;
}

export function qualificationReasonLabels(reasonCodes) {
  return (reasonCodes || [])
    .filter((code) => code !== "DOCUMENT_VALID")
    .map(
      (code) =>
        FAILURE_REASONS.get(code) ||
        REVIEW_REASONS.get(code) ||
        code.toLowerCase().replaceAll("_", " "),
    );
}

export function qualificationFindingsForDocument(findings, documentId) {
  return (findings || []).filter(
    (finding) => finding.documentId === documentId,
  );
}

export function qualificationAssessmentTimestamp(document) {
  return document.assessmentJob?.completedAt || document.extractedAt || null;
}

export function biometricAssessmentLabel(value) {
  return typeof value === "number" ? `${value}%` : "Not performed";
}

export function buildQualificationDecisionPayload(input) {
  const payload = {
    decision: input.decision,
    reason: input.reason,
  };
  if (input.kind === "TIER" && input.decision === "APPROVE") {
    payload.approvedTier = input.approvedTier;
  }
  if (input.kind === "KYC" && input.decision === "APPROVE") {
    payload.providerIdentityType = input.providerIdentityType;
    if (input.providerIdentityType === "COMPANY") {
      payload.approvedProviderName = input.approvedProviderName;
    }
  }
  return payload;
}
