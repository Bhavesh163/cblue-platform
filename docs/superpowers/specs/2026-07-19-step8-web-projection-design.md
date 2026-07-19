# Step 8 Web Projection Design

## Goal

Make the CBLUE customer and partner web pages project the persisted Step 8 fixer workflow consistently: the partner confirmation modal shows the authoritative meeting date, time, venue, and note; the customer alert shows the current meeting state; and summary cards show the persisted subdistrict while workflow modals retain GPS/project coordinates.

## Constraints

- Change CBLUE only. Do not edit BLUE or LBLUE.
- Keep the BLUE bridge contract and persisted workflow state authoritative.
- Do not derive meeting data or workflow phase from PO numbers, descriptions, notification text, or browser storage.
- Leave cancellation, partner decline, the property workflow, and forgot password behavior unchanged.
- Do not reintroduce mock data or terminal jobs into live requests, active jobs, or chat.

## Root Causes

1. The partner page creates and retains Step 8 request rows in `partner_mock_dyn_req`. Those rows can predate the authoritative backend snapshot, omit `meetingNote`, and win the request merge by PO. The modal then receives the stale browser row even though its rendering code supports all four meeting fields.
2. The customer page assigns the newest backend workflow event timestamp to an old local `payment_pending` alert. The old “Partner accepted” message therefore sorts as if it were the Step 8 event. Its generated ID is not covered by the current authoritative alert supersession list.
3. Customer and partner backend mappers store GPS coordinates in both `location` and `subdistrict`. Summary cards therefore cannot choose a real subdistrict without also changing modal project-location behavior.

## Architecture

### Authoritative Meeting Reconciliation

Add a pure web projection helper that reconciles a cached partner request with the matching backend order. For Step 8, backend fields always overwrite cached meeting fields and action state. The result carries the nested `meeting` object and scalar compatibility fields. Existing cached rows are repaired by PO, so users do not need to clear browser storage.

The legacy effect may continue to maintain request-card presence for compatibility, but it must not parse meeting details from status notes or descriptions. It must project meeting data from the backend order and update an existing row instead of skipping it.

### Stage-Aware Customer Alerts

Every generated fixer alert carries an explicit PO and workflow stage. Local alerts keep their own event timestamp. The alert merge removes any lower-stage alert for the same PO when a higher-stage authoritative alert exists. At `MEETING_CONFIRM`, the authoritative customer alert supersedes payment and chat alerts regardless of their storage IDs.

### Separate Modal And Card Locations

Backend-to-web projections expose:

- `projectLocation`: GPS coordinates when available, otherwise the persisted address fallback.
- `siteSubdistrict`: persisted `address.subdistrict` (with district/province fallback only when subdistrict is empty).
- `location`: compatibility alias for `projectLocation`, used by workflow modals.
- `subdistrict` and `cardLocation`: compatibility/card aliases for `siteSubdistrict`.

Customer and partner Requests, Active Jobs, and Overview cards render `cardLocation`/`siteSubdistrict`. Step modals continue to render `projectLocation`/`location` and therefore preserve GPS coordinates.

## Error Handling

- If a backend meeting field is empty, render an empty value or existing modal placeholder. Do not backfill it from text.
- If subdistrict is absent, card location falls back to district, then province, then the existing project location as a last-resort display value.
- Cached rows that have no matching backend order retain their current compatibility behavior; they cannot override a matching authoritative order.

## Tests

- A stale cached Step 8 partner request with missing/wrong meeting data is reconciled to the backend date, time, venue, and note.
- An existing cached request is updated rather than skipped.
- A meeting-confirm alert suppresses same-PO payment/chat alerts, including legacy generated IDs, and the old payment alert keeps its original timestamp.
- Location projection returns GPS for modal use and subdistrict for card use.
- Existing action ownership, terminal visibility, cancellation, decline, and property workflow tests remain green.

## Deployment Verification

Build and test the CBLUE web package, commit only scoped CBLUE files, push the branch/main as appropriate, deploy through the existing CBLUE workflow, then verify production bundles and sanitized customer/partner behavior for `PO-2607-9458` without exposing credentials.
