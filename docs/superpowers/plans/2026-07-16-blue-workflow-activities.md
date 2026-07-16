# BLUE Workflow Activities Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add authoritative CBLUE bridge discovery, chat, and meeting data for BLUE's 11-step fixer workflow.

**Architecture:** Extend `BlueBridgeService` with actor-scoped order discovery and PO-scoped chat helpers. Responses use only persisted `Order`, `FixerWorkflowAction`, `OrderChatMessage`, and notification rows plus the existing persisted fixer snapshot.

**Tech Stack:** NestJS, Prisma, PostgreSQL, Jest, Supertest.

## Global Constraints

- Edit CBLUE only; do not edit BLUE or LBLUE.
- Require `x-blue-bridge-key` and resolve identity solely from `legacySubjectId`.
- Do not use browser state, localStorage, PO/title/description parsing, price estimates, `/orders/my`, or `/orders/fixer`.
- Preserve existing cancel, decline, property workflow, password reset, and bridge contracts.

---

### Task 1: Actor-scoped workflow activity

**Files:** `backend/src/modules/blue-bridge/blue-bridge.service.ts`, `backend/src/modules/blue-bridge/blue-bridge.controller.ts`, `backend/src/modules/blue-bridge/blue-bridge.service.spec.ts`, `backend/src/modules/blue-bridge/blue-bridge.controller.spec.ts`.

- [ ] Write failing service tests for customer and partner views of PO-2607-8879, enabled chat, terminal history, and rejected bridge key/persona.
- [ ] Run `cd backend && npm test -- --runInBand src/modules/blue-bridge/blue-bridge.service.spec.ts`; expect missing `workflowActivities`.
- [ ] Implement `workflowActivities({ legacySubjectId, persona, bridgeKey })` using `resolveLinkedUserIds`, persisted customer/fixer relations, `resolvePersistedFixerWorkflowSnapshot`, notifications, `OrderChatMessage`, and persisted meeting action payloads.
- [ ] Add `GET /blue/workflow-activities` controller wiring and verify bridge key forwarding.
- [ ] Run focused service/controller tests; expect pass.

### Task 2: Bridge chat by PO

**Files:** `backend/src/modules/blue-bridge/dto/blue-bridge-chat-message.dto.ts`, `backend/src/modules/blue-bridge/blue-bridge.service.ts`, `backend/src/modules/blue-bridge/blue-bridge.controller.ts`, matching service/controller tests.

- [ ] Write failing tests: Ghis reads/posts a persisted message on PO-2607-8879, Bhavesh reads the same item, and an unlinked actor is denied.
- [ ] Run focused tests; expect missing bridge chat methods.
- [ ] Implement `workflowChat` and `postWorkflowChat` with bridge-key validation, visible actor resolution, `Order.chatEnabled` enforcement, validated non-empty text, and persisted `OrderChatMessage` rows.
- [ ] Add `GET` and `POST /blue/workflow-details/:poNumber/chat` routes and DTO validation.
- [ ] Run focused tests; expect pass.

### Task 3: Exact persisted meeting projection

**Files:** `backend/src/modules/blue-bridge/blue-bridge.service.ts`, `backend/src/modules/blue-bridge/blue-bridge.production-contract.spec.ts`, `backend/src/modules/blue-bridge/fixer-workflow-bridge.service.spec.ts`.

- [ ] Write a failing test that a persisted `send-meeting-invitation` payload exposes exact date, time, and venue to Bhavesh in both workflow detail and activities.
- [ ] Run the production-contract test; expect missing `meeting` projection.
- [ ] Implement a payload reader for the latest persisted `send-meeting-invitation` action; never inspect title, description, PO, or browser state.
- [ ] Run action and production-contract tests; expect pass.

### Task 4: Verification and deployment

- [ ] Run `cd backend && npm test -- --runInBand src/modules/blue-bridge`.
- [ ] Run `cd backend && npm run build && cd .. && git diff --check`.
- [ ] Commit only bridge files and these design/plan documents.
- [ ] Push the isolated branch fast-forward to `main`, wait for backend and web deployments, then call the bridge endpoint with sanitized Ghis and Bhavesh responses for PO-2607-8879.
