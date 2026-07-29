# Enterprise KYC Routing and Admin Review Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement immediate, server-owned KYC evidence assessment and a separate maker-checker tier qualification flow backed by private DigitalOcean Spaces storage.

**Architecture:** CBLUE owns evidence, assessments, routing, review tasks, and tier decisions. The web client uploads authenticated evidence to CBLUE immediately after the core fixer profile exists; CBLUE stores it privately in Spaces, records deterministic/provider assessments, and returns stable reason codes. BLUE receives only a versioned sanitized snapshot through its existing NestJS bridge boundary.

**Tech Stack:** NestJS, TypeScript, Prisma, PostgreSQL, AWS SDK v3 for DigitalOcean Spaces, Next.js/React, Jest, GitHub Actions, Docker.

## Global Constraints

- Modify only the CBLUE repository; do not edit BLUE or LBLUE.
- Preserve `Flutter -> BLUE NestJS workflow bridge -> CBLUE backend -> BLUE normalized runtime -> Flutter UI`.
- Do not return storage keys, private URLs, raw OCR, document bytes, provider secrets, or administrator identities through the BLUE bridge.
- A general LLM cannot approve or reject identity.
- Hard evidence failures reject the evidence, not the fixer account.
- Missing face-match or liveness providers persist `null`; never fabricate scores.
- KYC approval and tier qualification remain separate state machines.
- Economy requires approved KYC and minimum profile completeness.
- Standard through Expert require deterministic eligibility plus maker-checker approval.
- Use the existing `SPACES_ENDPOINT`, `SPACES_KEY`, `SPACES_SECRET`, `SPACES_BUCKET`, and `SPACES_REGION` runtime credentials.
- Qualification operations fail closed when Spaces is unavailable; unrelated CBLUE services remain available.
- Keep existing qualification routes compatible while adding the authoritative v2 fields.
- Do not add mock admin data or technical process copy to user-facing pages.
- Keep unrelated dirty files untouched.

---

## File Structure

### New backend files

- `backend/src/modules/qualification/qualification-assessment.types.ts`: shared KYC assessment and reason-code contracts.
- `backend/src/modules/qualification/qualification-assessment.service.ts`: immediate per-document assessment and routing.
- `backend/src/modules/qualification/qualification-routing.service.ts`: aggregate KYC routing, cooldown, and KYC review-task creation.
- `backend/src/modules/qualification/qualification-storage-readiness.service.ts`: Spaces configuration and private probe state.
- `backend/src/modules/qualification/dto/create-qualification-draft.dto.ts`: versioned consent input for create-or-resume draft.
- `backend/src/modules/qualification/qualification-assessment.service.spec.ts`: immediate assessment tests.
- `backend/src/modules/qualification/qualification-routing.service.spec.ts`: threshold, hard-failure, and cooldown tests.
- `backend/src/modules/qualification/qualification-storage-readiness.service.spec.ts`: missing config and private probe tests.
- `backend/src/scripts/qualification-storage-probe.ts`: deployment readiness command.
- `backend/prisma/migrations/20260730120000_add_kyc_routing_state/migration.sql`: additive schema migration and backfill.

### Modified backend files

- `backend/prisma/schema.prisma`: explicit KYC routing fields, assessment scores, review kind, and evidence supersession.
- `backend/src/config/configuration.ts`: normalized Spaces configuration remains the only credential source.
- `backend/src/modules/qualification/qualification.module.ts`: register new services.
- `backend/src/modules/qualification/qualification-storage.service.ts`: readiness guard, delete support, and probe primitives.
- `backend/src/modules/qualification/qualification-verification.service.ts`: expose provider verification as an internal assessment dependency without admin-task authorization.
- `backend/src/modules/qualification/qualification.service.ts`: draft reuse, immediate assessment response, evidence replacement, and sanitized status.
- `backend/src/modules/qualification/qualification-evaluation.service.ts`: tier-only evaluation after KYC approval.
- `backend/src/modules/qualification/qualification-policy.service.ts`: deterministic tier ceiling and policy v2.
- `backend/src/modules/qualification/qualification-review.service.ts`: KYC/TIER task separation and maker-checker decisions.
- `backend/src/modules/qualification/qualification.controller.ts`: draft, upload assessment, status, readiness, and admin queue contracts.
- `backend/src/modules/qualification/dto/upload-qualification-document.dto.ts`: typed evidence slots.
- `backend/src/modules/blue-bridge/qualification-bridge.service.ts`: sanitized `cblue-fixer-qualification-v2` snapshot.
- Existing qualification and bridge specs: focused regression coverage.
- `backend/package.json`: storage probe script.
- `.github/workflows/backend-ci.yml`: pre-cutover qualification readiness probe.

