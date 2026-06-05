import assert from "node:assert/strict";
import test from "node:test";

import {
  collectTerminalWorkflowPos,
  hasWorkflowCompletionMarker,
  isCompletedAwaitingWorkflowRating,
  isTerminalWorkflowStatus,
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
