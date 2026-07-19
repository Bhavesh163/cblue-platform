# Step 8 Web Projection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Correct CBLUE Step 8 partner meeting projection, customer alert precedence, and summary-card location display without changing BLUE/LBLUE or modal GPS behavior.

**Architecture:** Add small pure projection helpers for authoritative meeting reconciliation, workflow-stage alert precedence, and split card/modal locations. Integrate them into the existing large customer and partner pages while retaining the current API and local-storage compatibility boundaries.

**Tech Stack:** Next.js/React, JavaScript/TypeScript, Node test runner, existing CBLUE workflow projection helpers.

## Global Constraints

- Modify CBLUE only.
- Do not parse authoritative meeting data or state from text, PO numbers, or browser storage.
- Preserve cancellation, decline, property workflow, forgot password, and BLUE bridge behavior.
- Keep terminal jobs out of requests, active jobs, and chat.

---

### Task 1: Authoritative Partner Meeting Reconciliation

**Files:**
- Modify: `apps/web/lib/fixerWorkflowUiProjection.js`
- Modify: `apps/web/lib/fixerWorkflowUiProjection.test.mjs`
- Modify: `apps/web/app/[locale]/fixers/page.tsx`

**Interfaces:**
- Produces: `reconcilePartnerMeetingRequest(cachedRequest, backendOrder)` returning a Step 8 request whose meeting/action fields come from the backend order.
- Consumes: existing `projectPartnerMeetingConfirmation(order)` and PO identity fields.

- [ ] Write a failing test with a stale cached Step 8 row and an authoritative backend order.
- [ ] Run `node --test apps/web/lib/fixerWorkflowUiProjection.test.mjs` and confirm the new assertion fails because the helper is missing.
- [ ] Implement the minimal reconciliation helper and use it when syncing/merging partner Step 8 requests.
- [ ] Run the focused test and confirm it passes.

### Task 2: Workflow-Stage Alert Precedence

**Files:**
- Modify: `apps/web/lib/fixerWorkflowUiProjection.js`
- Modify: `apps/web/lib/fixerWorkflowUiProjection.test.mjs`
- Modify: `apps/web/app/[locale]/dashboard/page.tsx`

**Interfaces:**
- Produces: alert objects with `po` and numeric `workflowStage`; `mergeAuthoritativeWorkflowAlerts(alerts)` suppresses lower-stage same-PO alerts.
- Consumes: current authoritative meeting alert builder and stored local alert rows.

- [ ] Write failing tests proving a Step 8 meeting alert removes legacy payment/chat alerts for the same PO and does not rewrite old timestamps.
- [ ] Run the focused test and confirm the assertions fail for the current ID-only merge.
- [ ] Add explicit PO/stage metadata, remove payment-alert retimestamping, and implement same-PO stage precedence.
- [ ] Run the focused test and confirm it passes.

### Task 3: Split Card And Modal Locations

**Files:**
- Modify: `apps/web/lib/fixerWorkflowUiProjection.js`
- Modify: `apps/web/lib/fixerWorkflowUiProjection.test.mjs`
- Modify: `apps/web/app/[locale]/dashboard/page.tsx`
- Modify: `apps/web/app/[locale]/fixers/page.tsx`

**Interfaces:**
- Produces: `projectFixerLocations(order)` returning `{ projectLocation, siteSubdistrict, cardLocation }`.
- Consumers: customer and partner mappers and card renderers.

- [ ] Write a failing test with GPS and a persisted subdistrict and assert separate modal/card outputs.
- [ ] Run the focused test and confirm the helper is missing.
- [ ] Implement the projection helper, map both locations, and update only Requests/Active/Overview card renderers to prefer `cardLocation`.
- [ ] Run the focused test and confirm it passes.

### Task 4: Verification, Commit, Push, And Deploy

**Files:**
- Verify all modified files and documentation.

**Interfaces:**
- Consumes: existing CBLUE web build and deployment workflow.
- Produces: tested commit and deployed production bundle.

- [ ] Run focused workflow projection tests.
- [ ] Run `npm run check-types` and `npm run build` in `apps/web`.
- [ ] Run `git diff --check` and inspect the scoped diff.
- [ ] Commit the implementation and documentation with a focused message.
- [ ] Push the CBLUE branch/main through the repository's existing process and monitor deployment checks.
- [ ] Verify the deployed CBLUE customer/partner UI or sanitized server response for `PO-2607-9458`, including meeting fields, current alert, and card/modal locations.
