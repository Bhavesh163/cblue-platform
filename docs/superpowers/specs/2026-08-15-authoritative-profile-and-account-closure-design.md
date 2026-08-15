# Authoritative Profile Synchronization and Account Closure Design

## Objective

Keep CBLUE authoritative for CBLUE customer contact data, preserve reversible phone changes, expose versioned profile data to trusted application bridges, and replace unconfirmed account deletion with password-confirmed, purpose-limited account closure.

## Scope

This change is limited to CBLUE customer profile synchronization contracts and self-service account closure. It does not change registration, fixer and professional onboarding, partner profile editing, property listing, or the three booking forms.

BLUE and LBLUE remain separate deployments. CBLUE will provide authoritative read and write contracts, but each consumer must refresh and invalidate its own local profile cache. CBLUE must never write directly to another application's database.

## Profile Authority

CBLUE stores the authoritative CBLUE phone number in `User.phone` and the linked `Subscriber.phone`. A phone update is transactional across both records. The same account may change `A -> B -> A` when the requested number is not owned by another active account. An inactive or deleted legacy account must not reserve a phone number. A phone owned by another active account returns HTTP 409.

Trusted BLUE requests use the server-held bridge key and the server-resolved `legacySubjectId`. Client-supplied role, email, or ownership headers are never authoritative. Successful profile reads and writes return `createdAt` and `updatedAt`; consuming applications use `updatedAt` to replace stale local state after login, app resume, profile opening, and a successful write.

CBLUE does not add a second phone workaround because the deployed CBLUE `GET` and `PUT` bridge contract already returns HTTP 200. The remaining BLUE mobile failure is a BLUE deployment issue: its profile bridge commit is not present on BLUE `main`.

## Account Closure Command

Self-service closure uses an authenticated command endpoint with a body containing `currentPassword`. The endpoint is rate-limited and verifies the password against the linked active `Subscriber.passwordHash`. A missing linked password credential, wrong password, inactive user, or already closed account is rejected without revealing credential details.

The web customer and partner profile pages use one shared account-closure dialog. The dialog requires the current password, provides an accessible password visibility control, explains the unresolved-work gate, requires final confirmation, clears local session state only after success, and displays localized errors. The legacy unconfirmed deletion path must no longer close an account.

## Closure Gate

Closure returns HTTP 409 when any of these authoritative records remain unresolved:

- an order whose status is not `COMPLETED` or `CANCELLED`;
- a property inquiry whose status is not `COMPLETED`, `CANCELLED`, or `DECLINED`, where the account is customer or lister;
- a payment with status `PENDING` on one of the account's orders or fixer assignments.

The response returns category counts only. It does not expose counterparties or internal records.

## Transactional Closure

After password verification and gate checks, one Prisma transaction:

1. Re-checks the user, subscriber, and unresolved-work gate to prevent a time-of-check/time-of-use race.
2. Creates a detached account-deletion audit containing a random event ID, SHA-256 subject reference, policy version, timestamps, and category-count metadata, but no direct identity or raw user ID.
3. Revokes every unrevoked refresh session with reason `ACCOUNT_DELETED`.
4. Deactivates the fixer profile, removes public contact and descriptive data, clears availability and skills, and prevents matching.
5. Deactivates property listings and removes contact, precise address, and GPS data while preserving a non-identifying shell where retained inquiries require it.
6. Deletes notifications and unreferenced saved addresses. Referenced addresses retain only coarse administrative location required for service-history reporting.
7. Moves non-held private KYC documents to `DELETE_PENDING` for immediate object-storage cleanup. Legal holds remain authoritative.
8. Unlinks and deletes the Subscriber login credential and reset tokens.
9. Pseudonymizes the User anchor, marks it inactive, and records the closure timestamp while preserving only the opaque relation required by lawful history.

Any failure rolls back the transaction and leaves the session usable for retry.

## Retention and Legal Holds

Closure immediately removes data no longer needed for account operation. Completed or cancelled service history, payment records, aggregate metrics, security events, and audit evidence remain detached from direct identity and follow existing CBLUE policy:

- consent evidence: 3 years;
- completed or cancelled service history: 18 months;
- private KYC evidence: immediate deletion scheduling on voluntary closure unless held;
- statutory accounting or dispute records: retained only for the applicable obligation and access-restricted;
- legal holds: override automated deletion until expiry or authorized release.

The detached closure audit is retained for 3 years and then removed by the retention worker unless held. This is an engineering control, not a substitute for Thai legal advice. The privacy notice must continue to disclose purpose, retention, legal-hold exceptions, and the request channel.

## Data Model

Add `AccountDeletionAudit` with a UUID primary key, unique SHA-256 `subjectHash`, `policyVersion`, `requestedAt`, `completedAt`, `retentionDeleteAt`, optional `legalHoldUntil`, and JSON `retainedCategories` containing category names and counts only.

Add `deletedAt` and `deletionPolicyVersion` to `User` so inactive cleanup and voluntary closure are distinguishable without restoring direct identity.

## Error Contract

- HTTP 400: invalid command payload.
- HTTP 401: password or credential cannot be verified.
- HTTP 404: authenticated user no longer exists.
- HTTP 409: unresolved work or payment blocks closure.
- HTTP 429: too many closure attempts.
- HTTP 503: closure could not complete safely and no partial closure was committed.

User-facing copy never exposes database, bridge, hashing, or provider details.

## Testing

Backend tests prove password confirmation, throttling, every gate category, resolved-history success, in-transaction gate recheck, atomic revocation and minimization, credential removal, KYC hold behavior, detached retained records, rollback, and unchanged personal/company qualification behavior.

Web tests prove both customer and partner profiles use the shared dialog, retain sessions after errors, and show localized actionable responses. Existing registration, qualification, listing, booking, matching, cancellation, and decline tests remain regression gates.

## Cross-System Deployment Boundary

CBLUE deployment completes its authority and closure behavior. BLUE must merge and deploy its existing profile bridge before mobile writes can succeed. BLUE and LBLUE must refresh through trusted backend adapters and must not infer success from a local-only write. Cross-system closure requires separate BLUE and LBLUE work to revoke their local sessions and links after CBLUE reports successful closure.
