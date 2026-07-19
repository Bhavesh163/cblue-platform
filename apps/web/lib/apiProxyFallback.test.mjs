import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const proxyRoute = readFileSync(
  new URL("../app/api/v1/[...path]/route.ts", import.meta.url),
  "utf8",
);

test("proxy safely returns a nullable fixer profile only for GET fixers/me upstream failures", () => {
  assert.match(proxyRoute, /shouldReturnFixerProfileFallback/);
  assert.match(proxyRoute, /routePath === ["']fixers\/me["']/);
  assert.match(proxyRoute, /Response\.json\(null/);
});

test("proxy safely returns an empty list only for GET order attachment upstream failures", () => {
  assert.match(proxyRoute, /orders\\\/\[\^\/\]\+\\\/attachments/);
  assert.match(proxyRoute, /shouldReturnEmptyListFallback/);
});