### Modified web files

- `apps/web/app/[locale]/fixers/register/page.tsx`: core-profile boundary, immediate uploads, persisted slot results, and resubmission.
- `apps/web/app/[locale]/components/QualificationReviewPanel.tsx`: valid wide table and separate KYC/TIER queues.
- `apps/web/app/[locale]/components/QualificationEvidenceControls.tsx`: assigned-reviewer evidence controls and signed links.
- `apps/web/app/[locale]/components/QualificationAuditPanel.tsx`: task-kind and routing audit rendering.

---

### Task 1: Persist Separate KYC Routing and Assessment State

**Files:**
- Modify: `backend/prisma/schema.prisma`
- Create: `backend/prisma/migrations/20260730120000_add_kyc_routing_state/migration.sql`
- Test: `backend/src/modules/qualification/qualification.service.spec.ts`

**Interfaces:**
- Produces: `QualificationSubmissionStatus.ASSESSING`, `NEEDS_RESUBMISSION`, and `AI_PRECLEARED`.
- Produces: `QualificationReviewKind.KYC | TIER`.
- Produces nullable assessment fields on `QualificationEvaluation`.
- Produces active/superseded evidence fields on `KycDocument`.

- [ ] **Step 1: Write the failing Prisma-backed contract assertions**

Add assertions to `qualification.service.spec.ts` that upload queries and status projections select:

```ts
expect(prisma.kycDocument.findMany).toHaveBeenCalledWith(
  expect.objectContaining({
    where: expect.objectContaining({ isActive: true }),
  }),
);
expect(result.evaluation).toEqual(
  expect.objectContaining({
    identityConfidence: 91,
    documentAuthenticityConfidence: 88,
    faceMatchConfidence: null,
    livenessConfidence: null,
    credentialConfidence: null,
    tierEligibilityScore: null,
    humanReviewRequired: true,
  }),
);
```

- [ ] **Step 2: Run the focused spec and confirm failure**

Run:

```bash
cd backend
npm test -- qualification.service.spec.ts --runInBand
```

Expected: FAIL because the new Prisma fields and status projection do not exist.

- [ ] **Step 3: Add the schema contracts**

Add:

```prisma
enum QualificationReviewKind {
  KYC
  TIER
}
```

Extend `QualificationSubmissionStatus` with:

```prisma
ASSESSING
NEEDS_RESUBMISSION
AI_PRECLEARED
```

Extend `KycDocument` with:

```prisma
isActive             Boolean   @default(true)
supersededAt         DateTime?
supersededById       String?
assessmentReasonCodes Json?
assessedAt           DateTime?
```

Extend `QualificationEvaluation` with:

```prisma
identityConfidence             Int?
documentAuthenticityConfidence Int?
faceMatchConfidence            Int?
livenessConfidence             Int?
credentialConfidence           Int?
tierEligibilityScore           Int?
humanReviewRequired            Boolean @default(true)
```

Extend `QualificationReviewTask` with:

```prisma
kind QualificationReviewKind @default(KYC)
```

Add indexes for active evidence, routing queues, and review kind. The SQL migration must add enum values transaction-safely, backfill existing open review tasks to `KYC`, mark existing documents active, and avoid rewriting existing decisions.

- [ ] **Step 4: Validate and regenerate Prisma**

Run:

```bash
cd backend
npx prisma format
npx prisma validate
npx prisma generate
npm test -- qualification.service.spec.ts --runInBand
```

Expected: Prisma commands PASS and the focused spec reaches the next behavioral failure.

- [ ] **Step 5: Commit the additive data contract**

```bash
git add backend/prisma/schema.prisma backend/prisma/migrations/20260730120000_add_kyc_routing_state/migration.sql backend/src/modules/qualification/qualification.service.spec.ts
git commit -m "Add explicit KYC routing state"
```

---

### Task 2: Make DigitalOcean Spaces Qualification-Ready

**Files:**
- Create: `backend/src/modules/qualification/qualification-storage-readiness.service.ts`
- Create: `backend/src/modules/qualification/qualification-storage-readiness.service.spec.ts`
- Create: `backend/src/scripts/qualification-storage-probe.ts`
- Modify: `backend/src/modules/qualification/qualification-storage.service.ts`
- Modify: `backend/src/modules/qualification/qualification-storage.service.spec.ts`
- Modify: `backend/src/modules/qualification/qualification.module.ts`
- Modify: `backend/package.json`
- Modify: `.github/workflows/backend-ci.yml`

