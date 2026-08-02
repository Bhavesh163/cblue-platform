# Enterprise KYC Routing and Admin Review Design

## Status

Approved direction for CBLUE implementation.

## Scope

This design updates CBLUE fixer and professional qualification. CBLUE remains
the authoritative owner of identity evidence, qualification state, tier
eligibility, review tasks, audit records, and operational tier changes.

The integration boundary remains:

```text
Flutter -> BLUE NestJS workflow bridge -> CBLUE backend
        -> BLUE normalized runtime -> Flutter UI
```

Flutter must not call CBLUE or private object storage directly. BLUE must not
calculate KYC status, qualification scores, review ownership, or tiers.

## Root Causes

1. The current upload message reports secure KYC checking before any server
   upload or AI assessment has occurred.
2. KYC and portfolio files remain in browser memory until the whole profile is
   saved.
3. Production evidence upload fails when DigitalOcean Spaces configuration is
   absent or incomplete. The failed upload prevents submission, evaluation, and
   review-task creation, so nothing appears in the admin queue.
4. Document OCR and credential verification currently require an administrator
   to claim a review task, but qualification scoring runs before those document
   checks. The score therefore cannot represent the supplied evidence.
5. KYC identity confidence and professional tier eligibility are currently
   represented through overlapping evaluation fields instead of separate
   authoritative decisions.
6. The admin qualification table has invalid cell structure and does not expose
   separate KYC and tier routing states.

## Design Principles

- A general LLM is advisory and cannot approve or reject a person's identity.
- Deterministic policy sets the maximum evidence-supported tier.
- A hard evidence failure rejects the evidence, not the account.
- Unavailable providers fail closed to human review.
- Missing face-match or liveness providers produce `null`, never fabricated
  scores.
- KYC approval and tier qualification are separate state machines.
- Every decision and evidence replacement is persisted and auditable.
- Private files are never returned through the BLUE bridge.

## Registration and Edit Flow

### Core profile boundary

An authenticated partner must first save a complete core fixer profile before
the KYC evidence controls become active. New registration becomes two
server-owned stages:

1. Authenticate and persist the complete core fixer profile.
2. Create or resume one draft qualification submission and upload evidence.

This avoids placeholder fixer records and permits immediate authenticated
uploads. Existing fixers resume or create a draft submission directly.

### Immediate evidence upload

Each selected KYC file is uploaded immediately to CBLUE. CBLUE:

1. Authorizes the user against the draft submission.
2. Verifies file signature, declared MIME type, non-empty content, size, and
   supported image format.
3. Stores the original evidence privately in DigitalOcean Spaces with
   server-side AES-256 encryption.
4. Persists checksum, content type, size, storage key, retention date, and
   evidence slot.
5. Runs bounded OCR and document classification.
6. Persists the per-document assessment and returns a sanitized result.

The response contains no storage key, raw OCR text, provider credential, or
private URL.

### Evidence replacement

`id-front` and `selfie-with-id` each have one active document.
Uploading a replacement marks the prior document as superseded and records an
audit event. Superseded evidence remains private until the retention process
deletes it. Portfolio evidence remains limited to ten active files.

## KYC State Machine

Add a server-owned KYC routing status:

```text
DRAFT
ASSESSING
NEEDS_RESUBMISSION
NEEDS_MORE_EVIDENCE
NEEDS_REVIEW
AI_PRECLEARED
APPROVED
REJECTED
EXPIRED
```

### Hard evidence failure

The following conditions route the affected evidence to
`NEEDS_RESUBMISSION`:

- wrong document type or side;
- unreadable or corrupt image;
- required ID side missing at submission;
- expired identity document;
- extracted identity contradicts the registered identity;
- certified liveness failure, when a certified provider is configured.

The partner receives a localized, actionable reason immediately. The fixer
account is not rejected.

### AI routing

- Confidence 90 through 100, with all available checks passed:
  `AI_PRECLEARED`.
