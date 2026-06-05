import assert from "node:assert/strict";
import test from "node:test";

import {
  collectTerminalWorkflowPos,
  hasWorkflowCompletionMarker,
  isCompletedAwaitingWorkflowRating,
  isTerminalWorkflowStatus,
  pruneWorkflowStorage,
  readBrowserTerminalWorkflowPos,
} from "./workflowVisibility.js";

function fakeStorage(entries) {
  const current = { ...entries };
  const keys = () => Object.keys(current);
  const rows = Object.entries(entries);
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
