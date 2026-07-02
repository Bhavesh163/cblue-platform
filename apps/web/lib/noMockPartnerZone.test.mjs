import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const partnerZoneSource = readFileSync(
  new URL("../app/[locale]/partner-zone/page.tsx", import.meta.url),
  "utf8",
);

test("partner zone does not ship visible demo partner data", () => {
  for (const forbidden of [
    "DEMO_",
    "Partner Demo",
    "Demo Services",
    "partner@cblue",
    "091-xxx",
    "Basic Repair",
  ]) {
    assert.equal(
      partnerZoneSource.includes(forbidden),
      false,
      "partner-zone/page.tsx must not contain visible mock data: " + forbidden,
    );
  }
});
