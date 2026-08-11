import assert from "node:assert/strict";
import test from "node:test";

import {
  isQualificationReviewInProgress,
  requiresQualificationContinuation,
  shouldUploadKycImmediately,
} from "./fixerRegistrationFlow.js";

test("new applicants stage KYC until their Fixer profile exists", () => {
  assert.equal(
    shouldUploadKycImmediately({
      isRegisteredFixer: false,
      hasAccessToken: false,
    }),
    false,
  );
  assert.equal(
    shouldUploadKycImmediately({
      isRegisteredFixer: false,
      hasAccessToken: true,
    }),
    false,
  );
});

test("registered partners retain immediate authoritative KYC upload", () => {
  assert.equal(
    shouldUploadKycImmediately({
      isRegisteredFixer: true,
      hasAccessToken: true,
    }),
    true,
  );
  assert.equal(
    shouldUploadKycImmediately({
      isRegisteredFixer: true,
      hasAccessToken: false,
    }),
    false,
  );
});

test("incomplete or expired qualification resumes instead of appearing complete", () => {
  assert.equal(requiresQualificationContinuation("PENDING"), true);
  assert.equal(
    requiresQualificationContinuation("REVERIFICATION_REQUIRED"),
    true,
  );
  assert.equal(requiresQualificationContinuation("EXPIRED"), true);
  assert.equal(requiresQualificationContinuation("ELIGIBLE"), false);
  assert.equal(requiresQualificationContinuation("EXPIRING"), false);
});

test("submitted qualification remains under review instead of opening another draft", () => {
  assert.equal(isQualificationReviewInProgress("SUBMITTED"), true);
  assert.equal(isQualificationReviewInProgress("NEEDS_REVIEW"), true);
  assert.equal(
    requiresQualificationContinuation("PENDING", "NEEDS_REVIEW"),
    false,
  );
  assert.equal(
    requiresQualificationContinuation("REVERIFICATION_REQUIRED", "ASSESSING"),
    false,
  );
});
