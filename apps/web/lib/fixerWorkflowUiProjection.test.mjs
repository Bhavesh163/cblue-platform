import assert from "node:assert/strict";
import test from "node:test";

import * as workflowProjection from "./fixerWorkflowUiProjection.js";
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

test("reconciles a stale cached Step 8 request from the authoritative backend order", () => {
  assert.equal(typeof workflowProjection.reconcilePartnerMeetingRequest, "function");

  const reconciled = workflowProjection.reconcilePartnerMeetingRequest(
    {
      id: "meeting-confirm-PO-2607-9458",
      po: "PO-2607-9458",
      workflowType: "meeting_confirm_partner",
      status: "IN_PROGRESS",
      meetingDate: "01/01/2025",
      meetingTime: "00:00",
      meetingVenue: "Browser-only venue",
      meetingNote: "Browser-only note",
      projectLocation: "0.000000, 0.000000",
      siteSubdistrict: "Old District",
      cardLocation: "0.000000, 0.000000",
      location: "0.000000, 0.000000",
      subdistrict: "0.000000, 0.000000",
      actionNeeded: false,
    },
    {
      ...productionMeetingOrder,
      projectLocation: "13.794095, 100.609583",
      siteSubdistrict: "Saphan Song",
      cardLocation: "Saphan Song",
      location: "13.794095, 100.609583",
      subdistrict: "Saphan Song",
    },
  );

  assert.deepEqual(reconciled.meeting, {
    date: "17/07/2026",
    time: "19:34",
    venue: "Siam paragon",
    note: "Meet at the north entrance.",
  });
  assert.equal(reconciled.meetingDate, "17/07/2026");
  assert.equal(reconciled.meetingTime, "19:34");
  assert.equal(reconciled.meetingVenue, "Siam paragon");
  assert.equal(reconciled.meetingNote, "Meet at the north entrance.");
  assert.equal(reconciled.projectLocation, "13.794095, 100.609583");
  assert.equal(reconciled.cardLocation, "Saphan Song");
  assert.equal(reconciled.location, "13.794095, 100.609583");
  assert.equal(reconciled.subdistrict, "Saphan Song");
  assert.equal(reconciled.status, "MEETING_REQUESTED");
  assert.equal(reconciled.workflowType, "meeting_confirm_partner");
  assert.equal(reconciled.actionNeeded, true);
});

test("higher authoritative workflow stage suppresses legacy same-PO alert IDs", () => {
  const current = {
    ...buildCustomerMeetingAwaitingPartnerAlert(productionMeetingOrder),
    workflowStage: 8,
  };
  const merged = mergeAuthoritativeWorkflowAlerts([
    {
      id: "a-browser-payment-row",
      po: "PO-2607-9458",
      workflowStage: 6,
      msg: "Partner accepted",
      createdAt: Date.parse("2026-07-12T01:14:00.000Z"),
    },
    {
      id: "a-browser-chat-row",
      po: "PO-2607-9458",
      workflowStage: 7,
      msg: "Chat active",
      createdAt: Date.parse("2026-07-14T15:02:00.000Z"),
    },
    current,
  ]);

  assert.deepEqual(merged.map((alert) => alert.id), [
    "a-meeting-wait-PO-2607-9458",
  ]);
});

test("projects GPS for modals and persisted subdistrict for summary cards", () => {
  assert.equal(typeof workflowProjection.projectFixerLocations, "function");

  assert.deepEqual(
    workflowProjection.projectFixerLocations({
      address: {
        latitude: 13.794095,
        longitude: 100.609583,
        subdistrict: "Saphan Song",
        district: "Wang Thonglang",
        province: "Bangkok",
      },
    }),
    {
      projectLocation: "13.794095, 100.609583",
      siteSubdistrict: "Saphan Song",
      cardLocation: "Saphan Song",
    },
  );
});

test("authoritative server stage suppresses a falsely advanced browser alert", () => {
  const current = buildCustomerMeetingAwaitingPartnerAlert(productionMeetingOrder);
  const merged = mergeAuthoritativeWorkflowAlerts([
    {
      id: "a-stale-browser-variation",
      po: "PO-2607-9458",
      workflowStage: 9,
      msg: "Stale browser variation",
      createdAt: Date.parse("2026-07-18T00:00:00.000Z"),
    },
    current,
  ]);

  assert.equal(current?.authoritative, true);
  assert.deepEqual(merged.map((alert) => alert.id), [
    "a-meeting-wait-PO-2607-9458",
  ]);
});

test("authoritative alerts preserve unrelated unstructured legacy alerts", () => {
  const current = buildCustomerMeetingAwaitingPartnerAlert(productionMeetingOrder);
  const merged = mergeAuthoritativeWorkflowAlerts([
    {
      id: "a-unrelated-legacy-notice",
      msg: "Unrelated account notice",
      createdAt: Date.parse("2026-07-17T11:35:45.745Z"),
    },
    current,
  ]);

  assert.deepEqual(merged.map((alert) => alert.id), [
    "a-unrelated-legacy-notice",
    "a-meeting-wait-PO-2607-9458",
  ]);
});

test("uses an authoritative top-level subdistrict when address is not hydrated", () => {
  const locations = workflowProjection.projectFixerLocations({
    projectLocation: "13.794095, 100.609583",
    subdistrict: "Saphan Song",
  });

  assert.deepEqual(locations, {
    projectLocation: "13.794095, 100.609583",
    siteSubdistrict: "Saphan Song",
    cardLocation: "Saphan Song",
  });
});

test("reconciles a cached customer request to authoritative card and modal locations", () => {
  assert.equal(typeof workflowProjection.reconcileFixerCardLocations, "function");

  const reconciled = workflowProjection.reconcileFixerCardLocations(
    {
      po: "PO-2607-9458",
      cardLocation: "13.000000, 100.000000",
      location: "13.000000, 100.000000",
      subdistrict: "13.000000, 100.000000",
    },
    {
      projectLocation: "13.794095, 100.609583",
      siteSubdistrict: "Saphan Song",
    },
  );

  assert.equal(reconciled.projectLocation, "13.794095, 100.609583");
  assert.equal(reconciled.cardLocation, "Saphan Song");
  assert.equal(reconciled.location, "13.794095, 100.609583");
  assert.equal(reconciled.subdistrict, "Saphan Song");
});
