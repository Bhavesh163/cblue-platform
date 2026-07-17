# Fixer Meeting Contract Design

## Goal

Make CBLUE the authoritative source for fixer Step 8 meeting details and persona-specific activity placement. Persist and expose the customer's meeting venue, date, time, and note; expose the site subdistrict separately; render those values in the partner confirmation modal; and keep terminal property records out of live collections.

## Scope

- Edit CBLUE only. Do not edit BLUE or LBLUE.
- Preserve the existing cancel and decline behavior.
- Preserve the working eight-step property workflow unless a regression test demonstrates an incorrect terminal placement.
- Do not derive meeting, location, lifecycle, action, or display values from a PO/PRE number, description, modal text, or browser storage.
- Do not introduce mock frontend data.
- Make partner modal rows use the available width and allow long values to wrap.

## Root Cause

The fixer action endpoint currently stores Step 8 meeting values only in `FixerWorkflowAction.payload`. `Order` has no authoritative meeting columns, and the current workflow detail snapshot does not read the payload. The partner page therefore relies on text parsing and browser-state fallbacks.

The authoritative activity endpoint was implemented on an older CBLUE branch but is absent from current `main`. Its shared `MEETING_CONFIRM` definition also assigns `activityBucket: request` to both personas. Because `customer-cancel` is appended to every non-terminal phase, a customer can see cancellation as the only and therefore primary Step 8 request action.

## Architecture

### Persisted meeting snapshot

Add nullable fixer meeting columns to `Order`:

- `meetingDate`
- `meetingTime`
- `meetingVenue`
- `meetingNote`

The `send-meeting-invitation` transition will update all four columns in the same database transaction that writes the action event, workflow phase, status, and workflow revision. The action event remains the audit record; the `Order` columns are the queryable current snapshot.

Existing orders may have meeting values only in action-event payloads. The bridge may use that persisted event payload as a legacy server-side fallback, but never description text, status notes, modal text, or browser state. Once a new invitation is sent, the `Order` snapshot is canonical.

### Authoritative bridge contract

Port the existing CBLUE `GET /api/v1/blue/workflow-activities` and fixer chat bridge implementation onto current `main`, adapting it to the latest lifecycle and refresh-token work already present.

Both `GET /api/v1/blue/workflow-activities` and `GET /api/v1/blue/workflow-details/:poNumber` will return:

```json
{
  "meeting": {
    "date": "2026-07-18",
    "time": "14:30",
    "venue": "13.794095, 100.609583",
    "note": "Please bring the site drawings."
  },
  "siteSubdistrict": "Saphan Song"
}
```

`meeting` is `null` until an invitation exists. `siteSubdistrict` comes directly from the persisted `Address.subdistrict`; it is never reverse-geocoded from GPS coordinates.

### Persona-specific Step 8 placement

Workflow phase remains server-owned and shared, while placement and actions are projected for the authenticated persona:

- Customer after sending invitation: `activityBucket: active`.
- Customer actions may include `customer-cancel`, but cancellation is a secondary capability. `nextActionKey`, `nextActionLabel`, `nextActionOwner`, and `nextActionStep` are all `null` because the customer does not own the primary Step 8 transition.
- Selected partner: `activityBucket: request`, with `confirm-meeting` as the primary action and populated `nextAction*` fields.
- Chat remains enabled according to persisted `Order.chatEnabled`.

The resolver will distinguish phase-owned actions from secondary capabilities rather than treating the first actor-visible action as the next required action.

### Partner confirmation modal

The partner dashboard will map persisted server meeting fields into the Step 8 modal. The modal will render separate rows for date, time, venue, and customer note. Rows will use a responsive two-column grid with a compact label column and a flexible value column; long values wrap instead of being constrained to a narrow fixed width.

Browser/localStorage parsing remains outside the authoritative path and will not override non-empty server values.

### Terminal PRE verification

`PRE-2605-5354` belongs to the property workflow. Verification will use persisted `PropertyInquiry.status`, ratings, and workflow events. Terminal, cancelled, or declined records must appear only in history, never requests or active jobs. No property transition behavior will change unless the regression test proves the existing lifecycle resolver violates this rule.

## Data Flow

1. Customer submits `send-meeting-invitation` with date, time, venue, and optional note.
2. CBLUE validates participant ownership and current workflow revision.
3. One transaction writes the action audit event and updates the `Order` meeting snapshot, status, phase, and revision.
4. Detail and activity endpoints read the current meeting snapshot and persisted address subdistrict.
5. Persona-aware projection places the customer record in active jobs and the selected partner record in requests.
6. The partner modal renders the returned fields directly.

## Error Handling

- Date, time, and venue remain required for `send-meeting-invitation`.
- Note is optional and trimmed; empty input is stored as `null`.
- Stale workflow revisions and illegal actors remain rejected without changing meeting state.
- A failed transaction writes neither the action event nor any meeting field.
- Missing meeting data returns `meeting: null`; it does not trigger text parsing.

## Testing

Add failing tests before production changes for:

- Atomic persistence of date, time, venue, and note.
- Detail response meeting object and `siteSubdistrict`.
- Activity response meeting object and `siteSubdistrict`.
- Customer Step 8 active placement with secondary cancellation and null `nextAction*`.
- Partner Step 8 request placement with primary `confirm-meeting`.
- Terminal/cancelled/declined records excluded from requests, active jobs, and chat rooms.
- `PRE-2605-5354` terminal property placement in history only.
- Partner modal rendering all persisted meeting fields with full-width wrapping rows.
- No meeting or subdistrict derivation from description, PO/PRE number, modal text, GPS, or localStorage.

## Deployment

Run Prisma validation and migration checks, focused backend and frontend tests, backend and web builds, formatting/diff checks, then commit and push the CBLUE branch to `main`. Monitor backend and web deployment workflows and report sanitized production route status without exposing bridge keys or bearer tokens.
