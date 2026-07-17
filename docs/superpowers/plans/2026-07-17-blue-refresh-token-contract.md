# BLUE Refresh Token Contract Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add persisted, rotating CBLUE refresh sessions for first-party login and BLUE OAuth delegation, expose authoritative expiry and processing-fee fields, and preserve lifecycle and participant authorization.

**Architecture:** A focused `RefreshSessionService` owns opaque token creation, hashing, transactional rotation, replay-family revocation, expiry, and logout. Existing Auth, Subscription, and OAuth services issue their own correctly shaped access tokens while delegating refresh persistence to this shared service. Fixer workflow snapshots obtain a server-configured processing fee from `ConfigService`; existing persisted lifecycle resolution remains the only activity-bucket source.

**Tech Stack:** NestJS, TypeScript, Prisma/PostgreSQL, `crypto`, `@nestjs/jwt`, class-validator, Jest, GitHub Actions, DigitalOcean Docker deployment.

## Global Constraints

- Edit only the CBLUE repository; do not edit BLUE or LBLUE.
- Do not use `x-blue-bridge-key` as user authorization.
- Do not log raw tokens, token hashes, passwords, client secrets, or authorization headers.
- Preserve existing customer/partner workflow action ownership.
- Preserve working cancellation, decline, property workflow, and forgot-password behavior.
- Terminal fixer jobs must remain out of requests, active jobs, and chat rooms.

---

### Task 1: Persist Opaque Refresh Sessions

**Files:**
- Modify: `backend/prisma/schema.prisma`
- Create: `backend/prisma/migrations/20260717090000_add_refresh_sessions/migration.sql`
- Create: `backend/src/modules/auth/refresh-session.service.ts`
- Create: `backend/src/modules/auth/refresh-session.service.spec.ts`
- Modify: `backend/src/modules/auth/auth.module.ts`

**Interfaces:**
- Produces: `RefreshSessionService.issue(input): Promise<IssuedRefreshToken>`
- Produces: `RefreshSessionService.rotate(input): Promise<RotatedRefreshToken>`
- Produces: `RefreshSessionService.revokeFamily(refreshToken, reason): Promise<void>`
- `IssuedRefreshToken` contains raw `refreshToken` only in the immediate return value and `refreshTokenExpiresAt`; persistence stores only `tokenHash`.

- [ ] **Step 1: Write failing persistence and service tests**

Add tests that wish for these calls:

```ts
const issued = await service.issue({
  userId: 'user-1',
  clientId: 'blue-client',
  audience: 'CBLUE',
});
expect(issued.refreshToken).toBeTruthy();
expect(prisma.refreshSession.create).toHaveBeenCalledWith({
  data: expect.objectContaining({
    userId: 'user-1',
    clientId: 'blue-client',
    audience: 'CBLUE',
    tokenHash: expect.not.stringContaining(issued.refreshToken),
  }),
});
```

Cover successful one-time rotation, expiry rejection, replay revoking all rows with the same `familyId`, wrong client/audience rejection, inactive user rejection, concurrent conditional-update loss, and idempotent logout revocation.

- [ ] **Step 2: Run the new test and verify RED**

Run: `cd backend && npm test -- --runInBand src/modules/auth/refresh-session.service.spec.ts`

Expected: FAIL because `RefreshSessionService` and `refreshSession` Prisma model do not exist.

- [ ] **Step 3: Add the Prisma model and migration**

Add `User.refreshSessions RefreshSession[]` and a `RefreshSession` model with `tokenHash @unique`, indexed `userId`, `familyId`, `clientId`, and `expiresAt`, plus rotation/revocation fields from the design. The SQL migration creates the table, foreign key with cascade on user deletion, and matching indexes without modifying existing rows.

- [ ] **Step 4: Implement minimal opaque-token rotation**

Use `randomBytes(48).toString('base64url')`, `createHash('sha256')`, UUID family ids, configured refresh TTL parsed with `ms`, and Prisma transactions. Rotation must conditionally mark only an unrotated/unrevoked row; a zero-row update is replay and revokes the family before throwing `UnauthorizedException('Invalid refresh token')`.

- [ ] **Step 5: Export the service and verify GREEN**

Add `RefreshSessionService` to `AuthModule.providers` and `exports`, then run:

`cd backend && npx prisma generate --schema=prisma/schema.prisma && npm test -- --runInBand src/modules/auth/refresh-session.service.spec.ts`

Expected: PASS.

- [ ] **Step 6: Commit Task 1**

```bash
git add backend/prisma backend/src/modules/auth/refresh-session.service.ts backend/src/modules/auth/refresh-session.service.spec.ts backend/src/modules/auth/auth.module.ts
git commit -m "Add rotating refresh session store"
```

### Task 2: Upgrade CBLUE Login, Refresh, Logout, and Legacy Session Safety

