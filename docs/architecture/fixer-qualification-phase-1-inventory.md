# Fixer Qualification Phase 1 Inventory

Status: complete
Date: 2026-07-23

This document records the read-only inventory for the enterprise Fixer and Pro
qualification plan. Phase 1 intentionally makes no runtime, schema, storage, or
deployment changes.

## Existing Boundaries

- Fixer registration and qualification logic: `backend/src/modules/fixer/`
- Admin API: `backend/src/modules/admin/`
- Admin web console: `apps/web/app/[locale]/admin/page.tsx`
- Fixer registration UI: `apps/web/app/[locale]/fixers/register/page.tsx`
- Prisma schema: `backend/prisma/schema.prisma`
- BLUE bridge: `backend/src/modules/blue-bridge/`
- Object-storage configuration: `backend/src/config/configuration.ts`

## Existing Qualification State

The `Fixer` record currently stores operational profile data and qualification
read-model fields including tier, verification status, score, AI tier,
breakdown, flags, and credential status. The service also contains deterministic
seven-factor scoring, tier gates, and optional Typhoon advisory review.

These fields are useful for compatibility but are not sufficient as the long-
term source of truth for versioned evidence, review decisions, expiry, or audit.

## Existing KYC and Storage Contract

KYC and portfolio uploads currently use the shared `Image` model with client-
provided `url` and `key` values. DigitalOcean Spaces configuration exists, but
the inventory did not identify a dedicated qualification document service with
server-owned encryption, presigned review access, retention, watermarking, and
document-view audit records.

The unauthenticated digest routes may assist preprocessing, but they must never
make an authoritative KYC or tier decision.

## Existing Admin Contract

The admin API currently protects routes with JWT and the `ADMIN` role. It
provides dashboard, pending-fixer, tier-review, fixer-status, fraud, order, and
suspension operations. It does not yet provide dedicated versioned KYC cases,
evidence findings, document review, maker-checker approval, or qualification
audit workflows.

## Existing BLUE Contract

The BLUE bridge already owns authoritative fixer workflow activity, detail,
chat, and action contracts. No dedicated partner-qualification bridge contract
currently exists.

The future qualification bridge must preserve:

```text
Flutter -> BLUE NestJS bridge -> CBLUE qualification API
        -> BLUE normalized runtime -> Flutter UI
```

CBLUE remains authoritative for KYC, evidence, evaluations, approved tiers,
expiry, decisions, and audit history. BLUE may cache normalized results but may
not create or override them.

## Phase 2 Boundary

The next implementation phase should add the versioned qualification domain:

- KYC submission and document records
- Qualification evaluation runs
- Evidence findings
- Recommended versus approved tier
- Review tasks and reviewer ownership
- Immutable qualification audit records
- Policy-versioned deterministic tier requirements
- Compatibility read-model updates for existing `Fixer` fields

Existing order, property, matching, and workflow behavior remains outside this
phase.