- Confidence 60 through 89: `NEEDS_REVIEW`.
- Confidence below 60: `NEEDS_MORE_EVIDENCE`.
- Provider unavailable, timed out, or returned invalid output:
  `NEEDS_REVIEW`.

`AI_PRECLEARED` still requires human approval until CBLUE integrates a
certified eKYC provider that supplies authoritative face matching and
liveness.

### Submission attempt controls

Three consecutive hard-failure submissions trigger a short evidence-upload
cooldown. The account remains usable and the partner can resume after the
cooldown. Successful replacement clears the consecutive failure counter.

## Separate Authoritative Assessments

Persist these values independently:

- `identityConfidence`;
- `documentAuthenticityConfidence`;
- `faceMatchConfidence`;
- `livenessConfidence`;
- `credentialConfidence`;
- `fraudRisk`;
- `tierEligibilityScore`;
- `recommendedTier`;
- `humanReviewRequired`.

Every confidence value is nullable. A value is present only when an identified
provider produced a valid result. Assessment records retain provider, model,
policy version, prompt version, input hash, timestamps, reason codes, and
sanitized findings.

Raw OCR text is not persisted. CBLUE stores structured extracted fields and a
hash of the raw provider output.

## Portfolio and Credential Pipeline

Portfolio and credential evidence is processed separately from KYC:

1. Upload and private storage use the same evidence controls.
2. OCR extracts only facts present in the document.
3. The configured qualification credential verifier checks supported
   credentials.
4. Unsupported or unavailable verification routes the document to human
   review.
5. Portfolio weakness can reduce tier eligibility but cannot invalidate
   approved KYC.

The tier pipeline starts only after KYC approval.

## Tier Qualification

1. Approved KYC and a complete core profile make the partner eligible for
   Economy.
2. CBLUE grants Economy after the authoritative KYC single-administrator decision.
3. Deterministic policy evaluates verified experience and credentials and sets
   the maximum eligible tier.
4. Typhoon may provide a fraud-risk and tier recommendation within that
   deterministic ceiling.
5. Standard, Corporate, Specialist, and Expert require a separate upper-tier
   single-administrator task.
6. Missing or weak tier evidence lowers the recommendation. It does not reject
   the partner or revoke valid KYC.

## Admin Console

The qualification area uses wide, responsive tables and no mock records.

### Queue summary

Display persisted counts for:

- KYC awaiting review;
- AI-precleared KYC awaiting approval;
- evidence requiring resubmission;
- upper-tier reviews;
- assigned tasks;
- administrator decisions pending.

### Review task

Each task identifies whether it is `KYC` or `TIER` and shows:

- partner identity and submission version;
- separate authoritative assessment values;
- reason codes and provider status;
- ID front, ID back, selfie-with-ID, and portfolio metadata;
- five-minute signed evidence links for assigned reviewers;
- proposed price list;
- administrator decision and administrator decision controls;
- complete audit history.

Document views remain role-protected and audited. Private URLs expire after
five minutes and are never exposed to BLUE.

## DigitalOcean Spaces

Qualification evidence uses the existing S3-compatible DigitalOcean Spaces
integration:

- `SPACES_ENDPOINT`;
- `SPACES_KEY`;
- `SPACES_SECRET`;
- `SPACES_BUCKET`;
- `SPACES_REGION`.

The qualification subsystem must fail readiness when any required value is
absent. Unrelated CBLUE services remain available, while evidence upload,
submission, and review fail closed with an actionable configuration error.
Logs may report only which variable name is missing, never its value.
Deployment verifies a private write/read/delete probe with a generated key
before reporting qualification readiness.

The bucket must deny public listing and public object access. Evidence objects
use private ACL, AES-256 server-side encryption, randomized keys, and lifecycle
retention rules aligned with CBLUE's PDPA policy.

## API Contract

### Partner APIs