**Interfaces:**
- Produces: `QualificationStorageReadinessService.getState(): QualificationStorageReadiness`.
- Produces: `QualificationStorageReadinessService.probe(): Promise<QualificationStorageReadiness>`.
- Produces: `QualificationStorageService.deletePrivateObject(key: string): Promise<void>`.
- Produces: `npm run qualification:storage-probe`.

- [ ] **Step 1: Write failing readiness and probe tests**

Use an injected S3 client factory and assert:

```ts
expect(service.getState()).toEqual({
  ready: false,
  code: 'SPACES_CONFIGURATION_INCOMPLETE',
  missing: ['SPACES_SECRET'],
  checkedAt: expect.any(Date),
});
await expect(service.assertReady()).rejects.toThrow(
  'Qualification evidence storage is unavailable',
);
```

For a configured client, assert `PutObjectCommand`, `GetObjectCommand`, and `DeleteObjectCommand` execute with a generated `qualification-readiness/` key, private ACL, and AES256 encryption.

- [ ] **Step 2: Run the storage specs and confirm failure**

```bash
cd backend
npm test -- qualification-storage.service.spec.ts qualification-storage-readiness.service.spec.ts --runInBand
```

Expected: FAIL because readiness and delete/probe behavior are absent.

- [ ] **Step 3: Implement readiness without taking CBLUE offline**

Define:

```ts
export type QualificationStorageReadiness = {
  ready: boolean;
  code: 'READY' | 'SPACES_CONFIGURATION_INCOMPLETE' | 'SPACES_PROBE_FAILED';
  missing: string[];
  checkedAt: Date;
};
```

`probe()` must write random bytes, read and compare them, delete the probe object in `finally`, store only the sanitized readiness result, and log no credential or URL. `assertReady()` guards upload, document viewing, and submission; it must not stop unrelated Nest modules from starting.

- [ ] **Step 4: Add deployment verification**

Add:

```json
"qualification:storage-probe": "ts-node -r tsconfig-paths/register src/scripts/qualification-storage-probe.ts"
```

The script creates a Nest application context, calls `probe()`, exits non-zero when `ready` is false, and always closes the context. In `backend-ci.yml`, run the command inside the candidate backend container after migrations and before traffic cutover, using the existing `SPACES_*` environment injection. Never echo resolved values.

- [ ] **Step 5: Verify focused storage behavior**

```bash
cd backend
npm test -- qualification-storage.service.spec.ts qualification-storage-readiness.service.spec.ts --runInBand
npm run build
```

Expected: PASS.

- [ ] **Step 6: Commit storage readiness**

```bash
git add backend/src/modules/qualification/qualification-storage-readiness.service.ts backend/src/modules/qualification/qualification-storage-readiness.service.spec.ts backend/src/modules/qualification/qualification-storage.service.ts backend/src/modules/qualification/qualification-storage.service.spec.ts backend/src/modules/qualification/qualification.module.ts backend/src/scripts/qualification-storage-probe.ts backend/package.json .github/workflows/backend-ci.yml
git commit -m "Add qualification storage readiness probe"
```

---

### Task 3: Assess Evidence Immediately and Persist Results

**Files:**
- Create: `backend/src/modules/qualification/qualification-assessment.types.ts`
- Create: `backend/src/modules/qualification/qualification-assessment.service.ts`
- Create: `backend/src/modules/qualification/qualification-assessment.service.spec.ts`
- Modify: `backend/src/modules/qualification/qualification-verification.service.ts`
- Modify: `backend/src/modules/qualification/qualification-verification.service.spec.ts`
- Modify: `backend/src/modules/qualification/qualification.module.ts`

**Interfaces:**
- Produces: `QualificationAssessmentService.assessDocument(input): Promise<QualificationDocumentAssessment>`.
- Consumes: persisted document bytes through `QualificationStorageService`.
- Produces stable reason codes and nullable confidence fields.

- [ ] **Step 1: Define and test the assessment contract**

Use:

```ts
export type QualificationReasonCode =
  | 'DOCUMENT_VALID'
  | 'WRONG_DOCUMENT_TYPE'
  | 'UNREADABLE_DOCUMENT'
  | 'EXPIRED_ID'
  | 'IDENTITY_CONTRADICTION'
  | 'LIVENESS_FAILED'
  | 'PROVIDER_UNAVAILABLE'
  | 'HUMAN_REVIEW_REQUIRED';

export type QualificationDocumentAssessment = {
  evidenceStatus:
    | 'VALIDATED'
    | 'CONTRADICTED'
    | 'EXPIRED'
    | 'INSUFFICIENT'
    | 'UNCHECKED';
  route:
    | 'NEEDS_RESUBMISSION'
    | 'NEEDS_MORE_EVIDENCE'
    | 'NEEDS_REVIEW'
    | 'AI_PRECLEARED';
  confidence: number | null;
  identityConfidence: number | null;
  documentAuthenticityConfidence: number | null;
  faceMatchConfidence: number | null;
  livenessConfidence: number | null;
  reasonCodes: QualificationReasonCode[];
  provider: string;
  model: string | null;
  assessedAt: Date;
};
```

Tests must cover wrong side, unreadable content, expired ID, name contradiction, provider timeout, invalid provider output, and absent certified face/liveness services.

- [ ] **Step 2: Run assessment tests and confirm failure**

```bash
cd backend
npm test -- qualification-assessment.service.spec.ts qualification-verification.service.spec.ts --runInBand
```

Expected: FAIL because the assessment orchestrator is absent.

- [ ] **Step 3: Separate provider extraction from admin authorization**

Refactor verification into an internal method:

```ts
async assessStoredDocument(input: {
  submissionId: string;
  documentId: string;
  registeredName: string;
}): Promise<QualificationDocumentAssessment>
```

Keep the existing admin endpoint authorization around manual verification. The new internal method must only accept a document already authorized by the calling qualification service. Provider failures return `PROVIDER_UNAVAILABLE` and `NEEDS_REVIEW`; they never return approval. Raw OCR stays transient.

- [ ] **Step 4: Persist one immutable evaluation per assessment**

`assessDocument()` must update the document evidence state and create a `QualificationEvaluation` containing provider/model/policy/input hash, separate confidence values, risk, reason codes, and completion timestamp in one Prisma transaction. `faceMatchConfidence` and `livenessConfidence` remain `null` until a certified provider supplies them.

- [ ] **Step 5: Verify immediate assessment**

```bash
cd backend
npm test -- qualification-assessment.service.spec.ts qualification-verification.service.spec.ts --runInBand
npm run build
```

Expected: PASS.

- [ ] **Step 6: Commit immediate evidence assessment**

```bash
git add backend/src/modules/qualification/qualification-assessment.types.ts backend/src/modules/qualification/qualification-assessment.service.ts backend/src/modules/qualification/qualification-assessment.service.spec.ts backend/src/modules/qualification/qualification-verification.service.ts backend/src/modules/qualification/qualification-verification.service.spec.ts backend/src/modules/qualification/qualification.module.ts
git commit -m "Assess qualification evidence on upload"
```

---

### Task 4: Route KYC Submissions and Enforce Resubmission Cooldown

**Files:**
- Create: `backend/src/modules/qualification/qualification-routing.service.ts`
- Create: `backend/src/modules/qualification/qualification-routing.service.spec.ts`
- Modify: `backend/src/modules/qualification/qualification.service.ts`
- Modify: `backend/src/modules/qualification/qualification.service.spec.ts`
- Modify: `backend/src/modules/qualification/qualification.module.ts`

**Interfaces:**
- Consumes: active KYC document assessments.
- Produces: `routeSubmission(submissionId, actorId): Promise<KycRoutingDecision>`.
- Produces exactly one open `KYC` review task for `NEEDS_REVIEW` or `AI_PRECLEARED`.

- [ ] **Step 1: Write threshold and hard-failure tests**

Assert:

```ts
expect(route([hardFailure])).toEqual(
  expect.objectContaining({ status: 'NEEDS_RESUBMISSION' }),
);
expect(route([assessment(59)])).toEqual(
  expect.objectContaining({ status: 'NEEDS_MORE_EVIDENCE' }),
);
expect(route([assessment(60)])).toEqual(
  expect.objectContaining({ status: 'NEEDS_REVIEW' }),
);
expect(route([assessment(90)])).toEqual(
  expect.objectContaining({
    status: 'AI_PRECLEARED',
    humanReviewRequired: true,
  }),
);
```

Add idempotency and three-consecutive-hard-fail cooldown assertions.

- [ ] **Step 2: Run routing tests and confirm failure**

```bash
cd backend
npm test -- qualification-routing.service.spec.ts qualification.service.spec.ts --runInBand
```

Expected: FAIL because aggregate routing is absent.

- [ ] **Step 3: Implement aggregate routing**

Define:

