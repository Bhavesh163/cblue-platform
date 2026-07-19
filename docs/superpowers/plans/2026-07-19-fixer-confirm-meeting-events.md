# Fixer Confirm-Meeting Events Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep confirmed fixer meetings at persisted Step 9 and expose the persisted `confirm-meeting` event to both participants and both CBLUE dashboards.

**Architecture:** Reuse `FixerWorkflowAction` as the authoritative event ledger. Project action rows through one backend serializer and one web projection helper so bridge detail, activities, authenticated order collections, customer UI, and partner UI consume the same phase, step, actor, and timestamp.

**Tech Stack:** NestJS, Prisma/PostgreSQL, Jest, Next.js/React, Node test runner.

## Global Constraints

- Modify only CBLUE; do not edit BLUE or LBLUE.
- Do not infer workflow phase, event, actor, or timestamp from status text, PO number, descriptions, chat text, browser storage, or current time.
- Preserve cancellation, decline, property workflow, and existing response fields.
- Use persisted `Order.workflowPhase` and `FixerWorkflowAction` rows.
- Add no mock frontend workflow records.

---

### Task 1: Authoritative Backend Workflow Event Projection

**Files:**
- Modify: `backend/src/modules/blue-bridge/blue-bridge.service.ts`
- Modify: `backend/src/modules/blue-bridge/fixer-workflow-bridge.service.ts`
- Test: `backend/src/modules/blue-bridge/fixer-workflow-bridge.service.spec.ts`
- Test: `backend/src/modules/blue-bridge/blue-workflow-activities.service.spec.ts`
- Test: `backend/src/modules/blue-bridge/blue-bridge.production-contract.spec.ts`

**Interfaces:**
- Consumes persisted `FixerWorkflowAction { action, actorUserId, createdAt }` rows and order participant IDs.
- Produces `workflowEvents: Array<{ action: string; createdAt: string; actorRole: 'customer' | 'partner' }>` and explicit `workflowPhase` on all fixer snapshots.

- [ ] **Step 1: Write failing detail/action regression tests**

Add fixtures with a persisted partner action:

```ts
workflowPhase: 'VARIATION',
workflowActions: [{
  action: 'confirm-meeting',
  actorUserId: 'partner-1',
  createdAt: new Date('2026-07-19T10:30:00.000Z'),
}],
```

Assert customer and partner detail/action responses contain:

```ts
expect(snapshot).toMatchObject({
  workflowPhase: 'VARIATION',
  currentStep: 9,
  workflowEvents: [{
    action: 'confirm-meeting',
    createdAt: '2026-07-19T10:30:00.000Z',
    actorRole: 'partner',
  }],
});
```

- [ ] **Step 2: Write failing activities regression tests**

Assert the same event is present in both customer and partner activity records and generic `status=IN_PROGRESS` does not reduce `currentStep` below 9.

- [ ] **Step 3: Run tests and verify RED**

```bash
cd backend
npm test -- --runInBand src/modules/blue-bridge/fixer-workflow-bridge.service.spec.ts src/modules/blue-bridge/blue-workflow-activities.service.spec.ts src/modules/blue-bridge/blue-bridge.production-contract.spec.ts
```

Expected: failures because `workflowPhase` and `workflowEvents` are absent or incomplete.

- [ ] **Step 4: Implement one persisted event serializer**

```ts
function persistedFixerWorkflowEvents(order: any) {
  return (order.workflowActions || []).flatMap((event: any) => {
    const actorRole = event.actorUserId === order.userId
      ? 'customer'
      : event.actorUserId === order.fixer?.userId
        ? 'partner'
        : null;
    const createdAt = toIsoTimestamp(event.createdAt);
    return actorRole && createdAt
      ? [{ action: String(event.action), createdAt, actorRole }]
      : [];
  });
}
```

Select `actorUserId` and `createdAt` everywhere fixer actions are loaded. Return `workflowPhase` and `workflowEvents` from detail, activities, chat snapshots where appropriate, and successful action responses through the existing fresh detail reload.

- [ ] **Step 5: Run backend tests and verify GREEN**

Run the Task 1 command. Expected: all focused suites pass.

### Task 2: Authenticated Order Collection Contract For CBLUE Web

**Files:**
- Modify: `backend/src/modules/order/order.service.ts`
- Test: `backend/src/modules/order/order.service.spec.ts`

**Interfaces:**
- Consumes the same persisted action rows and `Order.workflowPhase`.
- Produces order records containing `workflowPhase`, authoritative `currentStep`, actions, and `workflowEvents` for `/orders/my` and `/orders/fixer`.

- [ ] **Step 1: Write failing customer and partner collection tests**

