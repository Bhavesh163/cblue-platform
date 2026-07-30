# Task 4 Implementation Report

## Status

Complete. Task 4 was implemented on `codex/enterprise-kyc-routing` from the
persisted assessment boundary at `e7ff62f8ee89ca710aa20b53e0951aa0c35c19e8`.

Implementation commit:

- `72b4239` - `Route KYC evidence to human review`

## Implemented Scope

### Aggregate KYC routing

- Added `QualificationRoutingService.routeSubmission(submissionId, actorId)`.
- Reads only active `id-front`, `id-back`, and `selfie-with-id` documents.
- Resolves each active document to its latest persisted completed assessment
  evaluation by checksum.
- Uses the minimum non-null confidence across required evidence.
- Gives persisted hard failures precedence over confidence thresholds.
- Routes confidence `0-59` to `NEEDS_MORE_EVIDENCE`, `60-89` to
  `NEEDS_REVIEW`, and `90-100` to `AI_PRECLEARED`.
- Routes missing, null, or explicitly provider-unavailable assessments to
  `NEEDS_REVIEW` instead of omitting them from the decision.
- Keeps `humanReviewRequired: true` for every decision.
- Serializes routing with the existing submission advisory lock.
- Persists status, submission time, failure controls, and an immutable routing
  audit event in the same transaction.
- Creates at most one unresolved `KYC` review task for `NEEDS_REVIEW` or
  `AI_PRECLEARED`, treating both `OPEN` and `ASSIGNED` work as unresolved.
- Makes repeated routing idempotent for status, audit, failed-attempt count,
  and review work.

### Hard-failure cooldown

- Caps the consecutive hard-failure counter at three.
- Sets a fixed 15-minute upload cooldown on the third consecutive hard
  failure and on later hard failures after a prior cooldown expires.
- Leaves the account otherwise usable.
- Clears `failedAttempts` and `lockedUntil` after a fully persisted replacement
  whose assessment is not another hard failure.

### Authoritative evidence replacement

- Allows replacement from `DRAFT`, `NEEDS_RESUBMISSION`, and
  `NEEDS_MORE_EVIDENCE`, subject to `lockedUntil`.
- Stages new KYC rows as inactive before assessment, preserving the prior
  active evidence while provider and persistence work runs.
- Reacquires the submission advisory lock after assessment and atomically:
  supersedes the prior active row, records `supersededAt` and
  `supersededById`, activates the staged row, resets recoverable submission
  state, and writes the supersession audit event.
- Uses the promotion-time active row as the predecessor, so concurrent
  replacements serialize without producing two active slot records.
- Keeps portfolio files active and limits the active portfolio set to ten.
- Attempts Spaces deletion twice when storage or persistence fails after the
  write. After successful object compensation, removes the staged database row.
- Leaves the prior active KYC row untouched when assessment or promotion fails.

### Submission integration

- `submitForUser()` still performs the storage readiness probe.
- Authenticates ownership and validates exactly the three required active KYC
  slots under the submission advisory lock.
- Validates active portfolio limits and content constraints.
- Delegates final routing persistence to `routeSubmission()`.
- Does not call tier evaluation.
- Registers and exports `QualificationRoutingService` from the qualification
  module.

## TDD Evidence

1. Baseline:
   `npm test -- qualification.service.spec.ts --runInBand`
   passed `18/18`.
2. Initial red:
   the focused command failed because
   `qualification-routing.service.ts` did not exist; the existing suite stayed
   green.
3. Service red:
   replacement tests failed for inactive staging, recoverable replacement,
   compensation, active-only validation, and routing delegation.
4. Routing green:
   threshold, hard-failure, unavailable-assessment, cooldown, and idempotency
   tests passed `7/7`.
5. Self-review red:
   an explicit `PROVIDER_UNAVAILABLE` reason with a numeric historical score
   incorrectly produced `AI_PRECLEARED`.
6. Self-review green:
   the explicit provider-unavailable case now routes to review.

## Final Verification

- `npm test -- qualification-routing.service.spec.ts qualification.service.spec.ts --runInBand`
  - `2/2` suites passed.
  - `29/29` tests passed.
- `npm test -- modules/qualification --runInBand`
  - `9/9` suites passed.
  - `76/76` tests passed.
- Scoped ESLint on the five Task 4 files with `--quiet`
  - Passed with zero errors.
- `npm run build`
  - Passed.
- `git diff --check`
  - Passed.

## Self-Review

- Confirmed hard failures win over score thresholds.
- Confirmed null and unavailable assessments force conservative review.
- Confirmed confidence aggregation uses the minimum available value.
- Confirmed routing persistence and review-task creation share the advisory-lock
  transaction.
- Confirmed failed routing calls cannot partially persist status, audit, or
  review work.
- Confirmed replacement assessment runs while the prior evidence remains active.
- Confirmed supersession and activation share one transaction.
- Confirmed compensation removes the Spaces object before removing the staged
  database reference.
- Confirmed submission validation ignores inactive superseded evidence.
- Confirmed no tier-evaluation call remains in submission finalization.

