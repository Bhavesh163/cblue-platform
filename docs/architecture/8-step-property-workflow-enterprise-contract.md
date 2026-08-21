# CBLUE 8-Step Property Workflow Enterprise Contract

## Status and scope

- Status: operational baseline recorded on 2026-08-22.
- Owner: CBLUE backend and CBLUE web projections.
- Scope: CBLUE customer property workflow, CBLUE partner/lister workflow, the
  BLUE NestJS workflow bridge, and the normalized BLUE runtime that displays
  CBLUE snapshots.
- Constraint: this record does not authorize changes to BLUE or LBLUE source
  code. If a BLUE change is needed, raise a separate BLUE change request with
  the exact contract and regression test required.
- Source version: `cblue-property-workflow-v1`.

The CBLUE and BLUE 8-step property process is currently operating together.
This document is the change-control record for preserving that behavior. It is
a contract, not a UI suggestion or a replacement for the executable tests.

## Non-negotiable architecture

The only supported request path is:

```text
Flutter -> BLUE NestJS workflow bridge -> CBLUE backend
        -> BLUE normalized runtime -> Flutter UI
```

Ownership rules:

1. CBLUE is the only source of truth for listings, inquiries, matches, PRE/PO
   references, attachments, statuses, steps, actions, fees, meeting data,
   ratings, alerts, and terminal placement.
2. BLUE is a projection client. It forwards the authenticated bearer token and
   bridge credentials, normalizes the CBLUE response for Flutter, and does not
   fabricate or override CBLUE state.
3. Flutter never calls CBLUE directly and never derives workflow state from
   labels, titles, descriptions, PO/PRE text, browser storage, local mock rows,
   or the current clock.
4. CBLUE web pages may render CBLUE APIs directly for their own authenticated
   persona, but must use persisted server responses for state and actions.
5. Private files are accessed only through an authorized CBLUE response. A
   missing file, expired session, or unavailable storage service must produce a
   recoverable error, never a fabricated file or successful workflow advance.

The public bridge contract is documented in
`backend/docs/blue-property-workflow-contract.md`. The location rules are
documented in `docs/engineering/authoritative-location-contract.md`. Keep
those documents synchronized when a persisted field or endpoint changes.

## Eight-step lifecycle

The UI may use localized labels, but persisted CBLUE status and action ownership
are authoritative. The lifecycle is:

| Step | Business event | Authoritative state / owner |
| --- | --- | --- |
| 1 | Customer discovers a public property listing | CBLUE public listing snapshot |
| 2 | Customer selects a listing and prepares the inquiry | CBLUE listing and submitted request data |
| 3 | Customer submits the inquiry and the lister is notified | `NOTIFY_SENT`; lister owns the next action |
| 4 | Lister accepts the inquiry | `ACCEPTED`; customer owns the fee action |
| 5 | Customer pays or uses an approved free pass | `PAID`; customer owns the viewing-invite action |
| 6 | Customer sends the viewing invitation | `MEETING_SENT`; lister owns confirmation |
| 7 | Lister confirms the viewing | `MEETING_CONFIRMED`; both parties may complete their rating |
| 8 | Customer and lister submit the required ratings | `COMPLETED` when the completion rule is satisfied |

The supported endpoints and action ownership are defined by the backend
contract. All action endpoints return an authoritative updated snapshot. A
successful response is the only event that may advance the local view.

The customer and lister must see the same persisted reference and workflow
state, with persona-specific action ownership. A customer may cancel where the
contract permits it; cancellation must not become the primary action owned by
the lister at a later step. Decline remains a lister action and cancellation
behavior must not be changed as part of unrelated work.

## Activity and terminal-state invariants

Requests and active jobs contain only live work. The following terminal states
must appear in history only:

- `CANCELLED`
- `DECLINED`
- `COMPLETED`

For a terminal snapshot:

- `activityBucket` is `history`.
- `availableActions` is empty.
- The workflow is removed from requests and active jobs for both participants.
- Chat is closed or read-only according to the persisted snapshot.
- No alert or browser cache entry can reintroduce the workflow into a live
  collection.
- The history record remains available with its authoritative event trail.

A property workflow is never projected as an 11-step fixer workflow. Customer
and partner property surfaces must display the 8-step progress model. The
separate 11-step fixer contract must remain isolated from this property
lifecycle.

## Location contract

Location is server-owned and normalized before it is used for discovery,
matching, display, or bridge snapshots.

- For `locationMode=GPS`, latitude and longitude are authoritative. CBLUE
  resolves and persists known Thai province, district, subdistrict, and postal
  code values using the approved normalization source.
- For `locationMode=ADMINISTRATIVE`, the selected administrative values are
  authoritative and stale coordinates are cleared.
- Unknown or non-Thai coordinates must not receive fabricated Thai
  administrative values.
- Province, district, subdistrict, and postal-code search must include valid
  normalized GPS records.
- Summary surfaces show the resolved subdistrict and coordinate when GPS is
  authoritative. Detail and action modals preserve the full project location
  context.
- Matching uses normalized server fields and service-area rules, never a
  title, description, modal string, PRE/PO number, or stale local state.

Any location change must preserve the complete regression gate in
`docs/engineering/authoritative-location-contract.md`.

## Files and customer/lister viewing

Inquiry and listing attachments are persisted by CBLUE. The bridge may expose
safe file metadata or an authorized file reference; it must not expose private
object-storage keys as a substitute for authorization.

The web viewer must support the persisted file forms used by CBLUE:

- data URLs are decoded to a Blob before opening or downloading;
- protected API URLs are fetched with the authenticated subscriber session and
  use the existing refresh path for an expired session;
- public URLs may open directly only when the URL policy permits it;
- each file has a view action and a download action, and bulk download uses
  the same authorization behavior;
- failed access remains visible as a recoverable error and does not advance a
  workflow step.

No file bytes, file names, or document availability may be invented for an
empty or missing attachment list.

## API and compatibility rules

The canonical bridge base path is:

```text
/api/v1/blue/property-workflow
```

The following rules protect the CBLUE/BLUE boundary:

- `GET /listings` is public and returns only public listing data.
- `POST /inquiries` requires an authenticated CBLUE customer identity. CBLUE
  derives the lister from the stored listing and generates the reference.
- `GET /inquiries/:reference` requires a participant identity.
- Every mutation authenticates the actor, checks ownership, validates the
  current persisted state, and returns the updated snapshot.
- Existing compatibility endpoints may remain during migration, but they must
  map to the same persisted state and may not create a second workflow.
- Additive response fields must be backward compatible. Removing or renaming a
  field requires a versioned contract and coordinated BLUE work.
- Do not trust client-supplied persona, email, lister ID, status, step, fee
  state, or completion state.
- Do not log bearer tokens, bridge keys, private document URLs, or document
  contents.

The OAuth and bridge deployment requirements, including the permanent bridge
wiring regression, are recorded in
`docs/operations/blue-oauth-bridge-runbook.md`.

## Change-control protocol

Any change touching this workflow must follow all of these rules:

1. Write a short design note identifying the authoritative CBLUE field,
   endpoint, actor, transition, and compatibility impact.
2. Add or update a failing regression test for the reported behavior before
   implementation.
3. Implement the smallest CBLUE-only change. Do not repair a CBLUE contract by
   editing BLUE or LBLUE in the same change.
4. Preserve terminal filtering, action ownership, location normalization,
   attachment authorization, and the separate 8-step progress model.
5. Run the release gates below and inspect the diff for mock data, fabricated
   fallback state, accidental secret logging, and unrelated changes.
6. Record the commit, deployment result, and any required separate BLUE
   handoff in the change note.
