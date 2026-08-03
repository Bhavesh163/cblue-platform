import assert from "node:assert/strict";
import test from "node:test";
import { visibleQualificationDocuments } from "./qualificationAdminProjection.mjs";

test("keeps current evidence and removes retired legacy back-ID records", () => {
  const result = visibleQualificationDocuments([
    {
      id: "front",
      documentType: "id-front",
      isActive: true,
      lifecycleState: "READY",
    },
    {
      id: "selfie",
      documentType: "selfie-with-id",
      isActive: true,
      lifecycleState: "READY",
    },
    {
      id: "back",
      documentType: "id-back",
      isActive: true,
      lifecycleState: "READY",
    },
    {
      id: "deleted",
      documentType: "portfolio",
      isActive: false,
      lifecycleState: "DELETE_PENDING",
    },
  ]);

  assert.deepEqual(
    result.map((document) => document.id),
    ["front", "selfie"],
  );
});
