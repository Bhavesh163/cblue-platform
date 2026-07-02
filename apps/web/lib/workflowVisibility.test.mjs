import assert from "node:assert/strict";
import test from "node:test";

import {
  parseWorkflowMeetingInviteDetails,
  isWorkflowMeetingCardVisible,
  buildMeetingConfirmedAlert,
  collectTerminalWorkflowPos,
  filterLiveWorkflowItems,
  hasWorkflowCompletionMarker,
  isCompletedAwaitingWorkflowRating,
  isTerminalWorkflowStatus,
  normalizeWorkflowHistoryItems,
  pickWorkflowMeetingVenue,
  pruneWorkflowStorage,
  readBrowserTerminalWorkflowPos,
  setWorkflowStorageItem,
} from "./workflowVisibility.js";

function fakeStorage(entries, options = {}) {
  const current = { ...entries };
  const quotaBytes = options.quotaBytes ?? Infinity;
  const keys = () => Object.keys(current);
  const sizeOf = (rows) =>
    Object.entries(rows).reduce(
      (total, [key, value]) => total + (key.length + String(value ?? "").length) * 2,
      0,
    );
  return {
    get length() {
      return keys().length;
    },
    key(index) {
      return keys()[index] ?? null;
    },
    getItem(key) {
      return Object.prototype.hasOwnProperty.call(current, key)
        ? String(current[key])
        : null;
    },
    setItem(key, value) {
      const next = { ...current, [key]: String(value) };
      if (sizeOf(next) > quotaBytes) {
        const error = new Error("The quota has been exceeded.");
        error.name = "QuotaExceededError";
        throw error;
      }
      current[key] = String(value);
    },
    removeItem(key) {
      delete current[key];
    },
    snapshot() {
      return { ...current };
    },
  };
}

test("detects terminal workflow markers from chat and closed storage keys", () => {
  assert.equal(
    hasWorkflowCompletionMarker([
      { text: "[SYSTEM] Partner has rated this project 5/5 stars. The job is now complete." },
    ]),
    true,
  );

  const terminalPos = readBrowserTerminalWorkflowPos(
    fakeStorage({
      "chat_closed_PO-2606-6500": "1",
      "chat_closed_PO-2606-7777": "1",
      "chat_messages_PO-2606-3017": JSON.stringify([
        { text: "[SYSTEM] Payment confirmed. Chat room is now active." },
      ]),
      "chat_messages_PO-2606-6500": JSON.stringify([
        { text: "[SYSTEM] Customer rated this project 5/5 stars. Workflow completed." },
      ]),
      partner_alerts: JSON.stringify([
        {
          message:
            "PO-2606-8888: You rated the customer 5/5. This job is complete and stored in History.",
        },
      ]),
      ghis_mock_history: JSON.stringify([{ po: "PO-2606-9999" }]),
    }),
  );

  assert.deepEqual([...terminalPos].sort(), [
    "PO-2606-6500",
    "PO-2606-8888",
    "PO-2606-9999",
  ]);
});

test("parses customer meeting invitation without truncating GPS venue", () => {
  const parsed = parseWorkflowMeetingInviteDetails(
    "[SYSTEM] Customer sent meeting invitation for PO-2606-4636: 25/06/2026 16:52 at 13.793951, 100.609606. Note: bring water too.. Next: waiting for partner confirmation before variation.",
  );

  assert.equal(parsed.po, "PO-2606-4636");
  assert.equal(parsed.meetingDate, "25/06/2026");
  assert.equal(parsed.meetingTime, "16:52");
  assert.equal(parsed.meetingVenue, "13.793951, 100.609606");
  assert.equal(parsed.meetingNote, "bring water too.");
});

test("parses partner confirmed meeting status note with date time and venue", () => {
  const parsed = parseWorkflowMeetingInviteDetails(
    "Partner confirmed site meeting for PO-2606-4636: 25/06/2026 16:52 at 13.793951, 100.609606. Next: Send variation if needed.",
  );

  assert.equal(parsed.po, "PO-2606-4636");
  assert.equal(parsed.meetingDate, "25/06/2026");
  assert.equal(parsed.meetingTime, "16:52");
  assert.equal(parsed.meetingVenue, "13.793951, 100.609606");
});

