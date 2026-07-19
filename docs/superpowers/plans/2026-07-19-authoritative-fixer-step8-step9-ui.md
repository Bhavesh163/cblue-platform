# Authoritative Fixer Step 8/9 UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make CBLUE customer and partner views use persisted fixer workflow state for meeting confirmation, Step 9 ownership, alerts, chat visibility, and history without browser-created workflow data.

**Architecture:** The backend remains the sole workflow authority. Order collection responses will expose the same viewer-filtered snapshot used by the BLUE bridge. The web pages will reconcile from those snapshots and invoke the authoritative action endpoint, while pure projection helpers keep request, active, chat, alert, history, and upcoming-meeting placement consistent.

**Constraints:** CBLUE only. Preserve property workflow, cancellation, decline, forgot password, matching, and budget behavior. Never derive workflow state or event timestamps from UI text, descriptions, PO numbers, browser storage, or the current time.

## Task 1: Expose authoritative snapshots in CBLUE order collections

**Files:**
- Modify: `backend/src/modules/order/order.service.ts`
- Modify: `backend/src/modules/order/order.service.spec.ts`

- [ ] Add failing tests for partner `MEETING_CONFIRM` with `confirm-meeting`, partner `VARIATION` with send/skip variation, customer `VARIATION` with no partner-owned action, and terminal history with disabled live chat.
- [ ] Reuse `resolvePersistedFixerWorkflowSnapshot` so `/orders/my` and `/orders/fixer` return viewer-filtered `currentStep`, `activityBucket`, `actions`, next-action fields, meeting data, and persisted `workflowEvents`.
- [ ] Include bounded persisted chat messages needed for read-only History, without exposing unrelated participants.
- [ ] Run the focused order and BLUE bridge tests, then backend build.

## Task 2: Add pure workflow client and projection helpers

**Files:**
- Create: `apps/web/lib/fixerWorkflowClient.js`
- Create: `apps/web/lib/fixerWorkflowClient.d.ts`
- Create: `apps/web/lib/fixerWorkflowClient.test.mjs`
- Modify: `apps/web/lib/fixerWorkflowUiProjection.js`
- Modify: `apps/web/lib/fixerWorkflowUiProjection.d.ts`
- Modify: `apps/web/lib/fixerWorkflowUiProjection.test.mjs`

- [ ] Add failing tests for an authenticated, idempotent `confirm-meeting` POST and error handling.
- [ ] Add failing projection tests for Step 8 partner ownership, Step 9 partner variation ownership, customer Step 9 active placement, terminal chat-to-history placement, authoritative chat titles, and future confirmed meetings sorted oldest-first with a limit of three.
- [ ] Implement `postFixerWorkflowAction`, `projectPartnerWorkflowRequest`, `projectWorkflowChatHistory`, and `projectUpcomingFixerMeetings` as pure, server-snapshot-driven helpers.
- [ ] Run the focused web helper tests.

## Task 3: Replace partner Step 8 browser fabrication

**Files:**
- Modify: `apps/web/app/[locale]/fixers/page.tsx`
- Modify: `apps/web/app/[locale]/fixers/page.integration.test.mjs`

- [ ] Add a failing integration assertion that meeting confirmation uses the authoritative action client and does not mutate legacy order status/chat or create `Date.now()` workflow events.
- [ ] Hydrate the selected PO from the latest server collection before opening the Step 8 modal so venue, date, time, and note are always present.
- [ ] Await `POST /blue/workflow-details/:poNumber/actions/confirm-meeting`, apply its returned snapshot, then refresh collections.
- [ ] Build partner Requests from viewer-owned snapshot actions so successful confirmation removes Step 8 and exposes Step 9 variation.
- [ ] Render the persisted meeting fields in the confirmation modal and keep wide, wrapping rows.
- [ ] Run the partner page integration test and web typecheck.

## Task 4: Reconcile customer, alerts, chat, history, and meetings

**Files:**
- Modify: `apps/web/app/[locale]/dashboard/page.tsx`
- Modify: `apps/web/app/[locale]/fixers/page.tsx`
- Modify: `apps/web/app/[locale]/chat/[id]/ClientChatPage.tsx`
- Modify: related focused `*.test.mjs` files under `apps/web`

- [ ] Add failing tests proving the persisted `confirm-meeting` event creates the current alert for both participants and suppresses the stale accepted/free-pass alert.
- [ ] Add failing tests proving customer Step 9 remains active without a Step 7/8 request, while the partner receives the Step 9 variation request.
- [ ] Remove the fabricated `Chat - PO-...` title and default mock message; render the authoritative service, PO, and budget title.
- [ ] Exclude terminal workflows from live chat and preserve persisted messages as read-only History content.
- [ ] Project upcoming meetings only from persisted confirmed meetings, future first, oldest-first, maximum three.
- [ ] Run focused page tests, web typecheck, and web build.

## Task 5: Verify, publish, and deploy

- [ ] Run focused backend suites for order and BLUE bridge workflow behavior.
- [ ] Run focused web projection, client, visibility, and page integration tests.
- [ ] Run backend build, web typecheck/build, and `git diff --check`.
- [ ] Review the final diff to confirm only CBLUE fixer workflow files changed and no unrelated dirty files entered the commit.
- [ ] Commit the implementation, rebase or fast-forward against current `origin/main`, and push CBLUE `main`.
- [ ] Watch the backend and Cloudflare/web deployment workflows to completion.
- [ ] Verify sanitized production customer and partner snapshots for `PO-2607-9458`: persisted meeting details, partner Step 9 variation action, customer active Step 9, persisted meeting-confirmed alert/event, authoritative chat title, and no terminal live chat records.
