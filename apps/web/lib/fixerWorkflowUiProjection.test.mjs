import assert from "node:assert/strict";
import test from "node:test";

import {
  buildCustomerMeetingAwaitingPartnerAlert,
  isCustomerFixerActionNeeded,
  mergeAuthoritativeWorkflowAlerts,
  projectPartnerMeetingConfirmation,
} from "./fixerWorkflowUiProjection.js";

const productionMeetingOrder = {
  id: "order-9458",
  po: "PO-2607-9458",
  orderNumber: "PO-2607-9458",
  status: "MEETING_REQUESTED",
  workflowPhase: "MEETING_CONFIRM",
  meetingDate: "17/07/2026",
  meetingTime: "19:34",
  meetingVenue: "Siam paragon",
  meetingNote: "Meet at the north entrance.",
  statusHistory: [{ createdAt: "2026-07-17T11:35:45.745Z" }],
};

test("projects the persisted Step 8 meeting without parsing browser or message text", () => {
  assert.deepEqual(
    projectPartnerMeetingConfirmation({
      ...productionMeetingOrder,
      description: "Wrong venue: PO-9999 on 01/01/2099 at 01:00",
      statusNote: "Customer sent an invitation to another place",
      chatText: "Meet somewhere else",
      localStorage: { meetingVenue: "Browser-only venue" },
    }),
    {
      meeting: {
        date: "17/07/2026",
        time: "19:34",
        venue: "Siam paragon",
        note: "Meet at the north entrance.",
      },
      meetingDate: "17/07/2026",
      meetingTime: "19:34",
      meetingVenue: "Siam paragon",
      meetingNote: "Meet at the north entrance.",
      meetingDateLabel: "17/07/2026",
      meetingTimeLabel: "19:34",
      venue: "Siam paragon",
    },
  );
});

test("does not mark the customer as action owner while the partner must confirm Step 8", () => {
  assert.equal(isCustomerFixerActionNeeded(productionMeetingOrder, 8), false);
  assert.equal(
    isCustomerFixerActionNeeded({ status: "IN_PROGRESS", workflowPhase: "CHAT" }, 7),
    true,
  );
});

test("builds the current customer alert from persisted state and event timestamp", () => {
  const alert = buildCustomerMeetingAwaitingPartnerAlert(productionMeetingOrder);

  assert.equal(alert?.id, "a-meeting-wait-PO-2607-9458");
  assert.equal(alert?.po, "PO-2607-9458");
  assert.equal(alert?.createdAt, Date.parse("2026-07-17T11:35:45.745Z"));
  assert.match(alert?.msg || "", /invitation was sent.*awaiting partner confirmation/i);
  assert.deepEqual(alert?.supersedesIds, [
    "a-pay-PO-2607-9458",
    "a-chat-PO-2607-9458",
  ]);
});

test("new authoritative meeting alert removes stale accepted and chat alerts for the same PO", () => {
  const current = buildCustomerMeetingAwaitingPartnerAlert(productionMeetingOrder);
  const merged = mergeAuthoritativeWorkflowAlerts([
    { id: "a-pay-PO-2607-9458", msg: "Partner accepted", createdAt: 1 },
    { id: "a-chat-PO-2607-9458", msg: "Chat active", createdAt: 2 },
    { id: "unrelated", msg: "Keep me", createdAt: 3 },
    current,
  ]);

  assert.deepEqual(merged.map((alert) => alert.id), [
    "a-meeting-wait-PO-2607-9458",
    "unrelated",
  ]);
});

test("keeps unrelated persisted alerts that use localized timestamps", () => {
  const merged = mergeAuthoritativeWorkflowAlerts([
    { id: "localized", msg: "Keep localized alert", time: "17/07/2026 19:34" },
  ]);

  assert.equal(merged.length, 1);
  assert.equal(merged[0].id, "localized");
  assert.equal(merged[0].createdAt, new Date(2026, 6, 17, 19, 34).getTime());
});
