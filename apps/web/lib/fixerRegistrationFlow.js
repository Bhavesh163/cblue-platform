export const QUALIFICATION_CONTINUATION_STATUSES = new Set([
  "PENDING",
  "REVERIFICATION_REQUIRED",
  "EXPIRED",
]);

export const QUALIFICATION_REVIEW_IN_PROGRESS_STATUSES = new Set([
  "SUBMITTED",
  "PROCESSING",
  "NEEDS_REVIEW",
  "ASSESSING",
  "AI_PRECLEARED",
]);

export function isQualificationReviewInProgress(submissionStatus) {
  return QUALIFICATION_REVIEW_IN_PROGRESS_STATUSES.has(
    String(submissionStatus || ""),
  );
}

export function requiresQualificationContinuation(
  status,
  submissionStatus = null,
) {
  return (
    QUALIFICATION_CONTINUATION_STATUSES.has(String(status || "")) &&
    !isQualificationReviewInProgress(submissionStatus)
  );
}

export function shouldUploadKycImmediately({
  isRegisteredFixer,
  hasAccessToken,
}) {
  return Boolean(isRegisteredFixer && hasAccessToken);
}
