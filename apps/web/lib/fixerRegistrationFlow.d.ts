export type QualificationEligibilityStatus =
  | "PENDING"
  | "ELIGIBLE"
  | "EXPIRING"
  | "REVERIFICATION_REQUIRED"
  | "EXPIRED";

export declare const QUALIFICATION_CONTINUATION_STATUSES: ReadonlySet<string>;
export declare const QUALIFICATION_REVIEW_IN_PROGRESS_STATUSES: ReadonlySet<string>;

export declare function isQualificationReviewInProgress(
  submissionStatus: string | null | undefined,
): boolean;

export declare function requiresQualificationContinuation(
  status: QualificationEligibilityStatus | string | null | undefined,
  submissionStatus?: string | null,
): boolean;

export declare function shouldUploadKycImmediately(input: {
  isRegisteredFixer: boolean;
  hasAccessToken: boolean;
}): boolean;
