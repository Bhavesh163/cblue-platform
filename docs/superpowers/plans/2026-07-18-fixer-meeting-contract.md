# Fixer Meeting Contract Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist and expose authoritative fixer Step 8 meeting details, project customers and partners into the correct activity buckets, render the persisted invitation in the partner modal, and prove terminal property workflows remain in history.

**Architecture:** Store the current meeting snapshot on `Order` while retaining `FixerWorkflowAction.payload` as the audit record. Port the existing unmerged CBLUE activity/chat bridge onto current `main`, then make the workflow projection persona-aware so phase-owned actions determine requests while cancellation remains a secondary capability. The web partner modal consumes server fields through a small pure mapping helper and renders flexible full-width rows.

**Tech Stack:** NestJS, Prisma/PostgreSQL, Jest, Next.js/React, TypeScript, Node test runner.

## Global Constraints

- Edit CBLUE only. Do not edit BLUE or LBLUE.
- Preserve existing cancel and decline behavior.
- Preserve the working eight-step property workflow unless a regression test demonstrates incorrect terminal placement.
- Do not derive meeting, location, lifecycle, action, or display values from PO/PRE numbers, descriptions, modal text, GPS reverse-geocoding, or browser localStorage.
- Do not introduce mock frontend data.
- Keep terminal, cancelled, declined, archived, and fully rated jobs out of requests, active jobs, and chat rooms.
- Make partner meeting rows use available width and wrap long values.

---

### Task 1: Persist the Fixer Meeting Snapshot Atomically

**Files:**
- Modify: `backend/prisma/schema.prisma`
- Create: `backend/prisma/migrations/20260718090000_add_fixer_meeting_snapshot/migration.sql`
- Modify: `backend/src/modules/blue-bridge/fixer-workflow-bridge.service.ts`
- Modify: `backend/src/modules/blue-bridge/fixer-workflow-bridge.service.spec.ts`

**Interfaces:**
- Consumes: `FixerWorkflowActionDto.note`, `meetingDate`, `meetingTime`, `meetingVenue`.
- Produces: nullable `Order.meetingDate`, `Order.meetingTime`, `Order.meetingVenue`, `Order.meetingNote` fields updated in the same transaction as the Step 8 transition.

- [ ] **Step 1: Write the failing persistence test**

Add a focused test that submits `send-meeting-invitation` with exact values and expects `order.updateMany` data to contain:

```ts
meetingDate: '2026-07-18',
meetingTime: '14:30',
meetingVenue: '13.794095, 100.609583',
meetingNote: 'Please bring the site drawings.',
```

Also assert an empty/whitespace note becomes `null` and stale/forbidden transitions never call `updateMany`.

- [ ] **Step 2: Run the test and verify RED**

Run: `cd backend && npm test -- --runInBand src/modules/blue-bridge/fixer-workflow-bridge.service.spec.ts`

Expected: FAIL because the order update does not persist the meeting snapshot.

- [ ] **Step 3: Add schema and migration**

Add nullable strings to `Order`:

```prisma
meetingDate  String?
meetingTime  String?
meetingVenue String?
meetingNote  String?
```

Create an additive migration with four nullable `TEXT` columns. Do not backfill from descriptions or PO text.

- [ ] **Step 4: Implement the atomic update**

For `send-meeting-invitation`, extend the existing `order.updateMany` data with trimmed DTO values and `meetingNote: dto.note?.trim() || null`. Keep the action payload unchanged as the audit record.

- [ ] **Step 5: Verify GREEN and Prisma**

Run:

```bash
cd backend
npm test -- --runInBand src/modules/blue-bridge/fixer-workflow-bridge.service.spec.ts
npx prisma validate
```

Expected: all focused tests pass and Prisma schema validates.

- [ ] **Step 6: Commit**

```bash
git add backend/prisma/schema.prisma backend/prisma/migrations/20260718090000_add_fixer_meeting_snapshot/migration.sql backend/src/modules/blue-bridge/fixer-workflow-bridge.service.ts backend/src/modules/blue-bridge/fixer-workflow-bridge.service.spec.ts
git commit -m "Persist fixer meeting invitations"
```

### Task 2: Restore and Harden Workflow Activity Contracts