test("keeps recently confirmed meetings visible even when proposed time is past", () => {
  const now = Date.UTC(2026, 5, 28, 12, 0);
  const confirmedAt = Date.UTC(2026, 5, 28, 11, 55);

  assert.equal(
    isWorkflowMeetingCardVisible({
      meetingDate: "25/06/2026",
      meetingTime: "16:52",
      createdAt: confirmedAt,
      now,
    }),
    true,
  );
});

test("builds exact meeting-confirmed alerts with timestamps for partner and customer", () => {
  const createdAt = Date.UTC(2026, 5, 25, 9, 52);
  const partnerAlert = buildMeetingConfirmedAlert({
    id: "meeting-confirmed-PO-2606-4636",
    po: "PO-2606-4636",
    audience: "partner",
    createdAt,
  });
  const customerAlert = buildMeetingConfirmedAlert({
    id: "meeting-confirmed-cust-PO-2606-4636",
    po: "PO-2606-4636",
    audience: "customer",
    createdAt,
  });

  assert.equal(partnerAlert.msg, "PO-2606-4636 Meeting confirmed. Next: Send variation if needed.");
  assert.equal(partnerAlert.message, partnerAlert.msg);
  assert.equal(partnerAlert.createdAt, createdAt);
  assert.equal(partnerAlert.timestamp, new Date(createdAt).toISOString());
  assert.equal(customerAlert.msg, "PO-2606-4636 Meeting confirmed");
  assert.equal(customerAlert.message, customerAlert.msg);
  assert.equal(customerAlert.createdAt, createdAt);
});

test("keeps backend completed orders visible until rating/history closes the workflow", () => {
  assert.equal(isTerminalWorkflowStatus("COMPLETED"), false);
  assert.equal(isTerminalWorkflowStatus("DONE"), true);
  assert.equal(
    isCompletedAwaitingWorkflowRating({
      status: "COMPLETED",
      statusHistory: [{ note: "Customer confirmed project complete." }],
    }),
    true,
  );
  assert.equal(
    isCompletedAwaitingWorkflowRating({
      status: "COMPLETED",
      statusNote: "Partner rated the customer. This job is complete and now stored in History.",
    }),
    false,
  );

  const terminalPos = collectTerminalWorkflowPos({
    backendOrders: [
      { status: "COMPLETED", description: "PO-2606-1111 | Kitchen" },
      { status: "DONE", description: "PO-2606-7777 | Closed legacy order" },
      { status: "IN_PROGRESS", description: "PO-2606-2222 | Smart Home" },
    ],
    historyItems: [{ po: "PO-2606-3333" }],
    alerts: [
      {
        message:
          "PO-2606-4444: Customer rated this project 5/5 stars. Workflow completed.",
      },
      {
        message:
          "PO-2606-5555: Customer sent a site meeting invitation. Please confirm.",
      },
    ],
    terminalPoValues: ["PO-2606-6666"],
  });

  assert.deepEqual(
    [...terminalPos].sort(),
    ["PO-2606-3333", "PO-2606-4444", "PO-2606-6666", "PO-2606-7777"],
  );
});

test("does not treat already-rated completed jobs as active rating work", () => {
  assert.equal(
    isCompletedAwaitingWorkflowRating({
      status: "COMPLETED",
      statusHistory: [
        { note: "Customer confirmed project complete. Rating is now open for both parties." },
        { note: "Customer rated this project 5/5 stars. Workflow completed." },
      ],
    }),
    false,
  );

  assert.equal(
    isCompletedAwaitingWorkflowRating({
      status: "COMPLETED",
      statusHistory: [{ note: "Customer confirmed project complete. Please rate your partner." }],
      rating: 5,
    }),
    false,
  );
});

test("compacts workflow history instead of throwing when localStorage quota is full", () => {
  const storage = fakeStorage(
    {
      "cblue_po_breakdown_PO-2606-1111": "x".repeat(200),
      ghis_mock_history: JSON.stringify([{ po: "PO-2606-0001", title: "Old" }]),
    },
    { quotaBytes: 2400 },
  );
  const largeHistory = [
    {
      po: "PO-2606-5653",
      title: "MEP RETROFIT",
      service: "MEP RETROFIT",
      description: "detail ".repeat(400),
      projectDetails: "project ".repeat(400),
      images: ["data:image/png;base64," + "a".repeat(1600)],
      attachments: ["data:application/pdf;base64," + "b".repeat(1600)],
      chatHistory: Array.from({ length: 30 }, (_, index) => ({
        text: `message ${index} ${"x".repeat(200)}`,
        createdAt: 1000 + index,
      })),
      completedAt: 2000,
      status: "COMPLETED",
    },
  ];

  const result = setWorkflowStorageItem(storage, "ghis_mock_history", largeHistory, {
    softLimitBytes: 10,
  });

  assert.equal(result.ok, true);
  assert.equal(result.compacted, true);
  const stored = JSON.parse(storage.getItem("ghis_mock_history") || "[]");
  assert.equal(stored[0].po, "PO-2606-5653");
  assert.ok(stored[0].chatHistory.length <= 8);
  assert.equal(stored[0].images, undefined);
  assert.equal(storage.getItem("cblue_po_breakdown_PO-2606-1111"), null);
});

