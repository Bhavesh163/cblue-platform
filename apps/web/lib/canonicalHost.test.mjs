import assert from "node:assert/strict";
import test from "node:test";

import { getCanonicalCblueUrl } from "./canonicalHost.js";

test("canonicalizes www CBLUE pages onto the shared apex origin", () => {
  const result = getCanonicalCblueUrl(
    "https://www.cblue.co.th/en/dashboard?tab=active",
    "www.cblue.co.th",
  );

  assert.equal(
    result?.toString(),
    "https://cblue.co.th/en/dashboard?tab=active",
  );
});

test("leaves the apex host and development hosts unchanged", () => {
  assert.equal(
    getCanonicalCblueUrl("https://cblue.co.th/en/dashboard", "cblue.co.th"),
    null,
  );
  assert.equal(
    getCanonicalCblueUrl("http://localhost:3000/en/dashboard", "localhost:3000"),
    null,
  );
});