Create an `IN_PROGRESS` order with `workflowPhase='VARIATION'` and persisted `confirm-meeting`. Assert both participant collection results contain Step 9 and the persisted event timestamp.

- [ ] **Step 2: Run the tests and verify RED**

```bash
cd backend
npm test -- --runInBand src/modules/order/order.service.spec.ts
```

Expected: failure because collection includes do not serialize the action ledger and snapshot.

- [ ] **Step 3: Add the minimal collection projection**

Hydrate `workflowActions` with `action`, `actorUserId`, and `createdAt`; project the same additive fields used by the bridge without changing existing collection filtering or lifecycle semantics.

- [ ] **Step 4: Run the test and verify GREEN**

Run the Task 2 command. Expected: pass.

### Task 3: Shared CBLUE Step 9 UI Projection

**Files:**
- Modify: `apps/web/lib/fixerWorkflowUiProjection.js`
- Modify: `apps/web/lib/fixerWorkflowUiProjection.d.ts`
- Modify: `apps/web/app/[locale]/dashboard/page.tsx`
- Modify: `apps/web/app/[locale]/fixers/page.tsx`
- Test: `apps/web/lib/fixerWorkflowUiProjection.test.mjs`
- Test: `apps/web/lib/fixerWorkflowPageIntegration.test.mjs`

**Interfaces:**
- Consumes `workflowPhase`, `currentStep`, actions, and `workflowEvents` from authenticated backend order records.
- Produces authoritative Step 9 card/request state and a meeting-confirmed alert timestamped by the persisted event.

- [ ] **Step 1: Write failing pure projection tests**

Assert a shared helper projects this record to Step 9 for either participant:

```js
{
  status: 'IN_PROGRESS',
  workflowPhase: 'VARIATION',
  currentStep: 9,
  workflowEvents: [{
    action: 'confirm-meeting',
    createdAt: '2026-07-19T10:30:00.000Z',
    actorRole: 'partner',
  }],
}
```

Assert it returns no event alert when `workflowEvents` has no persisted `confirm-meeting` row.

- [ ] **Step 2: Write failing page integration tests**

Assert both pages import/use the shared helper, suppress Step 7/8 request reconstruction for `VARIATION`, and do not use `Date.now()` or chat/localStorage signals to timestamp the meeting-confirmed alert.

- [ ] **Step 3: Run tests and verify RED**

```bash
cd apps/web
node --test lib/fixerWorkflowUiProjection.test.mjs lib/fixerWorkflowPageIntegration.test.mjs lib/workflowVisibility.test.mjs
```

Expected: failures for missing shared Step 9/event projection.

- [ ] **Step 4: Implement the shared projection and wire both pages**

```js
export function projectAuthoritativeFixerStep(order) {
  const phase = normalizedText(order?.workflowPhase).toUpperCase();
  return phase === 'VARIATION' ? 9 : Number(order?.currentStep || 0);
}

export function projectMeetingConfirmedEvent(order) {
  const event = (order?.workflowEvents || []).find(
    item => item?.action === 'confirm-meeting' && item?.actorRole === 'partner',
  );
  return event?.createdAt ? event : null;
}
```

Use these helpers in customer and partner request/card/alert mapping. Remove only status/local-cache reconstruction paths superseded by authoritative phase and event data.

- [ ] **Step 5: Run web tests and verify GREEN**

Run the Task 3 command. Expected: pass.

### Task 4: Full Verification, Commit, Push, And Deploy

**Files:**
- Verify all files changed in Tasks 1-3 and the design/plan documents.

**Interfaces:**
- Produces a tested CBLUE commit deployed to backend and web production workflows.

- [ ] **Step 1: Run backend verification**

```bash
cd backend
npm test -- --runInBand src/modules/blue-bridge/fixer-workflow-bridge.service.spec.ts src/modules/blue-bridge/blue-workflow-activities.service.spec.ts src/modules/blue-bridge/blue-bridge.production-contract.spec.ts src/modules/order/order.service.spec.ts
npm run build
```

- [ ] **Step 2: Run web verification**

```bash
cd apps/web
node --test lib/fixerWorkflowUiProjection.test.mjs lib/fixerWorkflowPageIntegration.test.mjs lib/workflowVisibility.test.mjs
npm run check-types
npm run build
```

- [ ] **Step 3: Validate the diff**

```bash
git diff --check
git status --short
```

Confirm there are no BLUE/LBLUE files and no unrelated generated changes.

- [ ] **Step 4: Commit and push**

```bash
git add <scoped CBLUE files>
git commit -m "Fix persisted meeting confirmation workflow events"
git push origin HEAD:main
```

- [ ] **Step 5: Deploy and verify**

Monitor the CBLUE backend and web GitHub Actions runs to successful completion. Verify production route availability and report only sanitized deployment commit, status, and authoritative field names.
