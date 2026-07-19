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
const customerChatPage = readFileSync(
  new URL("../app/[locale]/chat/[id]/ClientChatPage.tsx", import.meta.url),
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
  assert.match(projectionDeclaration, /mergeFixerWorkflowRecord/);
  assert.match(projectionDeclaration, /projectFixerChatRoom/);
});

test("partner modal clicks rehydrate the selected PO from current backend orders", () => {
  assert.match(partnerPage, /mergeFixerWorkflowRecord\(job,\s*authoritativeJob\)/);
  assert.match(partnerPage, /setWaitModalOrder\(hydratedJob\)/);
});

test("partner and customer chat feeds use authoritative chat projection", () => {
  assert.match(partnerPage, /projectFixerChatRoom\(/);
  assert.match(customerPage, /projectFixerChatRoom\(/);
  assert.doesNotMatch(partnerPage, /\|\| `Chat - \$\{po\}`/);
});

test("customer meeting alerts are generated from the merged authoritative order", () => {
  assert.match(customerPage, /mergeFixerWorkflowRecord\(/);
  assert.match(customerPage, /buildCustomerMeetingAwaitingPartnerAlert\(authoritativeOrder\)/);
});

test("partner feed hides disabled chat without permanently closing a live workflow", () => {
  assert.match(
    partnerPage,
    /if \(!projectedRoom\) \{\s*if \(isClosedWorkflowActivity\(authoritativeOrder\)\)/s,
  );
});

test("customer and partner pages project persisted Step 9 and meeting events", () => {
  for (const page of [customerPage, partnerPage]) {
    assert.match(page, /projectAuthoritativeFixerStep/);
    assert.match(page, /buildMeetingConfirmedWorkflowAlert/);
    assert.match(page, /workflowEvents:\s*o\.workflowEvents/);
  }

  assert.match(
    customerPage,
    /buildMeetingConfirmedWorkflowAlert\(authoritativeOrder\)/,
  );
  assert.match(
    partnerPage,
    /buildMeetingConfirmedWorkflowAlert\(order\)/,
  );
  assert.match(
    partnerPage,
    /existing\?\.authoritative !== true && createdAt >= parseTs/,
  );
});

test("partner cards and requests preserve authoritative Step 9 actions", () => {
  assert.match(partnerPage, /sourceVersion:\s*o\.sourceVersion/);
  assert.match(partnerPage, /actions:\s*o\.actions/);
  assert.match(partnerPage, /projectPartnerActiveWorkflow\(job/);
  assert.doesNotMatch(
    partnerPage,
    /const step = Math\.max\(parseWorkflowStep\(blockedStepLookup\?\.step\), backendStep, partnerWorkflowStep, localSubmittedStep, waitingCustomerStep\)/,
  );
});

test("partner meeting confirmation awaits the authoritative action snapshot", () => {
  assert.match(partnerPage, /postFixerWorkflowAction/);
  const branchStart = partnerPage.indexOf("if (isMeetingConfirmation) {");
  const branchEnd = partnerPage.indexOf("let backendAcceptError", branchStart);
  assert.ok(branchStart > 0 && branchEnd > branchStart);
  const branch = partnerPage.slice(branchStart, branchEnd);

  assert.match(branch, /await postFixerWorkflowAction\(\{/);
  assert.match(branch, /action:\s*["']confirm-meeting["']/);
  assert.match(branch, /setWaitModalOrder\(null\)/);
  assert.doesNotMatch(branch, /Date\.now\(\)/);
  assert.doesNotMatch(branch, /\/orders\/\$\{backendOrderId\}\/status/);
  assert.doesNotMatch(branch, /\/orders\/\$\{backendOrderId\}\/chat/);
  assert.doesNotMatch(branch, /meeting-confirmed-cust-/);
  assert.doesNotMatch(branch, /partner_mock_dyn_req/);
});

test("customer Step 9 stays active and uses persisted meetings/history", () => {
  assert.match(customerPage, /projectUpcomingFixerMeetings\(authoritativeWorkflowOrders\)/);
  assert.match(customerPage, /projectWorkflowChatHistory\(entry\)/);
  assert.match(customerPage, /Array\.isArray\(backendItem\.actions\)/);
  assert.match(customerPage, /send-meeting-invitation/);
  assert.match(partnerPage, /projectWorkflowChatHistory\(entry\)/);
});

test("direct fixer chat has no fabricated default room or PO parsing fallback", () => {
  assert.doesNotMatch(customerChatPage, /defaultMessages/);
  assert.doesNotMatch(customerChatPage, /ghis_mock_active/);
  assert.doesNotMatch(customerChatPage, /poFromDesc/);
  assert.doesNotMatch(customerChatPage, /po_to_order_/);
  assert.match(customerChatPage, /applyAuthoritativeOrderMetadata/);
  assert.match(customerChatPage, /serviceCategory \|\| order\?\.service \|\| order\?\.title/);
});
