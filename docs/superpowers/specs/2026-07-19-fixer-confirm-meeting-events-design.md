# Fixer Confirm-Meeting Events Design

## Goal

After a selected partner successfully performs `confirm-meeting`, every CBLUE server contract and customer/partner UI must remain at the persisted `VARIATION` phase (Step 9) and display a meeting-confirmed alert whose timestamp comes from the persisted action event.

## Scope

- Change only the CBLUE repository.
- Preserve the existing 11-step fixer action semantics, cancellation and decline behavior, and the 8-step property workflow.
- Do not derive workflow phase, step, event, actor, or timestamp from generic status, PO number, descriptions, chat text, browser storage, or the current time.
- Do not add mock workflow data.

## Source Of Truth

`FixerWorkflowAction` is the existing authoritative fixer action ledger. The successful `confirm-meeting` transaction already persists a row with `action=confirm-meeting`, `actorUserId`, `workflowRevision`, and `createdAt`, and atomically updates `Order.workflowPhase` to `VARIATION`.

No second event table or schema migration will be introduced. Bridge and order serializers will project these persisted action rows as workflow events.

## Server Contract

The workflow detail response, workflow activities records, successful fixer action response, and authenticated order collection records consumed by CBLUE web will include:

```ts
workflowPhase: string | null;
workflowEvents: Array<{
  action: string;
  createdAt: string;
  actorRole: "customer" | "partner";
}>;
```

Actor role is resolved by comparing the persisted action's `actorUserId` to the order customer and assigned fixer's user IDs. Unknown actors are omitted rather than guessed.

Both linked participants receive the same event history for their shared order. Existing authorization remains unchanged: unrelated users cannot access the order or its events.

For an order with persisted `workflowPhase=VARIATION`, the authoritative workflow snapshot returns `currentStep=9`, `totalSteps=11`, and Step 9 actions appropriate to the authenticated participant. Generic `status=IN_PROGRESS` cannot lower this step.

## CBLUE Web Projection

Customer and partner order mapping will carry `workflowPhase`, `currentStep`, authoritative actions, and `workflowEvents` from server responses. A shared projection helper will:

1. Prefer persisted workflow phase and current step over status-only mappings.
2. Find the persisted `confirm-meeting` event without parsing text.
3. Build `PO-... Meeting confirmed.` using that event's persisted timestamp.
4. Suppress stale Step 7 and Step 8 request projections once the phase is `VARIATION` or later.

Browser storage may retain non-authoritative presentation details, but it cannot determine the workflow phase, Step 9 transition, event existence, or event timestamp.

## Compatibility

Existing fields remain in all responses. `workflowEvents` is additive. Existing BLUE clients that ignore the new field continue to work, while CBLUE web consumes it immediately. No BLUE or LBLUE files are changed.

## Error Handling

- A successful action transaction returns the freshly reloaded authoritative snapshot.
- A stale or illegal transition remains rejected by the existing workflow version and action authorization checks.
- Missing or malformed historical action rows are omitted from `workflowEvents`; they do not trigger inferred replacement events.
- If no persisted `confirm-meeting` event exists, no meeting-confirmed alert is fabricated.

## Tests

Backend regression tests will prove:

- `confirm-meeting` persists `workflowPhase=VARIATION` and returns Step 9.
- Detail and activities expose the same persisted event timestamp and actor role to customer and partner.
- Successful action responses contain the same event shape.
- Generic `IN_PROGRESS` cannot override persisted `VARIATION`.
- Unauthorized users cannot receive the workflow or its event history.

Web regression tests will prove:

- Customer and partner projections remain at Step 9 after confirmation.
- Step 7/8 requests are suppressed by the authoritative phase.
- The meeting-confirmed alert uses only the persisted event timestamp.
- No alert is created when the persisted event is absent.

## Deployment Verification

Run focused backend and web tests, backend and web type checks/builds, and `git diff --check`. Push the CBLUE-only commit to `main`, deploy the affected backend and web workflows, then verify route availability and deployment commit without exposing credentials or user data.