```http
POST /api/v1/qualification/submissions/draft
POST /api/v1/qualification/submissions/:submissionId/documents
GET  /api/v1/qualification/submissions/:submissionId
POST /api/v1/qualification/submissions/:submissionId/submit
GET  /api/v1/qualification/status
```

Document upload returns the persisted assessment:

```json
{
  "document": {
    "id": "server-owned-id",
    "documentType": "id-front",
    "evidenceStatus": "UNCHECKED"
  },
  "assessment": {
    "kycStatus": "NEEDS_REVIEW",
    "confidence": 78,
    "reasonCodes": ["HUMAN_REVIEW_REQUIRED"],
    "message": "Your ID front image is readable and requires administrator review."
  }
}
```

Dynamic values come from the persisted assessment. Localized user messages are
mapped from stable server reason codes.

### Admin APIs

Existing admin routes remain role-protected. Review-task responses add task
kind, separate assessments, submission status, and audit history.

### BLUE bridge

```http
GET /api/v1/blue/qualification?legacySubjectId=<linked-cblue-subject>
x-blue-bridge-key: <CBLUE_BRIDGE_API_KEY>
```

The versioned snapshot adds:

```json
{
  "sourceVersion": "cblue-fixer-qualification-v2",
  "kyc": {
    "status": "NEEDS_REVIEW",
    "identityConfidence": 78,
    "documentAuthenticityConfidence": 81,
    "faceMatchConfidence": null,
    "livenessConfidence": null,
    "fraudRisk": "MEDIUM",
    "humanReviewRequired": true
  },
  "tier": {
    "eligibilityScore": null,
    "recommendedTier": null,
    "approvedTier": null
  }
}
```

BLUE receives only the linked user's state. It never receives private document
URLs, storage keys, raw OCR, administrator identities, or provider secrets.

## Error Handling and Observability

- Async storage, database, and provider boundaries catch errors, record
  sanitized error codes, and return actionable user-facing failures.
- Logs contain submission and document identifiers but never tokens, raw KYC
  data, OCR text, document bytes, storage credentials, or presigned URLs.
- Provider timeout and invalid output route to review rather than approval.
- Audit events record uploads, replacements, assessments, submissions, task
  assignments, document views, administrator decisions, administrator decisions, expiry, and
  resubmission.

## Testing

### Backend

- storage readiness fails when one required Spaces setting is missing;
- file upload persists encrypted private evidence;
- wrong slot, corrupt image, expired ID, and name contradiction require
  resubmission;
- confidence thresholds route correctly;
- provider outage routes to review;
- unavailable face/liveness providers persist `null`;
- portfolio evaluation cannot change KYC;
- tier evaluation cannot start before KYC approval;
- Economy is applied only after KYC single-administrator approval;
- upper tiers cannot exceed the deterministic ceiling;
- three hard failures create a temporary cooldown;
- review tasks and audit events are created exactly once;
- BLUE bridge returns separated state and no private fields.

### Web

- evidence uploads immediately after core profile persistence;
- each slot displays the server-owned result;
- rejected evidence can be replaced;
- save does not re-upload already persisted evidence;
- admin queue displays KYC and tier tasks in valid wide table markup;
- storage and provider failures show localized, non-technical messages.

### Production verification

- backend deployment confirms Spaces readiness without exposing credentials;
- a real linked partner can upload all three KYC slots and portfolio evidence;
- every upload returns a persisted assessment;
- the submission appears in the admin queue;
- an assigned admin can open five-minute evidence links;
- single-administrator KYC approval grants Economy;
- upper-tier evidence produces a separate tier task;
- the BLUE bridge returns the same sanitized authoritative state.

## Non-Goals

- Typhoon does not perform authoritative identity approval.
- CBLUE does not claim face match or liveness without a certified provider.
- Flutter does not upload directly to DigitalOcean Spaces or CBLUE.
- BLUE does not infer KYC or tier state.
- This work does not modify BLUE or LBLUE repositories.
