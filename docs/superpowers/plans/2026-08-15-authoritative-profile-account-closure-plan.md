# Authoritative Profile and Account Closure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Secure CBLUE self-service account closure with password confirmation, unresolved-work gates, transactional privacy cleanup, and retained-record auditing while preserving the existing authoritative phone bridge.

**Architecture:** CBLUE remains authoritative for CBLUE profile data. Account closure is a rate-limited authenticated command whose password check precedes a Prisma transaction that rechecks business gates, revokes sessions, minimizes direct identity, schedules private evidence deletion, and records a detached compliance event. BLUE and LBLUE remain trusted consumers and are not edited here.

**Tech Stack:** NestJS 11, TypeScript, Prisma/PostgreSQL, bcrypt, Next.js, React, Node test runner, Jest.

## Global Constraints

- Edit CBLUE only.
- Do not modify registration, fixer onboarding/editing, property registration, or booking forms.
- Do not add mock frontend data or technical provider copy.
- Keep legal holds authoritative.
- Use test-first implementation and preserve existing cancellation and decline behavior.

---

### Task 1: Deletion lifecycle persistence

**Files:**
- Modify: `backend/prisma/schema.prisma`
- Create: `backend/prisma/migrations/20260815183000_add_account_deletion_lifecycle/migration.sql`
- Modify: `backend/src/modules/qualification/qualification-retention.worker.ts`
- Test: `backend/src/modules/qualification/qualification-retention.worker.spec.ts`

**Interfaces:**
- Produces: `User.deletedAt`, `User.deletionPolicyVersion`, and `AccountDeletionAudit` with `subjectHash`, policy timestamps, legal hold, and category-count JSON.

- [ ] Add a failing retention-worker test proving expired non-held deletion audits are removed and held audits remain.
- [ ] Run `npm test -- qualification-retention.worker.spec.ts --runInBand` and confirm failure because `accountDeletionAudit.deleteMany` is not called.
- [ ] Add the Prisma model, migration, and one retention-worker `deleteMany` operation guarded by `retentionDeleteAt` and `legalHoldUntil`.
- [ ] Generate Prisma types and rerun the focused test.

### Task 2: Password-confirmed closure command

**Files:**
- Create: `backend/src/modules/user/dto/close-account.dto.ts`
- Modify: `backend/src/modules/user/user.controller.ts`
- Modify: `backend/src/modules/user/user.service.ts`
- Test: `backend/src/modules/user/user.service.spec.ts`
- Test: `backend/src/modules/user/user.controller.spec.ts`

**Interfaces:**
- Consumes: authenticated `userId` and `{ currentPassword: string }`.
- Produces: `POST /api/v1/users/me/account-closure`, returning `{ success: true }` or typed 401/409 errors.

- [ ] Add failing service tests for wrong password, missing credential, active order, active inquiry, pending payment, resolved-history success, legal-hold preservation, PII cleanup, session revocation, detached audit data, and transaction rollback.
- [ ] Add a failing controller test proving a limit of three closure attempts per minute and delegation to the service.
- [ ] Run focused Jest tests and confirm failures are caused by the missing command.
- [ ] Implement `CloseAccountDto` with `@IsString`, `@IsNotEmpty`, and `@MinLength(8)`.
- [ ] Implement password verification with bcrypt, category-only conflict details, a preflight gate, and the same gate inside the transaction.
- [ ] In the transaction revoke refresh sessions; deactivate and minimize fixer/listing records; delete notifications, skills, availability, and unreferenced addresses; minimize referenced addresses; schedule non-held KYC documents; unlink and delete Subscriber; pseudonymize User; and create the detached audit.
- [ ] Keep `DELETE /users/me` non-operational by requiring the confirmed command, preventing old clients from bypassing password confirmation.
- [ ] Rerun focused tests until green.

### Task 3: Shared web account-closure dialog

**Files:**
- Create: `apps/web/app/[locale]/components/AccountClosureDialog.tsx`
- Create: `apps/web/lib/accountClosureUi.test.mjs`
- Modify: `apps/web/app/[locale]/dashboard/page.tsx`
- Modify: `apps/web/app/[locale]/fixers/page.tsx`

**Interfaces:**
- Consumes: locale, bearer token accessor, open state, and success callback.
- Produces: one accessible password-confirmation dialog shared by customer and partner profiles.

- [ ] Add failing static contract tests proving both profile pages import the shared dialog, no direct unconfirmed DELETE remains, and the dialog has password visibility, final confirmation, localized 401/409/429/503 handling, and success-only session clearing.
- [ ] Run `node --test lib/accountClosureUi.test.mjs` and confirm failure because the component is absent.
- [ ] Implement the dialog with full-width responsive rows, accessible labels, a familiar eye icon from the existing icon library or a text fallback already used by the application, and no technical implementation copy.
- [ ] Replace only the two profile deletion handlers with the shared dialog.
- [ ] Rerun the focused web test and TypeScript check.

### Task 4: Regression, review, and deployment

**Files:**
- Review all files changed by Tasks 1-3.

**Interfaces:**
- Produces: a clean CBLUE commit deployed through existing GitHub workflows.

- [ ] Run focused backend and web tests.
- [ ] Run backend build and full Jest suite.
- [ ] Run web TypeScript, production build, and relevant static regression tests, including registration and workflow contracts.
- [ ] Run `git diff --check` and confirm no registration, fixer registration/edit, property registration, booking form, cancellation, or decline implementation file changed.
- [ ] Review the diff for direct PII in audit data, partial-transaction risks, and incorrect legal-hold behavior.
- [ ] Commit only the scoped files and push to external `origin/main`.
- [ ] Monitor Backend CI/CD and Cloudflare deployment to terminal status.
- [ ] Provide separate BLUE and LBLUE prompts for consumer deployment, cache refresh, and local-session revocation.
