import assert from "node:assert/strict";
import test from "node:test";

import { postFixerWorkflowAction } from "./fixerWorkflowClient.js";

test("posts an authenticated idempotent fixer workflow action and returns its snapshot", async () => {
  const calls = [];
  const expected = {
    sourceVersion: "cblue-fixer-workflow-v1",
    poNumber: "PO-2607-9458",
    currentStep: 9,
    workflowPhase: "VARIATION",
  };
  const fetchImpl = async (...args) => {
    calls.push(args);
    return {
      ok: true,
      json: async () => expected,
    };
  };

  const result = await postFixerWorkflowAction({
    poNumber: "PO-2607-9458",
    action: "confirm-meeting",
    token: "user-token",
    idempotencyKey: "meeting-confirm-9458",
    apiBase: "/api/v1",
    fetchImpl,
  });

  assert.equal(result, expected);
  assert.equal(
    calls[0][0],
    "/api/v1/blue/workflow-details/PO-2607-9458/actions/confirm-meeting",
  );
  assert.deepEqual(calls[0][1], {
    method: "POST",
    headers: {
      Authorization: "Bearer user-token",
      "Content-Type": "application/json",
      "Idempotency-Key": "meeting-confirm-9458",
    },
    body: "{}",
  });
});

test("rejects a failed authoritative action without fabricating a workflow snapshot", async () => {
  await assert.rejects(
    () => postFixerWorkflowAction({
      poNumber: "PO-2607-9458",
      action: "confirm-meeting",
      token: "user-token",
      fetchImpl: async () => ({
        ok: false,
        status: 409,
        json: async () => ({ message: "Stale workflow revision" }),
      }),
    }),
    /Stale workflow revision/,
  );
});

test("requires the PO, action, and authenticated user token", async () => {
  await assert.rejects(
    () => postFixerWorkflowAction({ poNumber: "", action: "confirm-meeting", token: "x" }),
    /PO number/,
  );
  await assert.rejects(
    () => postFixerWorkflowAction({ poNumber: "PO-2607-9458", action: "", token: "x" }),
    /action/,
  );
  await assert.rejects(
    () => postFixerWorkflowAction({ poNumber: "PO-2607-9458", action: "confirm-meeting", token: "" }),
    /authenticated/,
  );
});
