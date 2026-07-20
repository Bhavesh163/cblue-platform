# Authoritative Fixer Step 9 Projection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make CBLUE project one authoritative, non-duplicated Step 9 workflow across its bridge and customer/partner web pages while preserving terminal visibility and GPS subdistrict semantics.

**Architecture:** Extend the existing `FixerWorkflowAction` projection instead of adding another state store. Backend snapshots expose structured variation data and event alerts; the CBLUE web consumes server-owned actions and structured fields, while booking submissions resolve GPS address fields before sending the order payload.

**Tech Stack:** NestJS, Prisma/PostgreSQL, Next.js/React, Node test runner, Jest.

## Global Constraints

- Modify CBLUE only; do not edit BLUE or LBLUE.
- Do not infer workflow data from PO numbers, descriptions, modal text, chat text, or browser storage.
- Preserve cancellation, decline, forgot-password, and the eight-step property workflow.
- Never show cancelled, declined, finished, archived, or fully rated jobs in requests, active jobs, or chat rooms.

---

### Task 1: Structured Step 9 Bridge Projection

**Files:**
- Modify: `backend/src/modules/blue-bridge/blue-bridge.service.ts`
- Test: `backend/src/modules/blue-bridge/blue-workflow-activities.service.spec.ts`
- Test: `backend/src/modules/blue-bridge/blue-bridge.production-contract.spec.ts`

**Interfaces:**
- Produces: `variation: { note: string; items: Array<{ service; quantity; unit; unitRate; total }>; total: number; createdAt: string; actorRole: "partner" } | null`
- Produces: persisted `send-variation` event alerts tailored to the requested persona.

- [ ] Write failing tests proving customer and partner snapshots receive the same structured persisted variation and persona-appropriate alert.
- [ ] Run focused Jest tests and confirm failures because `variation` and `send-variation` alerts are absent.
- [ ] Project the latest persisted `send-variation` payload without parsing its note.
- [ ] Generate event alerts from persisted action timestamps and rerun focused tests to green.

### Task 2: Authoritative CBLUE Step 9 UI

**Files:**
- Modify: `apps/web/lib/fixerWorkflowUiProjection.js`
- Modify: `apps/web/lib/fixerWorkflowUiProjection.d.ts`
- Modify: `apps/web/app/[locale]/dashboard/page.tsx`
- Modify: `apps/web/app/[locale]/fixers/page.tsx`
- Test: `apps/web/lib/fixerWorkflowUiProjection.authoritative.test.mjs`
- Test: `apps/web/lib/fixerWorkflowPageIntegration.test.mjs`

**Interfaces:**
- Consumes: backend `variation`, `actions`, `siteSubdistrict`, participant identities, and service title.
- Produces: one customer approval presentation and action-owner-gated partner controls.

- [ ] Write failing tests proving VARIATION_CONFIRM has no partner submit control, renders one structured variation list, omits meeting details, and excludes legacy completed jobs.
- [ ] Run focused Node tests and confirm the expected failures.
- [ ] Project Step 9 request data from `variation` and server-owned actions.
- [ ] Remove the Step 9 meeting block and localStorage/text-derived duplicate price-list path.
- [ ] Gate partner buttons by the exact partner-owned action key and rerun focused tests to green.

### Task 3: Submit-Time GPS Subdistrict Persistence

**Files:**
- Modify: `apps/web/app/[locale]/lib/gps-location-normalization.ts`
- Modify: `apps/web/app/[locale]/booking/household/page.tsx`
- Modify: `apps/web/app/[locale]/booking/project/page.tsx`
- Modify: `apps/web/app/[locale]/booking/professional/page.tsx`
- Test: `apps/web/app/[locale]/lib/gps-location-normalization.test.mjs`
- Test: `apps/web/lib/fixerWorkflowPageIntegration.test.mjs`

**Interfaces:**
- Consumes: selected `{ lat, lng }`.
- Produces: an address payload containing coordinates plus the resolved province, district, subdistrict, and postal code when resolution succeeds.

- [ ] Write failing tests proving submission waits for GPS normalization and uses the returned subdistrict in all three forms.
- [ ] Run focused tests and confirm they fail on the current state-timing implementation.
- [ ] Add a shared submit-time address resolver and call it before constructing each booking payload.
- [ ] Preserve coordinates when resolution fails, never invent a subdistrict, and rerun focused tests to green.

### Task 4: Verification And Deployment

**Files:**
- Verify all files modified in Tasks 1-3.

- [ ] Run focused backend and web regression tests.
- [ ] Run the complete backend test suite and backend build.
- [ ] Run web tests, type-check, and production build.
- [ ] Run `git diff --check` and inspect the scoped diff.
- [ ] Commit the focused CBLUE changes, push `HEAD` to `main`, monitor backend and web deployment workflows, and perform sanitized production route checks.