**Files:**
- Modify: `backend/src/config/configuration.ts`
- Modify: `backend/src/modules/auth/auth.service.ts`
- Modify: `backend/src/modules/auth/auth.service.spec.ts`
- Modify: `backend/src/modules/auth/auth.controller.ts`
- Create: `backend/src/modules/auth/dto/logout.dto.ts`
- Modify: `backend/src/modules/subscription/subscription.module.ts`
- Modify: `backend/src/modules/subscription/subscription.service.ts`
- Modify: `backend/src/modules/subscription/subscription.service.spec.ts`
- Modify: `backend/src/modules/subscription/subscription.controller.ts`

**Interfaces:**
- CBLUE token bundle: `{ accessToken, refreshToken, accessTokenExpiresAt, refreshTokenExpiresAt, tokenType: 'Bearer' }`.
- `POST /api/v1/auth/refresh` consumes `RefreshTokenDto` and returns a rotated token bundle.
- `POST /api/v1/auth/logout` consumes `LogoutDto` and returns HTTP 204.
- Legacy `POST /api/v1/subscription/refresh-session` accepts only a currently valid access token.

- [ ] **Step 1: Add failing Auth tests**

Assert OTP/admin OTP responses contain both tokens and both ISO expiry fields; refresh rotates through `RefreshSessionService`; logout revokes the family; and refreshed access claims use the database user's current `sub`, role, phone, and email rather than claims supplied by the refresh token.

- [ ] **Step 2: Add failing Subscription tests**

Assert register/login return the complete token bundle. Replace the old test that permits expired access-token sliding refresh with a test expecting `UnauthorizedException`, while preserving a valid-token compatibility test.

- [ ] **Step 3: Run focused tests and verify RED**

Run:

`cd backend && npm test -- --runInBand src/modules/auth/auth.service.spec.ts src/modules/subscription/subscription.service.spec.ts`

Expected: FAIL on missing refresh metadata/service calls and expired-token rejection.

- [ ] **Step 4: Implement first-party issuance and endpoints**

Add configuration keys `auth.firstPartyClientId` defaulting to `cblue-web` and `auth.firstPartyAudience` defaulting to `CBLUE`. Sign short-lived access JWTs, compute `accessTokenExpiresAt` from the configured TTL, and obtain refresh values from `RefreshSessionService`. Implement `AuthService.refreshToken`, `AuthService.logout`, and controller routes.

- [ ] **Step 5: Integrate SubscriptionService**

Import `AuthModule`, inject `RefreshSessionService`, and return its token bundle from registration/login. Verify legacy bearer refresh with `ignoreExpiration: false`; keep its subscriber response but never create a refresh session from an expired access token.

- [ ] **Step 6: Verify GREEN and commit Task 2**

Run the two focused suites, then:

```bash
git add backend/src/config backend/src/modules/auth backend/src/modules/subscription
git commit -m "Rotate CBLUE login refresh tokens"
```

### Task 3: Extend OAuth Token Exchange With Client-Bound Refresh Grant

**Files:**
- Modify: `backend/src/modules/oauth/dto/token-exchange.dto.ts`
- Modify: `backend/src/modules/oauth/oauth.module.ts`
- Modify: `backend/src/modules/oauth/oauth.controller.ts`
- Modify: `backend/src/modules/oauth/oauth.controller.spec.ts`
- Modify: `backend/src/modules/oauth/oauth.service.ts`
- Modify: `backend/src/modules/oauth/oauth.service.spec.ts`

**Interfaces:**
- RFC 8693 exchange remains `OauthService.exchangeToken(dto)`.
- New `OauthService.token(dto)` dispatches by `grant_type`.
- New OAuth refresh input uses `grant_type=refresh_token`, `refresh_token`, authenticated `client_id`, and optional audience that must equal the session audience.

- [ ] **Step 1: Write failing OAuth refresh tests**

Cover RFC 8693 `offline_access` creating a persisted client/audience-bound refresh token; successful rotation; Basic and POST client credentials; expiry; replay; invalid client; wrong audience; inactive user; capability preservation; and no bridge-key parameter.

- [ ] **Step 2: Run OAuth suites and verify RED**

Run:

`cd backend && npm test -- --runInBand src/modules/oauth/oauth.service.spec.ts src/modules/oauth/oauth.controller.spec.ts`

Expected: FAIL because the DTO and service only support RFC 8693 subject exchange and JWT refresh output.

- [ ] **Step 3: Implement grant dispatch and standard OAuth output**

Make subject-token fields optional at DTO validation level and validate required fields by grant. Inject `RefreshSessionService` through `AuthModule`. For `offline_access`, call `issue`; for refresh grant, call `rotate` with the validated BLUE client. Return `access_token`, `refresh_token`, `token_type`, `expires_in`, `access_token_expires_at`, and `refresh_token_expires_at` without logging token material.

- [ ] **Step 4: Preserve subject mapping and capabilities**

