import assert from "node:assert/strict";
import test from "node:test";

import {
  buildVariationSubmittedWorkflowAlert,
  canPartnerPerformWorkflowAction,
  projectCustomerVariationPresentation,
  projectPartnerWorkflowRequest,
  projectUpcomingFixerMeetings,
  projectWorkflowChatHistory,
} from "./fixerWorkflowUiProjection.js";

const step8 = {
  id: "order-9458",
  poNumber: "PO-2607-9458",
  service: "CLADDING ROOFING",
  budget: 30_700_000,
  currentStep: 8,
  workflowPhase: "MEETING_CONFIRM",
  activityBucket: "request",
  meetingDate: "2026-07-21",
  meetingTime: "14:30",
  meetingVenue: "13.794095, 100.609583",
  meetingNote: "Meet at reception.",
  actions: [{
    key: "confirm-meeting",
    owner: "partner",
    label: "Confirm Meeting",
    actionStep: 8,
  }],
};

test("projects a partner Step 8 request only from the partner-owned server action", () => {
  const request = projectPartnerWorkflowRequest(step8);

  assert.equal(request?.po, "PO-2607-9458");
  assert.equal(request?.workflowType, "meeting_confirm_partner");
  assert.equal(request?.actionKey, "confirm-meeting");
  assert.equal(request?.step, 8);
  assert.deepEqual(request?.meeting, {
    date: "2026-07-21",
    time: "14:30",
    venue: "13.794095, 100.609583",
    note: "Meet at reception.",
  });
  assert.equal(
    projectPartnerWorkflowRequest({ ...step8, actions: [{ key: "customer-cancel", owner: "customer", actionStep: 8 }] }),
    null,
  );
});

test("projects Step 9 variation for the partner and not for the customer", () => {
  const request = projectPartnerWorkflowRequest({
    ...step8,
    currentStep: 9,
    workflowPhase: "VARIATION",
    activityBucket: "active",
    actions: [
      { key: "send-variation", owner: "partner", label: "Send Variation", actionStep: 9 },
      { key: "skip-variation", owner: "partner", label: "Skip Variation", actionStep: 9 },
    ],
  });

  assert.equal(request?.workflowType, "variation_partner");
  assert.equal(request?.type, "variation_partner");
  assert.equal(request?.actionKey, "send-variation");
  assert.equal(request?.step, 9);
  assert.equal(
    projectPartnerWorkflowRequest({
      ...step8,
      currentStep: 9,
      workflowPhase: "VARIATION",
      actions: [{ key: "customer-cancel", owner: "customer", actionStep: 9 }],
    }),
    null,
  );
});

test("uses the structured Step 9 variation exactly once", () => {
  const order = {
    ...step8,
    currentStep: 9,
    workflowPhase: "VARIATION_CONFIRM",
    variation: {
      note: "please approve",
      items: [
        { service: "tile", quantity: 100, unit: "sq", unitRate: 500, total: 50000 },
        { service: "car", quantity: 1, unit: "ea", unitRate: 500000, total: 500000 },
      ],
      total: 550000,
    },
    actions: [{ key: "confirm-variation", owner: "customer", actionStep: 9 }],
  };

  assert.deepEqual(projectCustomerVariationPresentation(order), order.variation);
  assert.equal(canPartnerPerformWorkflowAction(order, "send-variation"), false);
  assert.equal(
    canPartnerPerformWorkflowAction(
      { ...order, actions: [{ key: "send-variation", owner: "partner", actionStep: 9 }] },
      "send-variation",
    ),
    true,
  );
});

test("moves terminal chat messages to a read-only authoritative history projection", () => {
  const history = projectWorkflowChatHistory({
    ...step8,
    status: "COMPLETED",
    workflowPhase: "TERMINAL",
    activityBucket: "history",
    chat: { enabled: false },
    chatMessages: [{
      id: "m1",
      text: "Persisted completion message",
      createdAt: "2026-07-19T10:00:00.000Z",
    }],
  });

  assert.equal(history?.name, "CLADDING ROOFING - PO-2607-9458 - ฿30,700,000");
  assert.equal(history?.readOnly, true);
  assert.deepEqual(history?.messageItems.map((message) => message.id), ["m1"]);
  assert.equal(projectWorkflowChatHistory(step8), null);
});

