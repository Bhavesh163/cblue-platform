import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const historyUrl = new URL(
  "../app/[locale]/components/QualificationHistoryPanel.tsx",
  import.meta.url,
);
const partnerStatusUrl = new URL(
  "../app/[locale]/components/PartnerQualificationStatus.tsx",
  import.meta.url,
);
const registerUrl = new URL(
  "../app/[locale]/fixers/register/page.tsx",
  import.meta.url,
);
const evidenceControlsUrl = new URL(
  "../app/[locale]/components/QualificationEvidenceControls.tsx",
  import.meta.url,
);
const partnerDirectoryUrl = new URL(
  "../app/[locale]/components/AdminPartnerDirectory.tsx",
  import.meta.url,
);

test("admin history exposes persisted automated outcomes without private identity fields", async () => {
  const source = await readFile(historyUrl, "utf8");

  assert.match(source, /qualificationHistoryDocuments/);
  assert.match(source, /qualificationDocumentChecks/);
  assert.match(source, /safeQualificationExtractedFields/);
  assert.match(source, /retained for audit/);
  assert.match(source, /max-h-\[75vh\] overflow-auto/);
  assert.doesNotMatch(source, /identityNumberHash/);
  assert.doesNotMatch(source, /storageKey/);
});
test("admin evidence review captures structured identity facts without exposing hashes", async () => {
  const source = await readFile(evidenceControlsUrl, "utf8");

  assert.match(source, /Thai ID number/);
  assert.match(source, /ID expiry date/);
  assert.match(source, /Name matches the applicant/);
  assert.match(source, /Faces match on manual comparison/);
  assert.match(source, /does not claim an\s+automated liveness result/);
  assert.match(source, /Save ID review/);
  assert.match(source, /Save selfie review/);
  assert.match(source, /KYC approval uses saved evidence only/);
  assert.doesNotMatch(source, /identityNumberHash/);
});

test("provider directory presents persisted completion and review history", async () => {
  const source = await readFile(partnerDirectoryUrl, "utf8");

  assert.match(source, /Work history/);
  assert.match(source, /Completed service history/);
  assert.match(source, /Recent persisted reviews/);
  assert.match(source, /reviewCount/);
});

test("partner profile reads authoritative qualification status with Thai and Chinese copy", async () => {
  const source = await readFile(partnerStatusUrl, "utf8");

  assert.match(source, /\/api\/v1\/qualification\/status/);
  assert.match(source, /สถานะคุณสมบัติ/);
  assert.match(source, /资格状态/);
  assert.match(source, /NEEDS_RESUBMISSION/);
  assert.match(source, /NEEDS_MORE_EVIDENCE/);
  assert.doesNotMatch(source, /Typhoon/i);
});

test("company-application evidence copy is explicit in all supported languages", async () => {
  const source = await readFile(registerUrl, "utf8");

  assert.match(source, /หนังสือรับรองบริษัท \(หากต้องการสมัครในนามบริษัท\)/);
  assert.match(source, /公司证明（以公司名义申请时需要）/);
  assert.match(
    source,
    /Company affidavit \(required for company applications\)/,
  );
  assert.match(
    source,
    /Director authorization letter \(required when a company applicant is not a named director\)/,
  );
});

test("first-time registration stages KYC until the fixer profile exists", async () => {
  const source = await readFile(registerUrl, "utf8");

  assert.match(source, /shouldUploadKycImmediately/);
  assert.match(source, /isRegisteredFixer,/);
  assert.match(source, /documentId: null,/);
  assert.match(source, /qualification\/evidence-preflight/);
  assert.match(source, /screened\.reasonCodes/);
  assert.match(source, /requiresQualificationContinuation/);
  assert.match(source, /qualificationSubmissionStatus/);
  assert.match(source, /!qualificationNeedsContinuation/);
  assert.doesNotMatch(source, /Fixer profile not found/);
  assert.doesNotMatch(source, /Typhoon/i);
});
