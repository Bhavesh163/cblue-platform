import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const partnerPage = readFileSync(
  new URL("../app/[locale]/fixers/page.tsx", import.meta.url),
  "utf8",
);
const customerPage = readFileSync(
  new URL("../app/[locale]/dashboard/page.tsx", import.meta.url),
  "utf8",
);
const projectionDeclaration = readFileSync(
  new URL("./fixerWorkflowUiProjection.d.ts", import.meta.url),
  "utf8",
);

test("partner Step 8 requests reconcile cached rows from authoritative orders", () => {
  assert.match(partnerPage, /reconcilePartnerMeetingRequest/);
  assert.match(partnerPage, /projectFixerLocations\(o\)/);
  assert.doesNotMatch(
    partnerPage,
    /const inviteDetails = parseMeetingInviteDetails\(`\$\{job\.statusNote/,
  );
});

test("customer alerts keep local event timestamps and use workflow stage precedence", () => {
  assert.doesNotMatch(customerPage, /getWorkflowOrderEventTs/);
  assert.match(customerPage, /workflowStage:\s*6/);
  assert.match(customerPage, /workflowStage:\s*8/);
});

test("customer and partner cards consume split card locations", () => {
  assert.match(customerPage, /projectFixerLocations\(o\)/);
  assert.ok((customerPage.match(/item\.cardLocation/g) || []).length >= 3);
  assert.match(customerPage, /cardLocation: activeItem\?\.cardLocation/);
  assert.match(customerPage, /reconcileFixerCardLocations\(request, backendItem\)/);
  assert.match(partnerPage, /job\.cardLocation/);
  assert.match(partnerPage, /req\.cardLocation/);
});

test("TypeScript declarations expose the authoritative projection helpers", () => {
  assert.match(projectionDeclaration, /projectFixerLocations/);
  assert.match(projectionDeclaration, /reconcileFixerCardLocations/);
  assert.match(projectionDeclaration, /reconcilePartnerMeetingRequest/);
});