test("returns the three oldest confirmed meetings still inside the visible window", () => {
  const now = Date.parse("2026-07-19T00:00:00.000Z");
  const makeMeeting = (poNumber, date, time, confirmedAt) => ({
    ...step8,
    poNumber,
    meetingDate: date,
    meetingTime: time,
    workflowEvents: [{
      action: "confirm-meeting",
      actorRole: "partner",
      createdAt: confirmedAt,
    }],
  });
  const meetings = projectUpcomingFixerMeetings([
    makeMeeting("PO-4", "2026-07-24", "09:00", "2026-07-19T04:00:00.000Z"),
    makeMeeting("PO-2", "2026-07-22", "09:00", "2026-07-19T02:00:00.000Z"),
    makeMeeting("PO-OLD", "2026-07-18", "09:00", "2026-07-18T01:00:00.000Z"),
    makeMeeting("PO-1", "2026-07-21", "09:00", "2026-07-19T01:00:00.000Z"),
    makeMeeting("PO-3", "2026-07-23", "09:00", "2026-07-19T03:00:00.000Z"),
    // More than 3 days past the scheduled meeting time → no longer shown.
    makeMeeting("PO-EXPIRED", "2026-07-15", "09:00", "2026-07-14T01:00:00.000Z"),
    // Next workflow step already finished → meeting no longer shown.
    {
      ...makeMeeting("PO-ADVANCED", "2026-07-21", "09:00", "2026-07-19T01:30:00.000Z"),
      workflowEvents: [
        { action: "confirm-meeting", actorRole: "partner", createdAt: "2026-07-19T01:30:00.000Z" },
        { action: "send-variation", actorRole: "partner", createdAt: "2026-07-19T02:30:00.000Z" },
      ],
    },
    { ...makeMeeting("PO-NO-EVENT", "2026-07-20", "09:00", ""), workflowEvents: [] },
  ], now);

  // PO-OLD is less than 3 days past its scheduled time, so it stays visible
  // and sorts first as the oldest meeting; only three cards are shown.
  assert.deepEqual(meetings.map((meeting) => meeting.po), ["PO-OLD", "PO-1", "PO-2"]);
});

test("uses the scheduled meeting time instead of the message creation time", () => {
  const confirmedAt = "2026-07-19T10:30:00.000Z";
  const meetings = projectUpcomingFixerMeetings([{
    ...step8,
    meeting: {
      date: "2026-07-21T00:00:00.000Z",
      time: "14:30:00",
      venue: "Customer office",
      note: "Meet at reception.",
      scheduledAt: "2026-07-21T07:30:00.000Z",
      confirmedAt,
    },
    workflowEvents: [{
      action: "confirm-meeting",
      actorRole: "partner",
      createdAt: confirmedAt,
    }],
  }], Date.parse("2026-07-20T00:00:00.000Z"));

  assert.equal(meetings.length, 1);
  assert.equal(meetings[0].meetingScheduledAt, "2026-07-21T07:30:00.000Z");
  assert.equal(meetings[0].meetingConfirmedAt, confirmedAt);
  assert.notEqual(meetings[0].meetingScheduledAt, meetings[0].meetingConfirmedAt);
});

test("builds customer and partner Step 9 alerts only from the persisted send-variation event", () => {
  const order = {
    ...step8,
    currentStep: 9,
    workflowPhase: "VARIATION_CONFIRM",
    workflowEvents: [{
      action: "send-variation",
      actorRole: "partner",
      createdAt: "2026-07-20T16:50:00.000Z",
      note: "please approve",
    }],
  };

  const customerAlert = buildVariationSubmittedWorkflowAlert(order, "customer");
  const partnerAlert = buildVariationSubmittedWorkflowAlert(order, "partner");
  assert.equal(customerAlert?.createdAt, Date.parse("2026-07-20T16:50:00.000Z"));
  assert.match(customerAlert?.msg || "", /review and approve/i);
  assert.equal(partnerAlert?.createdAt, customerAlert?.createdAt);
  assert.match(partnerAlert?.msg || "", /waiting for customer approval/i);
  assert.equal(buildVariationSubmittedWorkflowAlert({ ...order, workflowEvents: [] }, "customer"), null);
});
