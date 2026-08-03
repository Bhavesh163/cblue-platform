# CBLUE Qualification Policy

## Public naming

User-facing qualification copy calls the product **blue AI**. Provider implementation names remain internal operational metadata and are never shown in applicant or admin marketing copy.

## KYC decision

KYC is a prerequisite for fixer and pro eligibility and is separate from tier classification.

- Wrong document type, unreadable evidence, an invalid identity number, an expired ID, identity contradiction, or failed liveness routes the evidence to `NEEDS_RESUBMISSION`.
- The applicant sees the reason immediately after upload.
- Valid but non-authoritative evidence routes to `NEEDS_REVIEW` for administrator verification.
- No automated model may make an irreversible identity rejection.
- Administrators review the persisted ID front, selfie, and qualification files through audited, short-lived private links.
- Approval of KYC does not automatically approve an upper tier.

## Tier decision

After KYC approval, blue AI evaluates portfolio and credential evidence separately.

- Economy is the baseline.
- Standard is eligible when the applicant has more than three years of relevant experience, or two related educational or professional credentials, or one corporate certificate, or one completion certificate for a project worth at least one million baht.
- Corporate, Specialist, and Expert require the deterministic evidence ceiling and single-administrator administrator approval.
- A weak portfolio lowers the recommended tier; it does not invalidate otherwise valid KYC.
- A document uploaded as portfolio may count as credential evidence only after an administrator verifies its educational or professional provenance. Automated extraction is advisory and cannot establish credential eligibility by itself.
- Each credential must be recorded in persisted administrator verification. When one document contains multiple credentials, the administrator records the exact verified credential count; CBLUE does not infer the count from filenames or free text.
- The deterministic recommendation is the maximum tier. An administrator may approve that tier or any lower eligible tier in the same review session.

## Admin responsibilities

The admin console provides:

- latest-provider directory with service-area, service, tier, rating, decline, and cancellation filters;
- provider detail with proposed price list and qualification submission metadata;
- audited evidence access for KYC and portfolio files;
- unmatched-demand location and timestamp reporting;
- persisted decline/cancellation reasons and timestamps;
- completed payment revenue by daily, weekly, and monthly periods.

The customer and provider applications receive only server-owned qualification and workflow state through the CBLUE API and the BLUE bridge.
