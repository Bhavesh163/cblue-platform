import assert from "node:assert/strict";
import test from "node:test";

import {
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

  assert.equal(request?.workflowType, "variation_decision_partner");
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

test("returns only the three oldest future persisted confirmed meetings", () => {
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
    { ...makeMeeting("PO-NO-EVENT", "2026-07-20", "09:00", ""), workflowEvents: [] },
  ], now);

  assert.deepEqual(meetings.map((meeting) => meeting.po), ["PO-1", "PO-2", "PO-3"]);
});
