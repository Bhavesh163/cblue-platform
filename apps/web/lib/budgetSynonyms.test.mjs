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


test("normalizes common home-service typos without changing quantities", () => {
  assert.equal(normalizeBudgetServiceText("electrial wirring 2 jobs"), "electrical electrical 2 jobs");
  assert.equal(normalizeBudgetServiceText("roof leak waterproofing 30 sq.m."), "roofing roofing 30 sqm");
  assert.equal(normalizeBudgetServiceText("\u0e17\u0e32\u0e2a\u0e35 3 \u0e2b\u0e49\u0e2d\u0e07"), "painting 3 \u0e2b\u0e49\u0e2d\u0e07");
  assert.equal(normalizeBudgetServiceText("\u0e1b\u0e39\u0e01\u0e23\u0e30\u0e40\u0e1a\u0e37\u0e49\u0e2d\u0e07 20 sq.m."), "tiling 20 sqm");
});

test("normalizes digital and professional service typos to canonical tokens", () => {
  assert.equal(normalizeBudgetServiceText("webiste 10 pages and chat boot 100 FAQ"), "website 10 pages and chatbot 100 faq");
  assert.equal(normalizeBudgetServiceText("facebook ads and google ads"), "marketing and marketing");
  assert.equal(normalizeBudgetServiceText("accounting tax audit"), "accounting audit accounting audit accounting audit");
  assert.equal(normalizeBudgetServiceText("safety officer hse"), "safety officer safety officer");
});