Re-fetch the rotated session's active user with fixer relation before signing. Use the existing `capabilitiesFor` and CBLUE access-token signer so refresh cannot elevate role or switch subject.

- [ ] **Step 5: Verify GREEN and commit Task 3**

Run the OAuth suites, then:

```bash
git add backend/src/modules/oauth
git commit -m "Add BLUE OAuth refresh grant"
```

### Task 4: Add Authoritative Processing Fee and Reconfirm Workflow Security

**Files:**
- Modify: `backend/src/config/configuration.ts`
- Modify: `backend/src/modules/blue-bridge/blue-bridge.service.ts`
- Modify: `backend/src/modules/blue-bridge/blue-bridge.production-contract.spec.ts`
- Modify: `backend/src/modules/blue-bridge/fixer-workflow-bridge.service.spec.ts`
- Modify: `backend/src/modules/blue-bridge/blue-workflow-activities.service.spec.ts`

**Interfaces:**
- Every fixer snapshot exposes `processingFee: { amount: number; currency: string; displayLabel: string }`.
- Step 6 action responses inherit the same snapshot through `authenticatedWorkflowDetails`.

- [ ] **Step 1: Write failing fee and authorization tests**

Add a Step 6 workflow-details assertion for exactly `{ amount: 100, currency: 'THB', displayLabel: '฿100' }`. Add action-response coverage after `fee-proceed` and `free-pass`. Keep separate tests proving a customer cannot invoke partner actions and a partner cannot invoke customer actions.

- [ ] **Step 2: Add failing universal lifecycle tests**

For both customer and partner personas, assert cancelled, declined, archived, fully rated, and legacy completed records have no live bucket or chat-room membership, occur at most once by PO, and appear only in history when retained.

- [ ] **Step 3: Run bridge suites and verify RED**

Run:

`cd backend && npm test -- --runInBand src/modules/blue-bridge/blue-bridge.production-contract.spec.ts src/modules/blue-bridge/fixer-workflow-bridge.service.spec.ts src/modules/blue-bridge/blue-workflow-activities.service.spec.ts`

Expected: fee assertions FAIL; existing lifecycle and ownership assertions remain green.

- [ ] **Step 4: Implement configured processing fee**

Add `processingFee.amount` from `CBLUE_PROCESSING_FEE_AMOUNT` with default `100` and `processingFee.currency` from `CBLUE_PROCESSING_FEE_CURRENCY` with default `THB`. Build the display label server-side and inject the object into every persisted fixer snapshot and action response.

- [ ] **Step 5: Verify GREEN and commit Task 4**

Run the bridge suites, then:

```bash
git add backend/src/config/configuration.ts backend/src/modules/blue-bridge
git commit -m "Expose authoritative fixer processing fee"
```

### Task 5: Full Verification, Deployment, and Sanitized Production Checks

**Files:**
- Verify all changed CBLUE files.
- Do not modify BLUE or LBLUE.

**Interfaces:**
- Production login fields and OAuth discovery/token grants.
- Production Step 6 processing fee.
- Production activity bucket counts and terminal exclusions.

- [ ] **Step 1: Validate schema and migration**

Run:

```bash
cd backend
npx prisma generate --schema=prisma/schema.prisma
npx prisma validate --schema=prisma/schema.prisma
```

Expected: generated client and valid schema.

- [ ] **Step 2: Run complete verification**

Run:

```bash
cd backend
npm test -- --runInBand
npm run build
cd ..
git diff --check
git status --short
```

Expected: all suites pass, build exits zero, no whitespace errors, and only scoped CBLUE files are changed.

- [ ] **Step 3: Review security invariants**

Confirm by diff and tests that raw tokens are returned only to the caller, token hashes never enter responses/logs, OAuth refresh requires BLUE client authentication, bridge key is absent from token authorization, replay revokes families, and workflow actions still check participant ownership.

- [ ] **Step 4: Commit any final scoped corrections and push**

```bash
git push origin HEAD:main
```

- [ ] **Step 5: Monitor CBLUE Backend CI/CD**

Use `gh run list` and `gh run watch --exit-status` for the pushed commit. Require successful test, image, migration, and DigitalOcean deploy jobs.

- [ ] **Step 6: Probe production without exposing credentials**

Verify sanitized results only:

- Login response field names and non-null expiry timestamps; do not print token values.
- One refresh succeeds and the original token replay is rejected; redact all tokens.
- Logout makes the latest refresh fail.
- OAuth refresh rejects absent/invalid BLUE client credentials.
- Step 6 snapshot returns `100`, `THB`, and `฿100`.
- Workflow activities return HTTP 200, no duplicate POs, and no terminal records in requests, active jobs, or chat rooms.

- [ ] **Step 7: Report deployed commit and evidence**

Report test totals, build/deploy status, sanitized contract fields, rotation/replay/logout status codes, processing fee, and lifecycle counts. Never report token, hash, bridge-key, bearer, password, or client-secret values.