```ts
export type KycRoutingDecision = {
  status:
    | 'NEEDS_RESUBMISSION'
    | 'NEEDS_MORE_EVIDENCE'
    | 'NEEDS_REVIEW'
    | 'AI_PRECLEARED';
  confidence: number | null;
  reasonCodes: QualificationReasonCode[];
  humanReviewRequired: true;
  lockedUntil: Date | null;
};
```

Use active `id-front`, `id-back`, and `selfie-with-id` evidence only. A hard
failure wins over score thresholds. Aggregate confidence is the minimum
non-null confidence across the required identity checks; any unavailable
required assessment routes to review instead of being omitted from the score.
Provider unavailable routes to review. Three consecutive hard failures set a
bounded cooldown; successful replacement resets `failedAttempts`.

- [ ] **Step 4: Make upload replacement authoritative**

For single-slot KYC evidence, acquire the existing submission advisory lock,
store and assess the new document, set the previous active document to
`isActive=false` with `supersededAt` and `supersededById`, and create an audit
event. Portfolio keeps up to ten active files. If persistence or assessment
fails after the Spaces write, delete the new object in a compensating cleanup
and retain the prior active document. A failed operation must not leave an
orphaned object or two active slot records.

- [ ] **Step 5: Route on submit and create review work exactly once**

`submitForUser()` validates three active KYC slots, calls `routeSubmission`, persists the status and audit record, and upserts one open task with `kind: KYC` for `NEEDS_REVIEW` and `AI_PRECLEARED`. It must not call tier evaluation.

- [ ] **Step 6: Verify routing and replacement**

```bash
cd backend
npm test -- qualification-routing.service.spec.ts qualification.service.spec.ts --runInBand
npm run build
```

Expected: PASS.

- [ ] **Step 7: Commit KYC routing**

```bash
git add backend/src/modules/qualification/qualification-routing.service.ts backend/src/modules/qualification/qualification-routing.service.spec.ts backend/src/modules/qualification/qualification.service.ts backend/src/modules/qualification/qualification.service.spec.ts backend/src/modules/qualification/qualification.module.ts
git commit -m "Route KYC evidence to human review"
```

---

### Task 5: Separate Tier Evaluation from KYC Approval

**Files:**
- Modify: `backend/src/modules/qualification/qualification-policy.service.ts`
- Modify: `backend/src/modules/qualification/qualification-policy.service.spec.ts`
- Modify: `backend/src/modules/qualification/qualification-evaluation.service.ts`
- Modify: `backend/src/modules/qualification/qualification-evaluation.service.spec.ts`
- Modify: `backend/src/modules/qualification/qualification-review.service.ts`
- Modify: `backend/src/modules/qualification/qualification-review.service.spec.ts`

**Interfaces:**
- Produces: `QualificationPolicyService.calculateTierCeiling(input): TierPolicyDecision`.
- Produces: separate `KYC` and `TIER` maker-checker tasks.
- Preserves: one admin cannot both propose and check a decision.

- [ ] **Step 1: Write failing KYC/tier separation tests**

Cover:

```ts
await expect(service.evaluateTier(unapprovedSubmissionId)).rejects.toThrow(
  'KYC approval is required before tier evaluation',
);
expect(policy.calculateTierCeiling(verifiedEvidence).maximumTier).toBe(
  'CORPORATE',
);
expect(aiRecommendationAboveCeiling).toBeClampedTo('CORPORATE');
```

Assert approved KYC grants Economy, weak portfolio cannot revoke KYC, and upper tiers create `kind: TIER` tasks.

- [ ] **Step 2: Run policy, evaluation, and review specs**

```bash
cd backend
npm test -- qualification-policy.service.spec.ts qualification-evaluation.service.spec.ts qualification-review.service.spec.ts --runInBand
```

Expected: FAIL on missing separation and task kind.

- [ ] **Step 3: Version and implement deterministic policy**

Update policy version to `cblue-fixer-qualification-v2`. Return:

```ts
export type TierPolicyDecision = {
  maximumTier: FixerTier;
  eligibilityScore: number;
  reasonCodes: string[];
};
```

Only verified structured evidence contributes. Typhoon may recommend at or below `maximumTier`; unavailable or malformed AI output leaves deterministic policy authoritative.

- [ ] **Step 4: Apply maker-checker decisions by task kind**

For `KYC`, checker approval sets submission `APPROVED`, fixer `verified=true`, fixer `status=APPROVED`, and tier `ECONOMY`. It then starts tier evaluation. For `TIER`, checker approval changes only the approved tier within the deterministic ceiling. `REJECTED` is reserved for an explicit final admin decision and must include a reason.

