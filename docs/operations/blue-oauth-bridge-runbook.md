# BLUE OAuth Bridge Runbook

## Purpose

Keep the CBLUE-to-BLUE customer session exchange stable. A signed-in BLUE customer must be able to contact a CBLUE property lister without being asked to create a second CBLUE password session.

## Authoritative contract

CBLUE owns these versioned endpoints on the backend origin:

- `GET /api/v1/.well-known/openid-configuration`
- `GET /api/v1/oauth/jwks.json`
- `POST /api/v1/oauth/token`

The token endpoint accepts the BLUE RFC 8693 token exchange. It must validate the configured client, audience, subject token, and subject token type before issuing CBLUE access and refresh tokens. Never bypass that validation to hide a client re-authentication symptom.

## Production configuration

Configure these values in the backend runtime and GitHub Actions environment. Keep secrets out of source control and logs:

- `CBLUE_OAUTH_ISSUER`: the HTTPS public backend issuer, including `/api/v1` when that is the configured API base
- `CBLUE_OAUTH_KEY_ID`
- `CBLUE_OAUTH_PRIVATE_KEY_PEM`
- `CBLUE_OAUTH_PUBLIC_KEY_PEM`
- `CBLUE_OAUTH_ACCESS_TOKEN_TTL_SECONDS`
- `CBLUE_OAUTH_REFRESH_ENABLED`
- `CBLUE_OAUTH_ALLOWED_AUDIENCES`
- `BLUE_OIDC_ISSUER`
- `BLUE_OIDC_AUDIENCE`
- `BLUE_OIDC_JWKS_URL` or `BLUE_OIDC_JWKS_JSON`
- `BLUE_OAUTH_CLIENT_ID`
- `BLUE_OAUTH_CLIENT_SECRET`

`CBLUE_OAUTH_ISSUER` takes precedence. If it is absent in production, CBLUE falls back to `CBLUE_BACKEND_PUBLIC_URL` and then the configured backend origin. The fallback is a deployment guard, not a replacement for an HTTPS production issuer.

## Release gate

After any change to `main`, verify the following against the actual backend origin, not only through the web proxy:

1. Discovery returns HTTP 200 and an issuer matching the backend origin.
2. The discovery `jwks_uri` and `token_endpoint` use the same public API base.
3. An unauthenticated token request is rejected with HTTP 400/401 and a sanitized error.
4. A credentialed BLUE exchange returns HTTP 200 with access, refresh, and expiry fields.
5. BLUE can contact a CBLUE property lister without a second password prompt.

Use only sanitized status and error codes in logs or issue reports. Do not paste client secrets, private keys, bearer tokens, or identity evidence into tickets.

## Regression protection

Keep the route contract tests and OAuth service tests with the backend. Any future change to the global API prefix, OAuth controller paths, token exchange grant, or deployment environment pass-through must update those tests and this runbook in the same CBLUE change.

## Property GPS invariant

CBLUE is the authority for property location persistence and search. A listing with valid GPS coordinates must also have an authoritative province, district, subdistrict, and postal code resolved before it is created or updated. This validation applies when `locationMode` is omitted because coordinates imply GPS.

An unresolved legacy GPS record must not appear in public property search. Do not weaken this filter to make a listing appear. Correct the listing by sending a real Thailand GPS fix that CBLUE can resolve, or use the administrative location selector. The coordinates `37.421998, -122.084000` are not a Thailand property location and must be rejected rather than stored as a searchable listing.

Keep regression coverage for:

- BLUE-created GPS listings with a known Thai coordinate being searchable by province, district, and subdistrict.
- GPS listings with unknown coordinates being rejected before persistence.
- Legacy unresolved GPS listings being excluded from public search.
