# Step 8 Web Authoritative Repair Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make CBLUE customer and partner pages project the persisted fixer workflow state consistently for Step 8 meetings, alerts, chat titles, terminal chat visibility, fixer profile loading, and attachments.

**Architecture:** Keep the existing authenticated CBLUE order APIs and create pure web projection helpers that merge duplicate PO records with the current backend order as authoritative. Both customer and partner pages will use the same lifecycle, meeting, alert, and chat-room projection rules; the API proxy will add narrowly scoped read-only fallbacks for upstream 5xx responses.

**Tech Stack:** Next.js/React, JavaScript projection helpers, Node test runner, NestJS/Prisma, Cloudflare Workers/OpenNext.

## Global Constraints

- Edit only CBLUE; do not edit BLUE or LBLUE.
- Preserve cancel, decline, forgot-password, and property workflow behavior.
- Do not fabricate frontend data or derive meeting/lifecycle state from PO numbers, UI text, or browser storage.
- Finished, cancelled, declined, archived, and rated workflows must not appear in Requests, Active Jobs, or Chat.
- Keep persisted chat messages available through History.

---

### Task 1: Authoritative fixer UI projection

**Files:**
- Modify: `apps/web/lib/fixerWorkflowUiProjection.js`
- Modify: `apps/web/lib/fixerWorkflowUiProjection.d.ts`
- Test: `apps/web/lib/fixerWorkflowUiProjection.test.mjs`

**Interfaces:**
- Produces: `mergeFixerWorkflowRecord(cachedRecord, backendOrder)`, `projectFixerChatRoom(order, messages)`, and `projectCustomerWorkflowAlert(order)`.
- Consumes: persisted order fields including meeting, lifecycle/status, service, budget, and workflow timestamps.

- [ ] **Step 1: Write failing tests** for backend meeting precedence, meeting-state customer alert, server-owned chat title, and terminal chat exclusion.
- [ ] **Step 2: Run `node --test apps/web/lib/fixerWorkflowUiProjection.test.mjs` and verify expected failures.**
- [ ] **Step 3: Implement the minimal pure projection helpers.**
- [ ] **Step 4: Re-run the focused test and verify it passes.**

### Task 2: Partner Step 8 modal and chat feed

**Files:**
- Modify: `apps/web/app/[locale]/fixers/page.tsx`
- Test: `apps/web/lib/fixerWorkflowPageIntegration.test.mjs`

**Interfaces:**
- Consumes: Task 1 projection helpers.
- Produces: authoritative modal hydration and live-only partner chat rows named `SERVICE - PO - CURRENCY_BUDGET`.

- [ ] **Step 1: Add failing source-integration assertions** proving modal clicks rehydrate by PO and partner chat rows use the server projection.
- [ ] **Step 2: Run the integration test and verify expected failures.**
- [ ] **Step 3: Rehydrate clicked requests from `mappedOrders`, preserve meeting fields during PO deduplication, and project chat rows only from non-terminal server orders.**
- [ ] **Step 4: Re-run focused projection and integration tests.**

### Task 3: Customer alert and terminal chat projection

**Files:**
- Modify: `apps/web/app/[locale]/dashboard/page.tsx`
- Test: `apps/web/lib/fixerWorkflowPageIntegration.test.mjs`

**Interfaces:**
- Consumes: Task 1 alert/chat projection helpers.
- Produces: current Step 8 alert for the customer and removal of terminal rooms from the live Chat feed while History remains unchanged.

- [ ] **Step 1: Add failing integration assertions** for authoritative customer alerts and terminal chat filtering.
- [ ] **Step 2: Run the integration test and verify expected failures.**
- [ ] **Step 3: Replace stale browser-first alert/chat composition with shared server-order projections.**
- [ ] **Step 4: Re-run focused tests.**

### Task 4: Read-only API proxy resilience

**Files:**
- Modify: `apps/web/app/api/v1/[...path]/route.ts`
- Test: `apps/web/lib/apiProxyFallback.test.mjs`

**Interfaces:**
- Produces: nullable fixer-profile fallback for `GET fixers/me` and empty attachment-list fallback for `GET orders/:id/attachments` only when the upstream returns 5xx or is unreachable.

- [ ] **Step 1: Add failing route-classification tests** for both safe GET fallbacks and negative cases.
- [ ] **Step 2: Run the focused proxy test and verify expected failures.**
- [ ] **Step 3: Implement the two narrow fallback classifiers and responses.**
- [ ] **Step 4: Re-run the proxy test.**

### Task 5: Verification and deployment

**Files:**
- Verify only; no unrelated modifications.

- [ ] **Step 1: Run focused Node tests, web type checking, web build, backend order tests/build, and `git diff --check`.**
- [ ] **Step 2: Review the diff for CBLUE-only scope and no secret/token output.**
- [ ] **Step 3: Commit the approved files with a focused message and push the branch/main integration used by the repository.**
- [ ] **Step 4: Deploy through the existing GitHub Actions workflows and verify successful web/backend deployment.**
- [ ] **Step 5: Probe public production assets/routes and report deployment commit plus any authenticated live verification limitation without exposing credentials.**