- [ ] **Step 5: Verify tier separation**

```bash
cd backend
npm test -- qualification-policy.service.spec.ts qualification-evaluation.service.spec.ts qualification-review.service.spec.ts --runInBand
npm run build
```

Expected: PASS.

- [ ] **Step 6: Commit tier qualification separation**

```bash
git add backend/src/modules/qualification/qualification-policy.service.ts backend/src/modules/qualification/qualification-policy.service.spec.ts backend/src/modules/qualification/qualification-evaluation.service.ts backend/src/modules/qualification/qualification-evaluation.service.spec.ts backend/src/modules/qualification/qualification-review.service.ts backend/src/modules/qualification/qualification-review.service.spec.ts
git commit -m "Separate KYC approval from tier qualification"
```

---

### Task 6: Publish Authoritative Partner and Admin API Contracts

**Files:**
- Create: `backend/src/modules/qualification/dto/create-qualification-draft.dto.ts`
- Modify: `backend/src/modules/qualification/qualification.controller.ts`
- Modify: `backend/src/modules/qualification/qualification.service.ts`
- Modify: `backend/src/modules/qualification/qualification.service.spec.ts`
- Modify: `backend/src/modules/qualification/qualification-review.service.ts`
- Modify: `backend/src/modules/qualification/qualification-review.service.spec.ts`

**Interfaces:**
- Produces: `POST /api/v1/qualification/submissions/draft`.
- Preserves: `POST /api/v1/qualification/submissions`.
- Upload returns `{ document, assessment }`.
- Admin list returns queue summary, task kind, assessments, metadata, and audit history.

- [ ] **Step 1: Write failing API service-contract tests**

Assert draft reuse:

```ts
expect(await service.createOrResumeDraftForUser(userId, consentVersion)).toEqual(
  expect.objectContaining({ id: existingDraftId, status: 'DRAFT' }),
);
```

Assert upload response:

```ts
expect(result).toEqual({
  document: expect.objectContaining({
    id: expect.any(String),
    documentType: 'id-front',
    evidenceStatus: expect.any(String),
  }),
  assessment: expect.objectContaining({
    kycStatus: 'NEEDS_REVIEW',
    confidence: 78,
    reasonCodes: ['HUMAN_REVIEW_REQUIRED'],
  }),
});
```

- [ ] **Step 2: Run qualification service and review specs**

```bash
cd backend
npm test -- qualification.service.spec.ts qualification-review.service.spec.ts --runInBand
```

Expected: FAIL because create-or-resume and assessment response are absent.

- [ ] **Step 3: Add the draft and upload contracts**

`CreateQualificationDraftDto` contains a non-empty `consentVersion`. The new route creates or resumes only the authenticated user's latest editable draft. The legacy create route delegates to the same method. Upload returns persisted sanitized fields and stable reason codes; no storage key or OCR text.

- [ ] **Step 4: Return explicit admin queue data**

Admin review responses include:

```ts
{
  summary: {
    kycAwaitingReview: number;
    aiPrecleared: number;
    needsResubmission: number;
    upperTierReviews: number;
    assigned: number;
    awaitingChecker: number;
  };
  tasks: Array<{
    id: string;
    kind: 'KYC' | 'TIER';
    status: string;
    priority: number;
    submission: {
      id: string;
      version: number;
      status: string;
      documents: Array<{
        id: string;
        documentType: string;
        contentType: string;
        sizeBytes: number;
        evidenceStatus: string;
        assessedAt: Date | null;
      }>;
    };
  }>;
}
```

Signed URLs remain a separate assigned-admin endpoint with five-minute expiry and an audit record.

- [ ] **Step 5: Verify backend API contracts**

```bash
cd backend
npm test -- qualification.service.spec.ts qualification-review.service.spec.ts --runInBand
npm run build
```

Expected: PASS.

- [ ] **Step 6: Commit API contracts**

```bash
git add backend/src/modules/qualification/dto/create-qualification-draft.dto.ts backend/src/modules/qualification/qualification.controller.ts backend/src/modules/qualification/qualification.service.ts backend/src/modules/qualification/qualification.service.spec.ts backend/src/modules/qualification/qualification-review.service.ts backend/src/modules/qualification/qualification-review.service.spec.ts
git commit -m "Publish authoritative qualification review contracts"
```

---

### Task 7: Render the Enterprise Admin Review Queue

