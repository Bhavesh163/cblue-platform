import assert from "node:assert/strict";
import test from "node:test";

import {
  flushQueuedWorkflowBackendWrites,
  isWorkflowBackendFallbackPayload,
  persistWorkflowBackendWrites,
} from "./workflowBackendWrites.js";

function fakeStorage(entries = {}) {
  const current = { ...entries };
  return {
    getItem(key) {
      return Object.prototype.hasOwnProperty.call(current, key) ? String(current[key]) : null;
    },
    setItem(key, value) {
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

function jsonResponse(payload, init = {}) {
  return new Response(JSON.stringify(payload), {
    status: init.status ?? 200,
    headers: { "content-type": "application/json" },
  });
}

test("detects mutating-write proxy fallback payloads", () => {
  assert.equal(isWorkflowBackendFallbackPayload({ ok: true, statusFallback: true }), true);
  assert.equal(isWorkflowBackendFallbackPayload({ id: "fallback-1", statusFallback: true }), true);
  assert.equal(isWorkflowBackendFallbackPayload({ ok: true }), false);
});

test("retries workflow writes when the proxy returns fallback success", async () => {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url, options });
    if (calls.length === 1) return jsonResponse({ ok: true, statusFallback: true });
    return jsonResponse({ status: "MEETING_REQUESTED" });
  };

  const result = await persistWorkflowBackendWrites(fetchImpl, [
    {
      id: "status-PO-2606-6822",
      url: "/api/v1/orders/order-1/status",
      options: { method: "PUT", body: JSON.stringify({ status: "MEETING_REQUESTED" }) },
    },
  ], { retryAttempts: 1, retryDelayMs: 0 });

  assert.equal(result.ok, true);
  assert.equal(result.failedWrites.length, 0);
  assert.equal(calls.length, 2);
});

test("queues failed workflow writes and flushes them later", async () => {
  const storage = fakeStorage();
  const write = {
    id: "chat-PO-2606-6822",
    url: "/api/v1/orders/order-1/chat",
    options: { method: "POST", body: JSON.stringify({ text: "Customer sent meeting invitation" }) },
  };

  const failed = await persistWorkflowBackendWrites(
    async () => jsonResponse({ id: "fallback-1", statusFallback: true }, { status: 201 }),
    [write],
    { retryAttempts: 0, retryDelayMs: 0, storage },
  );

  assert.equal(failed.ok, false);
  assert.equal(JSON.parse(storage.snapshot().cblue_pending_workflow_backend_writes).length, 1);

  const flushed = await flushQueuedWorkflowBackendWrites(
    async () => jsonResponse({ id: "chat-1", text: "persisted" }, { status: 201 }),
    storage,
    { retryAttempts: 0, retryDelayMs: 0 },
  );

  assert.equal(flushed.ok, true);
  assert.equal(storage.snapshot().cblue_pending_workflow_backend_writes, undefined);
});
