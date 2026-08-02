# CBLUE Fixer and Pro Qualification Contract

## Ownership

The authoritative architecture is:

```text
Flutter -> BLUE NestJS workflow bridge -> CBLUE backend
        -> BLUE normalized runtime -> Flutter UI
```

CBLUE owns qualification submissions, private documents, evidence status,
evaluation runs, review assignment, administrator decisions, administrator decisions,
approved tiers, expiry, and audit history. BLUE may normalize and cache the
CBLUE snapshot, but must not create or override qualification state. Flutter
must not call CBLUE directly.

## BLUE Read Contract

```http
GET /api/v1/blue/qualification?legacySubjectId=<linked-cblue-subject>
x-blue-bridge-key: <CBLUE_BRIDGE_API_KEY>
```

The response is versioned with:

```json
{
  "sourceVersion": "cblue-fixer-qualification-v3",
  "subject": {},
  "fixer": {},
  "submission": {},
  "tierQualification": {},
  "verification": {
    "documentCount": 0,
    "validatedCount": 0,
    "contradictedCount": 0,
    "insufficientCount": 0,
    "uncheckedCount": 0,
    "makerCheckerStatus": "OPEN"
  }
}
```

The bridge never returns private object-storage keys, raw OCR text, provider
credentials, admin identities, or document download URLs.

## Evidence Verification

Qualification files are stored privately with server-side encryption. The
assigned maker may request server verification through:

```http
POST /api/v1/qualification/admin/submissions/:submissionId/documents/:documentId/verify
Authorization: Bearer <CBLUE admin access token>
```

CBLUE sends the private file server-to-server to the configured document service, stores structured
fields and hashes instead of raw OCR text, compares the extracted name with the
registered name deterministically, and optionally verifies credentials through
a fixed server-configured credential provider. Missing or unavailable
providers fail closed to manual review.

Only evidence with persisted `VALIDATED` status contributes to deterministic
tier rules. Contradicted, insufficient, expired, and unchecked evidence does
not contribute.

## Single-Administrator Decision

1. An administrator atomically claims an open task.
2. The maker reviews evidence and submits a proposal.
3. The proposal does not change the partner tier.
4. A different administrator reviews read-only evidence.
5. The administrator records the decision or returns the task to the open queue.
6. Only the administrator decision updates the operational Fixer tier and submission.
7. Both actions are persisted in the qualification audit log.

Concurrent administrator decisions and checker confirmations use conditional database
updates so only one succeeds.

## Runtime Configuration

Required for private evidence:

- `SPACES_ENDPOINT`
- `SPACES_KEY`
- `SPACES_SECRET`
- `SPACES_BUCKET`
- `SPACES_REGION`

Required for automatic OCR:

- `TYPHOON_API_KEY`
- `TYPHOON_BASE_URL`
- `TYPHOON_MODEL`

Optional issuer and registry verification adapter:

- `QUALIFICATION_CREDENTIAL_VERIFIER_URL`
- `QUALIFICATION_CREDENTIAL_VERIFIER_API_KEY`

When the optional credential verifier is absent, certificates remain
insufficient until an assigned admin validates them manually. Typhoon is
advisory and cannot approve a tier.
