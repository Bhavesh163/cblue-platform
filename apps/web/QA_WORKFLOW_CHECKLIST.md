# CBLUE Mock Workflow Validation Checklist

Date: 2026-05-15
Scope: customer dashboard, partner dashboard, chat sync, request/alert sequencing

## Test Accounts

- Customer A: ghiscafe@gmail.com
- Customer B: suppadesh@hotmail.com
- Partner only: suppadesh@yahoo.com

## Pre-Run Reset

1. Open customer and partner in separate browser profiles (not just tabs).
2. Hard refresh both pages.
3. Ensure local storage keys exist after interaction:
- ghis_mock_active
- ghis_mock_dyn_req
- ghis_mock_history
- chat_messages_<PO>
- cblue_po_attachments
- cblue_order_attachments

## Flow Script (11 steps)

1. Matching (Book Fixers & Pros)
- Submit request from customer booking flow.
- Confirm a PO appears in customer flow.

2. Select
- Select partner candidate.

3. Draft PO
- Verify PO number format is PO-YYMM-####.

4. Notify selected partner
- Partner requests tab shows the new request with PO details.
- Partner alert includes "Review PO Details".

5. Acceptance by selected partner
- Partner accepts PO.
- Request disappears from partner incoming requests.
- Customer alert shows acceptance.

6. Pay fee & notify proceed
- Customer clicks testing payment pill.
- Request is replaced by step-7 chat-ready request (not meeting request yet).
- Active job moves to step 7 only.

7. Chat
- Customer sends "hello" in PO room.
- Partner chat room receives the same message.
- Back from chat returns to ?tab=chat.
- Chat modal/container does not jump on Enter.

8. Meeting
- Customer request shows "Send Meeting Invitation".
- After click, partner receives meeting confirmation request.
- Upcoming meetings remain empty until partner confirms.
- After partner confirms, upcoming meetings displays the meeting.

9. Variation
- After meeting complete, customer receives variation request.
- Alert shows "Request for Approval of Variation".

10. Complete
- After variation approval, customer receives completion request.
- Alert shows "Request for job complete".

11. Rate
- Rate and close removes job from active and moves to history.
- Both dashboards show the closed state and no active action pills for that PO.

## Overview vs Full Tab Limits

Customer dashboard:
- Overview Active Jobs: latest 5
- Active Jobs tab: all active jobs
- Overview Incoming Requests: latest 3
- Requests tab: all requests
- Recent Incoming Chats: latest 2
- Chat tab: all chat rooms

Partner dashboard:
- Overview Active Jobs: latest 5
- Active Jobs tab: all active jobs
- Overview Incoming Requests: latest 3
- Requests tab: all requests
- Recent Alerts: latest 3
- Notifications tab: all alerts

## File Attachment Verification

1. Create a new booking with uploaded image(s).
2. Confirm at PO review on partner side:
- "1 file attached (Click to View)" appears.
- Clicking opens uploaded file.
3. Repeat with a second new booking and confirm file opens for the new PO too.

## Regression Checks

- Tier badge alignment in active jobs unchanged.
- Progress line width unchanged.
- PO format consistent in requests, modals, upcoming meetings, active jobs, chats.
- No duplicate synthetic top chat message in recent incoming chats.

## Pass Criteria

- No 6->7->8 overlap.
- Chat sync works customer<->partner for same PO.
- Alerts and requests advance in strict sequence.
- Uploaded files are retrievable per PO.
