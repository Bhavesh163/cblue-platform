# CBLUE Fixer and Pro Qualification Contract

## Ownership

The authoritative architecture is:

```text
Flutter -> BLUE NestJS workflow bridge -> CBLUE backend
        -> BLUE normalized runtime -> Flutter UI
```

CBLUE owns qualification submissions, private documents, evidence status,
evaluation runs, review assignment, administrator decisions,
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
    "adminDecisionStatus": "OPEN",
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
the configured document service. Missing or unavailable
processing fails closed to manual review.

Only evidence with persisted `VALIDATED` status contributes to deterministic
tier rules. Contradicted, insufficient, expired, and unchecked evidence does
not contribute.

## Single-Administrator Decision

1. Any authorized administrator atomically claims an open task.
2. The administrator reviews the persisted evidence and records one decision.
3. The decision is applied only within the deterministic tier ceiling.
4. The decision and evidence access are persisted in the qualification audit log.

All authorized administrators may review and finalize a task. Conditional database
updates ensure that only one final decision succeeds. The legacy makerCheckerStatus
field remains for compatibility; adminDecisionStatus is authoritative.

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



Credential and portfolio evidence remains insufficient until an authorized administrator
validates it manually. Automated assessment is advisory and cannot approve a tier.