**Files:**
- Modify: `backend/src/modules/blue-bridge/blue-bridge.controller.ts`
- Modify: `backend/src/modules/blue-bridge/blue-bridge.service.ts`
- Modify: `backend/src/modules/blue-bridge/blue-bridge.controller.spec.ts`
- Create: `backend/src/modules/blue-bridge/blue-workflow-activities.service.spec.ts`
- Modify: `backend/src/modules/blue-bridge/blue-bridge.production-contract.spec.ts`

**Interfaces:**
- Consumes: persisted `Order` meeting fields, `Address.subdistrict`, workflow phase, lifecycle state, participant identity, chat messages, notifications.
- Produces: `/blue/workflow-activities`, chat bridge routes, and workflow detail/activity fields `meeting` and `siteSubdistrict`.

- [ ] **Step 1: Write failing detail and activity tests**

Tests must prove:

```ts
meeting: {
  date: '2026-07-18',
  time: '14:30',
  venue: '13.794095, 100.609583',
  note: 'Please bring the site drawings.',
},
siteSubdistrict: 'Saphan Song',
```

They must also prove description text and GPS values cannot populate or override either field. Add controller tests for `GET /api/v1/blue/workflow-activities` and the existing chat routes from commit `3770d54`.

- [ ] **Step 2: Run focused tests and verify RED**

Run:

```bash
cd backend
npm test -- --runInBand src/modules/blue-bridge/blue-bridge.controller.spec.ts src/modules/blue-bridge/blue-workflow-activities.service.spec.ts src/modules/blue-bridge/blue-bridge.production-contract.spec.ts
```

Expected: FAIL because current `main` lacks workflow activities and meeting/subdistrict response fields.

- [ ] **Step 3: Port the existing activity/chat bridge**

Use commit `3770d54` as the working reference, but adapt it to current `main` rather than replacing newer lifecycle, refresh-token, processing-fee, or chat-enabled behavior. Preserve bridge-key checks and participant visibility.

- [ ] **Step 4: Read authoritative meeting and subdistrict fields**

Create a helper that returns `null` when no persisted meeting exists and otherwise returns the four `Order` fields. Permit only persisted `FixerWorkflowAction.payload` as a legacy fallback for pre-migration invitations. Add `siteSubdistrict: String(order.address?.subdistrict || '').trim()` to detail and activity snapshots.

- [ ] **Step 5: Verify GREEN**

Run the focused command from Step 2. Expected: all suites pass.

- [ ] **Step 6: Commit**

```bash
git add backend/src/modules/blue-bridge
git commit -m "Expose authoritative fixer activity meetings"
```

### Task 3: Make Step 8 Placement Persona-Aware

**Files:**
- Modify: `backend/src/modules/blue-bridge/blue-bridge.service.ts`
- Modify: `backend/src/modules/blue-bridge/blue-workflow-activities.service.spec.ts`
- Modify: `backend/src/modules/blue-bridge/blue-bridge.production-contract.spec.ts`

**Interfaces:**
- Consumes: viewer identity and phase-owned action definitions.
- Produces: customer Step 8 active snapshot with secondary cancel capability and partner Step 8 request snapshot with primary confirmation action.

- [ ] **Step 1: Write failing persona tests**

For `MEETING_CONFIRM`:

```ts
// customer
activityBucket: 'active'
availableActions: ['customer-cancel']
nextActionKey: null
nextActionLabel: null
nextActionOwner: null
nextActionStep: null

// selected partner
activityBucket: 'request'
availableActions: ['confirm-meeting']
nextActionKey: 'confirm-meeting'
nextActionOwner: 'partner'
nextActionStep: 8
```

Also assert terminal workflows never enter requests, active jobs, or chat rooms.

- [ ] **Step 2: Run tests and verify RED**

Run the two modified suites. Expected: customer is incorrectly projected into requests or cancellation becomes the primary next action.

- [ ] **Step 3: Separate primary actions from secondary capabilities**

Calculate `nextAction*` from phase-owned actions only. Append `customer-cancel` to actor-visible `actions` and `availableActions` without promoting it to `nextAction*`. Project `MEETING_CONFIRM` into `active` for the customer and `request` for the selected partner.

- [ ] **Step 4: Verify GREEN and commit**

Run the focused tests, then commit:

```bash
git add backend/src/modules/blue-bridge/blue-bridge.service.ts backend/src/modules/blue-bridge/blue-workflow-activities.service.spec.ts backend/src/modules/blue-bridge/blue-bridge.production-contract.spec.ts
git commit -m "Project Step 8 activity by participant"
```

### Task 4: Render Persisted Meeting Details in the Partner Modal

**Files:**
- Create: `apps/web/lib/fixerMeetingSnapshot.js`
- Create: `apps/web/lib/fixerMeetingSnapshot.d.ts`
- Create: `apps/web/lib/fixerMeetingSnapshot.test.mjs`
- Modify: `apps/web/app/[locale]/fixers/page.tsx`

**Interfaces:**
- Consumes: server `meeting` object plus explicit scalar meeting fields for backward compatibility.
- Produces: `{ meetingDate, meetingTime, meetingVenue, meetingNote }` with server values taking precedence and no text/localStorage derivation.

- [ ] **Step 1: Write failing mapping tests**

Test exact server mapping, empty-state behavior, and resistance to conflicting description/localStorage-like input. Run:

```bash
node --test apps/web/lib/fixerMeetingSnapshot.test.mjs
```

Expected: FAIL because the helper does not exist.

- [ ] **Step 2: Implement the pure mapping helper**

Return trimmed persisted values only. Do not parse descriptions, notes embedded in status text, coordinates, or browser storage.

- [ ] **Step 3: Wire the partner modal**

Use the helper when constructing `waitModalMeetingDetails`. Render date, time, venue, and customer note as separate responsive rows using `grid grid-cols-[minmax(7rem,auto)_minmax(0,1fr)]`, `w-full`, `min-w-0`, `break-words`, and right-aligned values where appropriate. Do not change unrelated modal behavior.

- [ ] **Step 4: Verify frontend**

Run:

```bash
node --test apps/web/lib/fixerMeetingSnapshot.test.mjs
cd apps/web
npm run check-types
npm run build
```

Expected: helper tests, type-check, and production build pass.

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/fixerMeetingSnapshot.js apps/web/lib/fixerMeetingSnapshot.d.ts apps/web/lib/fixerMeetingSnapshot.test.mjs 'apps/web/app/[locale]/fixers/page.tsx'
git commit -m "Render persisted fixer meeting details"
```

### Task 5: Prove Terminal PRE Placement and Complete Verification

**Files:**
- Modify: `backend/src/modules/blue-bridge/property-workflow-bridge.terminal.spec.ts`
- Modify only if the test fails: `backend/src/modules/blue-bridge/property-workflow-bridge.service.ts`

**Interfaces:**
- Consumes: persisted property inquiry status, ratings, and workflow events.
- Produces: terminal `PRE-2605-5354` snapshot in history with no live actions.

- [ ] **Step 1: Add the PRE regression test**

Use reference `PRE-2605-5354` with terminal/cancelled/declined persisted state. Assert `activityBucket: 'history'`, no actions, and absence from any live collection helper used by CBLUE.

- [ ] **Step 2: Run the test and evaluate RED/GREEN**

Run:

```bash
cd backend
npm test -- --runInBand src/modules/blue-bridge/property-workflow-bridge.terminal.spec.ts
```

If it passes immediately, the requirement is already satisfied and no production property code changes are permitted. If it fails for the expected lifecycle reason, make only the minimal resolver correction and rerun.

- [ ] **Step 3: Run full verification**

Run:

```bash
cd backend
npx prisma validate
npm test -- --runInBand
npm run build
cd ../apps/web
node --test lib/fixerMeetingSnapshot.test.mjs lib/workflowVisibility.test.mjs
npm run check-types
npm run build
cd ../..
git diff --check
```

- [ ] **Step 4: Commit any test-only PRE evidence**

```bash
git add backend/src/modules/blue-bridge/property-workflow-bridge.terminal.spec.ts backend/src/modules/blue-bridge/property-workflow-bridge.service.ts
git commit -m "Verify terminal property workflow placement"
```

- [ ] **Step 5: Review, push, and deploy**

Generate a whole-branch review package from the merge base, resolve all Critical/Important findings, rerun full verification, push `HEAD` to `origin/main`, and monitor the backend and web GitHub Actions workflows through deployment. Production checks must report only sanitized status codes and response field names.
