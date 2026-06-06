import assert from "node:assert/strict";
import {
  extractWorkflowCompleteRequest,
  getWorkflowStatusNote,
  isVisibleWorkflowSystemText,
  isWorkflowPoReferencedInStorage,
  persistPartnerCompletionStatusNote,
} from "./workflowLiveReferences.js";

class MemoryStorage {
  constructor(values = {}) {
    this.values = new Map(Object.entries(values));
  }

  getItem(key) {
    return this.values.has(key) ? this.values.get(key) : null;
  }
}

{
  const storage = new MemoryStorage({
    ghis_mock_active: JSON.stringify([{ po: "PO-2606-4134", step: 7 }]),
  });
  assert.equal(isWorkflowPoReferencedInStorage(storage, "PO-2606-4134"), true);
}

{
  const storage = new MemoryStorage({
    ghis_mock_active: JSON.stringify([{ po: "PO-2606-4134", step: 7 }]),
    ghis_mock_history: JSON.stringify([{ po: "PO-2606-4134", status: "COMPLETED" }]),
  });
  assert.equal(isWorkflowPoReferencedInStorage(storage, "PO-2606-4134"), false);
}

{
  const storage = new MemoryStorage({
    partner_mock_dyn_req: JSON.stringify([{ po: "PO-2606-4134", type: "complete_pending" }]),
  });
  assert.equal(isWorkflowPoReferencedInStorage(storage, "PO-2606-4134"), true);
  assert.equal(isWorkflowPoReferencedInStorage(storage, "PO-2606-9999"), false);
}

assert.equal(
  extractWorkflowCompleteRequest("[SYSTEM] Partner has marked the job as complete. [COMPLETE_DATA]All done[/COMPLETE_DATA]"),
  "All done",
);

assert.ok(
  extractWorkflowCompleteRequest("Partner submitted project-complete request for PO-2606-4134."),
);

assert.equal(
  getWorkflowStatusNote({
    statusNote: "Order is in progress.",
    statusHistory: [
      { note: "Order created" },
      { note: "Partner submitted project-complete request for PO-2606-4134. [COMPLETE_DATA]Finished cleanly[/COMPLETE_DATA]" },
    ],
  }),
  "Partner submitted project-complete request for PO-2606-4134. [COMPLETE_DATA]Finished cleanly[/COMPLETE_DATA]",
);

assert.equal(
  isVisibleWorkflowSystemText("[CBLUE] Payment confirmed for CONSULTING (PO-2606-4134). Chat room is now active."),
  true,
);

{
  const calls = [];
  const ok = await persistPartnerCompletionStatusNote({
    chatText: "[SYSTEM] Partner has marked the job as complete. [COMPLETE_DATA]Finished cleanly[/COMPLETE_DATA]",
    fetchFn: async (...args) => {
      calls.push(args);
      return { ok: true };
    },
    po: "PO-2606-4134",
    resolveOrderIdByPo: async () => "order-123",
    storage: new MemoryStorage({ "po_to_order_PO-2606-4134": "order-123" }),
    token: "token-123",
  });

  assert.equal(ok, true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], "/api/v1/orders/order-123/status");
  assert.match(calls[0][1].body, /project-complete request/);
}