**Files:**
- Modify: `apps/web/app/[locale]/components/QualificationReviewPanel.tsx`
- Modify: `apps/web/app/[locale]/components/QualificationEvidenceControls.tsx`
- Modify: `apps/web/app/[locale]/components/QualificationAuditPanel.tsx`

**Interfaces:**
- Consumes: Task 6 admin queue and evidence endpoints.
- Produces: valid, wide KYC/TIER task table with no mock rows.

- [ ] **Step 1: Capture the current type failure**

Run:

```bash
cd apps/web
npm run check-types
```

Record the current result, then add exact response types for `summary`, `tasks`, assessments, evidence metadata, and audit entries. TypeScript must reject the old malformed task shape.

- [ ] **Step 2: Replace invalid table structure**

Use one `<tr>` per task and the same number of `<td>` cells as headers:

```tsx
<tr key={task.id}>
  <td>{task.kind}</td>
  <td>{task.partnerName}</td>
  <td>{task.submission.status}</td>
  <td>{formatConfidence(task.assessment.identityConfidence)}</td>
  <td>{formatConfidence(task.assessment.credentialConfidence)}</td>
  <td>{task.status}</td>
  <td><ReviewActions task={task} /></td>
</tr>
```

No nested `<td>`, no fabricated scores, and no emoji. Use full-width responsive overflow for the table.

- [ ] **Step 3: Separate KYC and tier decisions**

KYC tasks show ID slots, nullable identity/authenticity/face/liveness values, reason codes, and KYC maker-checker controls. Tier tasks show credential/portfolio evidence, deterministic ceiling, AI recommendation, price list, and tier maker-checker controls. A missing score renders an em dash, not zero.

- [ ] **Step 4: Keep private evidence access assigned and audited**

Evidence controls request a five-minute URL only after assignment. Clear the URL from component state when the task changes or the modal closes. Never persist it in localStorage.

- [ ] **Step 5: Verify web compilation**

```bash
cd apps/web
npm run check-types
npm run build
```

Expected: PASS.

- [ ] **Step 6: Commit admin review UI**

```bash
git add apps/web/app/[locale]/components/QualificationReviewPanel.tsx apps/web/app/[locale]/components/QualificationEvidenceControls.tsx apps/web/app/[locale]/components/QualificationAuditPanel.tsx
git commit -m "Render separate KYC and tier review queues"
```

---

### Task 8: Upload and Assess Evidence During Registration

**Files:**
- Modify: `apps/web/app/[locale]/fixers/register/page.tsx`

**Interfaces:**
- Consumes: Task 6 draft/upload/status APIs.
- Produces: immediate persisted KYC slot feedback and separate portfolio processing.

- [ ] **Step 1: Add typed client state for persisted evidence**

Replace `File[]`-only KYC state with:

```ts
type PersistedEvidenceSlot = {
  localFile: File;
  documentId: string | null;
  uploadState: 'idle' | 'uploading' | 'assessing' | 'complete' | 'error';
  kycStatus: string | null;
  confidence: number | null;
  reasonCodes: string[];
  message: string | null;
};
```

Keep portfolio file preparation separate and limited to ten files at 300 KiB each.

- [ ] **Step 2: Persist the core profile before enabling evidence controls**

After authenticated core profile save returns a real fixer, call `POST /qualification/submissions/draft` once and retain the server submission ID in React state. Do not create fabricated fixer records and do not put qualification state in localStorage.

- [ ] **Step 3: Upload each KYC slot immediately**

On selection/camera capture, upload the slot, render `uploading` then `assessing`, and use the returned assessment:

```ts
const result = (await response.json()) as UploadAssessmentResponse;
setKycSlots((current) =>
  replaceSlot(current, index, {
    documentId: result.document.id,
    uploadState: 'complete',
    kycStatus: result.assessment.kycStatus,
    confidence: result.assessment.confidence,
    reasonCodes: result.assessment.reasonCodes,
    message: localizeReasonCodes(result.assessment.reasonCodes, locale),
  }),
);
```

Wrong type, unreadable evidence, expiry, or identity contradiction must be visible immediately and replaceable. Provider unavailable displays a human-review message, not a false failure.

- [ ] **Step 4: Stop re-uploading evidence during Save**

Final Save submits only the existing draft after every required slot has a persisted `documentId`. Portfolio uploads use the same draft and remain separate from KYC status. A portfolio evaluation result cannot overwrite KYC feedback.

- [ ] **Step 5: Verify frontend behavior and build**

```bash
cd apps/web
npm run check-types
npm run build
```

Then run the local app and verify with Playwright:

1. core profile must exist before evidence controls enable;
2. selecting ID front causes one immediate request;
3. replacing ID front supersedes the earlier document;
4. upload failure remains visible and retryable;
5. final Save does not issue duplicate document uploads;
6. portfolio accepts up to ten compressed image/PDF files.

- [ ] **Step 6: Commit registration workflow**

```bash
git add apps/web/app/[locale]/fixers/register/page.tsx
git commit -m "Persist KYC evidence during fixer registration"
```

---

### Task 9: Publish the Sanitized BLUE v2 Snapshot and Deploy

**Files:**
- Modify: `backend/src/modules/blue-bridge/qualification-bridge.service.ts`
- Modify: `backend/src/modules/blue-bridge/qualification-bridge.service.spec.ts`
- Modify: `backend/src/modules/qualification/qualification.service.ts`
- Modify: `backend/src/modules/qualification/qualification.service.spec.ts`
- Verify: `.github/workflows/backend-ci.yml`

**Interfaces:**
- Produces: `sourceVersion: "cblue-fixer-qualification-v2"`.
- Produces: separate `kyc` and `tier` objects.
- Preserves: bridge key and linked-subject authorization.

- [ ] **Step 1: Write failing BLUE snapshot tests**

Assert:

```ts
expect(snapshot).toEqual(
  expect.objectContaining({
    sourceVersion: 'cblue-fixer-qualification-v2',
    kyc: {
      status: 'NEEDS_REVIEW',
      identityConfidence: 78,
      documentAuthenticityConfidence: 81,
      faceMatchConfidence: null,
      livenessConfidence: null,
      fraudRisk: 'MEDIUM',
      humanReviewRequired: true,
    },
    tier: {
      eligibilityScore: null,
      recommendedTier: null,
      approvedTier: null,
    },
  }),
);
expect(JSON.stringify(snapshot)).not.toMatch(
  /storageKey|signedUrl|rawOcr|providerSecret|assignedTo|reviewerId/,
);
```

Retain tests for invalid bridge key and unknown linked subject.

- [ ] **Step 2: Run bridge tests and confirm failure**

```bash
cd backend
npm test -- qualification-bridge.service.spec.ts qualification.service.spec.ts --runInBand
```

Expected: FAIL because the existing snapshot is v1 and combines fields.

- [ ] **Step 3: Implement the v2 sanitized projection**

Select only the latest persisted KYC assessment, current submission routing status, current tier qualification, and non-private document metadata. Do not infer missing scores. Keep legacy top-level fields only where current consumers require them, and document their deprecation in code through typed projection names rather than user-facing text.

- [ ] **Step 4: Run the full qualification regression suite**

```bash
cd backend
npm test -- qualification-policy.service.spec.ts qualification-storage.service.spec.ts qualification-storage-readiness.service.spec.ts qualification-assessment.service.spec.ts qualification-routing.service.spec.ts qualification-verification.service.spec.ts qualification-evaluation.service.spec.ts qualification-review.service.spec.ts qualification.service.spec.ts qualification-bridge.service.spec.ts --runInBand
npx prisma validate
npm run build
cd ../apps/web
npm run check-types
npm run build
cd ../..
git diff --check
```

Expected: all commands PASS.

- [ ] **Step 5: Commit the bridge contract**

```bash
git add backend/src/modules/blue-bridge/qualification-bridge.service.ts backend/src/modules/blue-bridge/qualification-bridge.service.spec.ts backend/src/modules/qualification/qualification.service.ts backend/src/modules/qualification/qualification.service.spec.ts
git commit -m "Expose authoritative qualification v2 snapshot"
```

- [ ] **Step 6: Push CBLUE main and monitor deployment**

```bash
git status --short
git log -10 --oneline
git push origin main
gh run list --workflow backend-ci.yml --limit 5
```

Confirm only intended files were committed. Monitor the matching backend and web deployment runs through completion. Do not print any Spaces or bridge secret.

- [ ] **Step 7: Perform sanitized production verification**

Verify:

1. qualification storage probe reports ready;
2. a real authenticated partner can create/resume a draft;
3. ID front, ID back, and selfie each upload and return persisted assessments;
4. the submission appears in the KYC admin queue;
5. assigned admin signed links expire after five minutes;
6. KYC maker-checker approval grants Economy;
7. upper-tier evidence creates a separate TIER task;
8. `/api/v1/blue/qualification` returns v2 for the linked partner;
9. the snapshot contains no private evidence or secrets.

Report only sanitized statuses, reason codes, source version, nullable score fields, queue counts, deployment commit, and workflow result.