test("compacts existing history so active request writes can still persist", () => {
  const bulkyHistory = [{
    po: "PO-2606-1111",
    title: "OLD JOB",
    description: "detail ".repeat(500),
    chatHistory: Array.from({ length: 30 }, (_, index) => ({
      text: `archived message ${index} ${"x".repeat(180)}`,
      createdAt: index,
    })),
    completedAt: 1000,
    status: "COMPLETED",
  }];
  const storage = fakeStorage(
    {
      ghis_mock_history: JSON.stringify(bulkyHistory),
    },
    { quotaBytes: 2600 },
  );

  const result = setWorkflowStorageItem(
    storage,
    "partner_mock_dyn_req",
    [{ po: "PO-2606-5653", type: "rate_partner", step: 11 }],
    { softLimitBytes: 10 },
  );

  assert.equal(result.ok, true);
  const storedReqs = JSON.parse(storage.getItem("partner_mock_dyn_req") || "[]");
  const storedHistory = JSON.parse(storage.getItem("ghis_mock_history") || "[]");
  assert.equal(storedReqs[0].po, "PO-2606-5653");
  assert.ok(storedHistory[0].chatHistory.length <= 2);
});

test("prunes budget caches without deleting workflow history", () => {
  const storage = fakeStorage({
    ghis_mock_history: JSON.stringify([{ po: "PO-2606-6500" }]),
    "cblue_po_breakdown_PO-2606-6500": "x".repeat(80),
    "cblue_po_breakdown_PO-2606-3017": "x".repeat(80),
  });

  const removed = pruneWorkflowStorage(storage, 10);

  assert.deepEqual(removed.sort(), [
    "cblue_po_breakdown_PO-2606-3017",
    "cblue_po_breakdown_PO-2606-6500",
  ]);
  assert.equal(
    storage.snapshot().ghis_mock_history,
    JSON.stringify([{ po: "PO-2606-6500" }]),
  );
});

test("meeting venue prefers the customer-entered venue over project GPS coordinates", () => {
  assert.equal(
    pickWorkflowMeetingVenue("Siam paragon", "13.794068, 100.609587"),
    "Siam paragon",
  );
  assert.equal(
    pickWorkflowMeetingVenue("", "13.794068, 100.609587"),
    "13.794068, 100.609587",
  );
});

test("filters terminal workflow requests without hiding completed jobs awaiting rating", () => {
  const visible = filterLiveWorkflowItems(
    [
      { po: "PO-2606-1111", type: "complete_pending", desc: "Partner completion request" },
      {
        po: "PO-2606-2222",
        type: "rate_pending",
        status: "COMPLETED",
        statusHistory: [{ note: "Customer confirmed project complete. Please rate your partner." }],
      },
      { po: "PO-2606-3333", type: "rate_pending", status: "COMPLETED", rating: 5 },
      { po: "PO-2606-4444", type: "payment_pending" },
      { po: "PO-2606-5555", status: "CANCELLED" },
      { po: "PO-2606-6666", status: "FINISHED" },
      { po: "PO-2606-7777", status: "RATED" },
    ],
    new Set(["PO-2606-4444"]),
  ).map((item) => item.po);

  assert.deepEqual(visible, ["PO-2606-1111", "PO-2606-2222"]);
});

test("preserves terminal customer history entries during storage synchronization", () => {
  const history = normalizeWorkflowHistoryItems([
    {
      po: "PO-2606-6049",
      status: "COMPLETED",
      customerRating: 5,
      statusNote: "Customer rated this project 5/5 stars. Workflow completed.",
    },
    { po: "PO-2606-7001", status: "CANCELLED" },
  ]);

  assert.deepEqual(history.map((item) => item.po), [
    "PO-2606-6049",
    "PO-2606-7001",
  ]);
});