## Concerns

- No live PostgreSQL/Spaces integration test was run. The concurrency and
  compensation paths are covered with deterministic service tests and the
  backend build.
- The broader qualification suite emits pre-existing Node 18/AWS SDK,
  experimental `buffer.File`, and intentional readiness-probe warnings. The
  required focused Task 4 suite is clean.

---

## Fix Round 1/5

### Status

Complete. Every finding in `task-4-review.md` is addressed in the CBLUE
qualification boundary without changing the original routing thresholds,
hard-failure precedence, conservative minimum confidence, cooldown behavior,
or tier-evaluation separation.

### KYC Review Safety

- Added a KYC-specific checker path for accepted rejection proposals.
- Rejected KYC evidence moves the submission to `NEEDS_RESUBMISSION`, records
  reviewer metadata, decides the review task, and audits
  `KYC_RESUBMISSION_REQUIRED`.
- The path does not create a tier qualification and never updates the fixer
  account to `REJECTED`.
- Added regression coverage proving the fixer account remains unchanged.

### Review-Task Concurrency

- Added a partial unique database index enforcing one unresolved `KYC` task per
  submission where status is not `DECIDED`.
- The migration deterministically closes pre-existing duplicate unresolved KYC
  tasks before creating the index.
- Routing uses `createMany({ skipDuplicates: true })` and rereads the
  authoritative unresolved task after a conflict.
- The re-evaluation writer now uses the submission advisory lock and explicitly
  reads and writes `kind: TIER`, preventing accidental KYC task creation.
- Tests cover concurrent conflict handling and verify the migration SQL
  invariant.

### Durable Document Saga

- Added persisted lifecycle states: `PENDING_UPLOAD`, `UPLOADED`, `ASSESSING`,
  `READY`, `DELETE_PENDING`, and `FAILED`, with upload/readiness/deletion
  timestamps, cleanup attempts, and sanitized cleanup error codes.
- The caller generates the document ID and opaque object key before staging an
  inactive `PENDING_UPLOAD` row under a short advisory-locked transaction.
- Spaces upload and assessment run outside database/advisory transactions.
- Promotion reacquires the lock and atomically supersedes only authoritative
  active `READY` prior evidence and promotes only the assessed staged row.
- Failed or ambiguous operations reconcile by caller-generated document ID.
  An authoritative active `READY` row is returned as committed and its object
  is never deleted.
- Non-authoritative uploaded rows persist `DELETE_PENDING`; cleanup retries are
  idempotent and retain a terminal `FAILED` lifecycle row after deletion.
- Repeated cleanup failure increments durable attempts and remains
  `DELETE_PENDING` instead of becoming an untracked object.
- Terminal cleanup rows do not block a same-checksum upload retry, while all
  live lifecycle states still enforce duplicate protection.
- Existing active evidence remains untouched unless replacement assessment and
  promotion both succeed.

### Privacy and Logging

- Object keys no longer include the original filename.
- Compensation and reconciliation logs contain only sanitized document and
  submission IDs plus bounded error codes/error class names.
- No storage key or original filename is emitted by the saga failure paths.

### TDD and Failure Injection

- Added a KYC rejection regression that initially reached the generic account
  rejection path, then passed with the kind-specific state machine.
- Added duplicate-task conflict and partial-index migration assertions.
- Added upload-outside-transaction, upload failure, cleanup failure, ambiguous
  promotion, retry cleanup, terminal-row retry, storage adapter failure, and
  prior-active preservation coverage.
- The terminal-row duplicate and authoritative-`READY` supersession assertions
  failed against the pre-fix lifecycle query and passed after the targeted
  correction.

### Final Verification

- `npm test -- qualification-routing.service.spec.ts qualification.service.spec.ts qualification-review.service.spec.ts qualification-storage.service.spec.ts qualification-evaluation.service.spec.ts --runInBand`
  - 5/5 suites passed.
  - 58/58 tests passed.
- `npx prisma format`
  - Passed earlier in this fix round.
- `npx prisma validate`
  - Passed; schema is valid.
- `npx prisma generate`
  - Passed; Prisma Client v7.7.0 generated.
- `npm run build`
  - Passed.
- `git diff --check`
  - Passed.

### Self-Review

- Confirmed no Spaces network call occurs in either advisory-locked transaction.
- Confirmed ambiguous promotion performs an authoritative database read before
  considering cleanup and never deletes active or `READY` evidence.
- Confirmed cleanup failures remain durably retryable.
- Confirmed every KYC review-task writer is either conflict-safe under the
  database invariant or explicitly writes `TIER` work.
- Removed formatter-only churn from the review service and review spec while
  preserving their semantic fix and regression coverage.

### Concerns

- No live PostgreSQL migration/concurrency or external Spaces test was run. The
  database uniqueness SQL and lifecycle behavior are covered by deterministic
  migration-contract and failure-injection tests.
- The focused run emits an AWS SDK notice that future releases will require
  Node 22; the current Node 20 environment still passes all requested gates.
