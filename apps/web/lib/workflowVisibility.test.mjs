import assert from "node:assert/strict";
import test from "node:test";

import {
  collectTerminalWorkflowPos,
  hasWorkflowCompletionMarker,
  readBrowserTerminalWorkflowPos,
} from "./workflowVisibility.js";

function fakeStorage(entries) {
  const rows = Object.entries(entries);
  return {
    length: rows.length,
    key(index) {
      return rows[index]?.[0] ?? null;
    },
    getItem(key) {
      return Object.prototype.hasOwnProperty.call(entries, key)
        ? String(entries[key])
        : null;
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
    }),
  );

  assert.deepEqual([...terminalPos].sort(), ["PO-2606-6500"]);
});

test("collects terminal POs from backend status, history, and alert text", () => {
  const terminalPos = collectTerminalWorkflowPos({
    backendOrders: [
      { status: "COMPLETED", description: "PO-2606-1111 | Kitchen" },
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
    ["PO-2606-1111", "PO-2606-3333", "PO-2606-4444", "PO-2606-6666"],
  );
});
