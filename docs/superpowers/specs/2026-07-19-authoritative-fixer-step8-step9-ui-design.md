# Authoritative Fixer Step 8/9 UI Design

## Scope

Fix the CBLUE 11-step fixer workflow on the CBLUE customer and partner pages. The change covers Step 8 meeting invitation and confirmation, Step 9 variation initiation, alerts, upcoming meetings, chat titles, terminal chat visibility, and read-only chat history.

Do not modify BLUE or LBLUE. Do not change the 8-step property workflow, cancellation behavior, decline behavior, matching, budget calculation, or unrelated pages.

## Root Causes

1. The CBLUE partner page confirms a meeting through legacy fire-and-forget order-status and chat calls, then immediately writes a fabricated Step 9 state to browser storage. A failed or delayed request leaves browsers with different workflow states.
2. Cached Step 8 request rows can open before the current backend order is merged, so the modal intermittently lacks persisted meeting venue, date, time, and note.
3. Customer and partner alerts combine persisted workflow events with browser-generated events and current-time fallbacks, allowing stale Step 5 alerts to outrank Step 8/9 alerts.
4. The CBLUE order collection endpoints expose parts of the workflow contract but not one complete action/activity snapshot. Customer and partner pages reconstruct request ownership independently.
5. Chat titles and archived chat history still depend on browser storage. Terminal workflows can therefore remain in live Chat or lose their history on another browser.

## Architecture

### Shared authoritative projection

Create one reusable fixer workflow snapshot projector in the CBLUE backend. The BLUE bridge detail/activity endpoints and CBLUE authenticated order collections must use the same lifecycle and action semantics.

For every order visible to the authenticated customer or selected partner, expose:

- `currentStep` and `totalSteps: 11`
- `workflowPhase` and `workflowVersion`
- `status`, `lifecycleStatus`, and `activityBucket`
- participant-owned `actions`, `availableActions`, and next-action fields
- persisted `workflowEvents`
- persisted meeting venue, date, time, and note
- `chat.enabled`
- persisted chat message items needed for active Chat and read-only History
- authoritative service title, PO number, budget, and location fields

The projector may derive actions and step number from the persisted workflow phase and completed action records. It must not derive workflow state or event timestamps from PO numbers, descriptions, status notes, chat text, browser storage, or the current time.

### Mutation path

CBLUE Step 8 confirmation must call the authenticated action endpoint:

`POST /api/v1/blue/workflow-details/:poNumber/actions/confirm-meeting`

The page must await a successful authoritative snapshot before updating visible state. It must not call legacy status or chat mutations for this transition and must not fabricate a meeting-confirmed event locally.

After success, the returned snapshot owns the UI immediately and the page refreshes the authenticated order collection. An error keeps the Step 8 request visible and shows a recoverable error without advancing local state.

## Step Ownership

### Step 8 invitation sent

Persisted phase: `MEETING_CONFIRM`.

- Customer: active job, no primary request, no action-needed badge. Customer cancellation remains a secondary capability.
- Partner: request with `confirm-meeting`, showing persisted venue, date, time, and note.
- Both: alert derived from the persisted `send-meeting-invitation` event.

### Step 8 meeting confirmed / Step 9 variation decision

Persisted phase: `VARIATION`.

- Customer: active job at Step 9, no primary request until the partner submits a variation, and a “Meeting confirmed” alert.
- Partner: active job plus a Step 9 request with explicit `send-variation` and `skip-variation` actions.
- Both: “Meeting confirmed” alert derived from the persisted `confirm-meeting` event and its exact timestamp.
- Neither page may regress to Step 7 or Step 8 while the persisted phase remains `VARIATION` or later.

### Step 9 variation submitted

Persisted phase: `VARIATION_CONFIRM`.

- Partner: no variation-decision request; active job remains visible.
- Customer: Step 9 request to confirm the submitted variation.
- Both: alert derived from the persisted variation action event.

## Modal Hydration

When the partner opens a Step 8 request, CBLUE must resolve the latest order from the authenticated partner order collection before opening the modal. The modal renders only persisted meeting fields. If the latest order cannot be loaded or required fields are absent, keep the request visible and show an error instead of opening a blank modal.

Cached rows may provide non-authoritative display placeholders while loading, but they cannot override persisted meeting, lifecycle, action, event, PO, budget, or participant fields.

## Alerts And Meetings

Alerts are projected from persisted workflow events. For the same PO and phase, an authoritative event alert always supersedes older browser alerts.

Upcoming Meetings contains confirmed meetings only. It is sorted by meeting date/time ascending, excludes meetings already due, and displays no more than the three oldest upcoming meetings. Venue, date, time, service title, and PO number come from persisted order fields.

## Chat And History

Live chatroom titles use:

`<SERVICE> - <PO> - ฿<AUTHORITATIVE_BUDGET>`

A workflow appears in live Chat only when `chat.enabled` is true and `activityBucket` is not `history`. Completed, rated, cancelled, declined, and archived workflows never appear in Requests, Active Jobs, or Chat.

Persisted chat messages remain available as read-only content within the corresponding customer and partner History details. Browser cache may improve responsiveness but cannot be the source of truth and must be purged from live chat indexes for terminal workflows.

## Error Handling

- Await all workflow action requests.
- Reject stale `workflowVersion` transitions and refresh the authoritative snapshot.
- Do not advance local state on a failed action.
- Preserve the visible request during transient API failures.
- Do not fall back to text parsing or current-time event generation.

## Tests

### Backend

- Customer and partner order collections return the same authoritative Step 8 meeting fields and action ownership.
- `confirm-meeting` returns and persists `VARIATION`, Step 9, and the same `confirm-meeting` event timestamp for both participants.
- Step 9 exposes partner variation Yes/No actions and no customer primary action.
- Terminal workflows are history-only with persisted chat messages and no live chat action.

### Web

- A cached Step 8 row cannot open a blank modal; click-time hydration supplies all four meeting fields.
- Partner confirmation uses the authoritative action endpoint and does not call legacy status/chat mutations.
- Step 9 appears for the partner and does not regress for the customer.
- Persisted event alerts replace stale accepted/fee alerts for both participants.
- Chat title uses service, PO, and budget.
- Terminal chatrooms are absent while their messages render read-only in History.
- Upcoming Meetings is future-only, ascending, and limited to three.

## Production Acceptance

For an active PO moving from Step 8 to Step 9:

1. The partner modal consistently shows persisted venue, date, time, and note.
2. Confirming once advances both participants to Step 9 without browser-specific state.
