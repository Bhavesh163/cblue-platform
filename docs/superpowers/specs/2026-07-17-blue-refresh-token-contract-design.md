# CBLUE Rotating Refresh Token and BLUE Token Exchange Design

## Scope

Implement a CBLUE-only, production-grade refresh-token contract shared by CBLUE login flows and BLUE OAuth token exchange. Preserve existing customer and partner workflow authorization, add an authoritative fixer processing-fee object, and retain the deployed lifecycle filtering that keeps terminal work out of live activity buckets. BLUE and LBLUE repositories are out of scope.

## Decisions

- Use opaque, cryptographically random refresh tokens. Persist only SHA-256 token hashes in PostgreSQL.
- Use one refresh-session store for CBLUE web/mobile login, OTP/admin login, and BLUE OAuth offline access.
- Keep two compatible entry points:
  - `POST /api/v1/auth/refresh` for CBLUE clients.
  - `POST /api/v1/oauth/token` with `grant_type=refresh_token` for BLUE.
- Keep RFC 8693 subject-token exchange at `POST /api/v1/oauth/token` unchanged for initial BLUE delegation.
- Bind every refresh session to one CBLUE user, client id, audience, and token family.
- Rotate refresh tokens transactionally. Reusing a rotated token revokes its complete family.
- Do not use `x-blue-bridge-key` for user authentication or refresh-token authorization.

## Persistence Model

Add a `RefreshSession` model with:

- `id`: UUID primary key.
- `userId`: owning CBLUE user.
- `tokenHash`: unique SHA-256 hash of the opaque token.
- `familyId`: stable UUID shared by all rotations in one login session.
- `clientId`: `cblue-web`, `cblue-mobile`, or the validated BLUE OAuth client id.
- `audience`: `CBLUE`, `LBLUE`, or the configured first-party CBLUE audience.
- `expiresAt`: authoritative refresh expiry.
- `rotatedAt` and `replacedById`: single-use rotation evidence.
- `revokedAt` and `revocationReason`: logout, replay, expiry, compromise, inactive user, or administrative revocation.
- `createdAt` and `lastUsedAt`: audit timestamps.

Raw refresh tokens, access tokens, passwords, client secrets, authorization headers, and token hashes must never be logged.

## Token Issuance

CBLUE subscription login/register and OTP/admin OTP login return:

```json
{
  "accessToken": "opaque-to-client JWT value",
  "refreshToken": "opaque random value",
  "accessTokenExpiresAt": "2026-07-17T00:00:00.000Z",
  "refreshTokenExpiresAt": "2026-08-16T00:00:00.000Z",
  "tokenType": "Bearer"
}
```

Access expiry is computed from the configured JWT access TTL. Refresh expiry is computed from the configured refresh TTL and persisted in the session row.

First-party CBLUE sessions use a configured client id with a `cblue-web` default and a `CBLUE` audience. BLUE sessions use the validated OAuth client id and requested allowed audience. Access tokens remain bound to the same user and carry existing role/capability claims.

## Refresh and Revocation

`POST /api/v1/auth/refresh` accepts `{ "refreshToken": "..." }`. It finds the token by hash, validates the session and active user, and rotates the session in one database transaction. The old row is marked rotated and linked to the replacement. The response uses the CBLUE camelCase token shape.

`POST /api/v1/auth/logout` accepts the refresh token, revokes every non-revoked session in its family, and is idempotent. It returns HTTP 204 and no token data.

The legacy `POST /api/v1/subscription/refresh-session` route remains temporarily available for valid, non-expired access tokens, but it no longer accepts expired access tokens or creates an untracked long-lived session. New CBLUE clients use `/auth/refresh`.

The following conditions reject refresh with a generic unauthorized/invalid-grant response and no token details:

- Unknown token hash.
- Expired token.
- Rotated-token replay.
- Revoked family.
- Inactive or missing user.
- BLUE client mismatch.
- Audience mismatch.

Replay revokes the complete family before returning the error.

## OAuth Contract

The existing RFC 8693 flow continues to validate BLUE issuer, audience, signature, expiry, verified email, local user mapping, requested CBLUE/LBLUE audience, and BLUE client credentials.

When RFC 8693 requests `offline_access`, CBLUE creates a persisted refresh session bound to that BLUE client and audience and returns `refresh_token` plus `refresh_token_expires_at`.

`POST /api/v1/oauth/token` additionally supports:

```text
grant_type=refresh_token
refresh_token=<opaque token>
client_id=<BLUE client id>
client_secret=<BLUE client secret>
```

Client authentication may use HTTP Basic or POST fields. Rotation returns standard OAuth fields: `access_token`, `refresh_token`, `token_type`, `expires_in`, `access_token_expires_at`, and `refresh_token_expires_at`. The endpoint does not accept bridge-key authentication.

## Workflow Authorization

Refresh and exchange issue only the real CBLUE user's access token. Existing bearer-token participant checks remain authoritative for fixer actions:

- Customer-owned actions remain available only to the persisted customer.
- Partner-owned actions remain available only to the assigned fixer user.
- OAuth capabilities reflect the mapped CBLUE user and cannot elevate customer, fixer, or admin roles.

Tests cover customer/partner action ownership with refreshed tokens and reject cross-participant action attempts.

## Processing Fee Contract

Every authoritative fixer workflow snapshot and successful action response includes:

```json
{
  "processingFee": {
    "amount": 100,
    "currency": "THB",
    "displayLabel": "฿100"
  }
}
```

The amount and currency are server configured with safe defaults of `100` and `THB`. The display label is produced server-side from those values. Step 6 actions retain explicit `feeMode: payment | free-pass`; the fee object describes the standard fee and does not imply whether it was paid or waived.

## Lifecycle Contract

`GET /api/v1/blue/workflow-activities` and workflow detail snapshots continue to use persisted status, workflow phase, workflow action events, archive state, cancellation/decline events, and ratings.

- Finished, fully rated, cancelled, declined, and archived records appear only in `history` or are omitted when intentionally hidden.
- They never appear in `requests`, `activeJobs`, or `chatRooms`.
- Records are deduplicated by canonical PO number.
- A Step 11 rating workflow remains active only when backed by persisted completion/rating action events.
- No lifecycle decision uses PO age, title, description text, modal text, or browser storage.

## Error Handling and Concurrency

Refresh rotation uses a transaction and conditional update so two concurrent uses cannot both succeed. Exactly one rotation wins. A later/replayed use revokes the family. OAuth errors avoid revealing whether a user, client-bound session, or token family exists.

Database failures roll back rotation; the caller retains the still-valid original token unless the transaction committed. No partial replacement row is exposed.

## Testing and Deployment

Use test-driven development with failing tests observed before production changes. Coverage includes:

- Login response fields and expiries.
- Rotation and concurrent single-use behavior.
- Expiry and replay-family revocation.
- Logout-family revocation and idempotency.
- BLUE client and audience binding.
- RFC 8693 offline access plus OAuth refresh grant.
- Inactive users and role/capability preservation.
- Customer/partner workflow action enforcement.
- Step 6 processing fee in GET and action responses.
- Terminal lifecycle exclusion, history placement, chat exclusion, and deduplication for both personas.

Before deployment run Prisma generation/validation, focused tests, the full backend suite, backend build, and repository diff checks. Deploy through the existing CBLUE Backend CI/CD workflow. Production probes report only status codes, field names, expiry presence, sanitized lifecycle counts, and processing-fee values.
