# Authoritative Fixer Step 9 Projection Design

## Scope

Repair the CBLUE fixer workflow Step 9 projection without changing BLUE or LBLUE. Preserve the working cancellation, decline, forgot-password, and property workflow behavior.

## Source Of Truth

`FixerWorkflowAction` remains the authoritative transition ledger. The persisted `send-variation` action payload supplies the partner note and structured variation items. CBLUE must not reconstruct Step 9 data from chat text, modal text, PO numbers, descriptions, browser storage, or price estimates.

## Backend Contract

- Project persisted variation items, note, actor role, and creation timestamp from the latest `send-variation` action.
- Include the structured variation projection in workflow detail, workflow activity, and successful action responses.
- Generate persona-appropriate event alerts from persisted workflow actions. A customer sees that approval is required; the partner sees that submission is waiting for customer approval.
- Continue returning authoritative service identity, customer/partner identities, `siteSubdistrict`, workflow phase, action ownership, lifecycle state, and activity bucket.
- Terminal, cancelled, declined, archived, and fully rated workflows cannot enter requests, active jobs, or chat rooms.

## CBLUE Web Projection

- Partner cards expose Step 9 controls only while a partner-owned `send-variation` or `skip-variation` action is available.
- After submission, the active card remains at Step 9 but has no submit control or action-needed badge because action ownership has moved to the customer.
- The customer approval modal renders one authoritative partner-request section containing the note and structured line items.
- Step 9 does not render the prior confirmed-meeting panel.
- Workflow cards use the persisted service title, participant identity, and subdistrict. Coordinates remain available in workflow action modals.

## GPS Submission

All three CBLUE booking forms resolve GPS coordinates during submission and include the resulting subdistrict in the persisted address payload. This removes the React state timing race. If resolution is unavailable, CBLUE retains the coordinates and does not invent a subdistrict.

## Compatibility Boundary

CBLUE will emit clean UTF-8 structured fields. BLUE-specific typography, mojibake, duplicate card composition, and fallback labels must be fixed in BLUE's normalized runtime and Flutter renderer, not by adding presentation text to CBLUE.

## Verification

- Backend contract tests cover structured variation projection, customer/partner event alerts, and terminal exclusion.
- Web projection tests cover action ownership, non-duplicated Step 9 content, hidden meeting details, and terminal rating records.
- Booking tests cover submit-time GPS subdistrict resolution for household, project-team, and professional forms.
- Run focused tests first, then complete backend tests/build and web tests/type-check/build before commit and deployment.
