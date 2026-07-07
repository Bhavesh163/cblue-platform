import assert from "node:assert/strict";
import test from "node:test";

import { normalizeBudgetServiceText } from "./budgetSynonyms.js";

test("normalizes fit-out spelling errors to the same service token", () => {
  assert.equal(normalizeBudgetServiceText("fit out"), "fitout");
  assert.equal(normalizeBudgetServiceText("fit-out"), "fitout");
  assert.equal(normalizeBudgetServiceText("fiiitout"), "fitout");
});

test("normalizes plumbing shorthand and Thai typing errors", () => {
  assert.equal(normalizeBudgetServiceText("plumb"), "plumbing");
  assert.equal(normalizeBudgetServiceText("งานประปา"), "งาน plumbing");
  assert.equal(normalizeBudgetServiceText("งานปประปา"), "งานป plumbing");
  assert.equal(normalizeBudgetServiceText("water pipe repair"), "plumbing repair");
});
