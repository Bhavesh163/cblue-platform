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
const propertyRegisterPage = readFileSync(
  new URL("../app/[locale]/properties/register/page.tsx", import.meta.url),
  "utf8",
);
const fixerRegisterPage = readFileSync(
  new URL("../app/[locale]/fixers/register/page.tsx", import.meta.url),
  "utf8",
);
const subscriptionRegisterPage = readFileSync(
  new URL("../app/[locale]/subscription/register/page.tsx", import.meta.url),
  "utf8",
);
const passwordInput = readFileSync(
  new URL("../app/[locale]/components/PasswordInput.tsx", import.meta.url),
  "utf8",
);
const realEstatePage = readFileSync(
  new URL("../app/[locale]/properties/page.tsx", import.meta.url),
  "utf8",
);
const propertyProjectionDeclaration = readFileSync(
  new URL("./propertyWorkflowProjection.d.ts", import.meta.url),
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

test("customer property alerts consume persisted audience-specific workflow events", () => {
  assert.match(propertyProjectionDeclaration, /latestPropertyWorkflowAlert/);
  assert.match(customerPage, /latestPropertyWorkflowAlert\(p,\s*["']customer["']\)/);
  assert.match(customerPage, /workflowEvents:\s*Array\.isArray\(api\?\.workflowEvents\)/);
  assert.doesNotMatch(
    customerPage,
    /Please wait for the selected lister to accept the inquiry/,
  );
});

test("property meeting notes map from CBLUE and render in the lister confirmation modal", () => {
  assert.match(customerPage, /meetingNote:\s*api\.meetingNote/);
  assert.match(partnerPage, /meetingNote:\s*api\.meetingNote/);
  assert.match(partnerPage, /propMeetingConfirmModal\.meetingNote/);
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

test("Step 9 uses structured variation data and exact action ownership", () => {
  assert.match(partnerPage, /canPartnerPerformWorkflowAction\(job,\s*["']send-variation["']\)/);
  assert.match(customerPage, /projectCustomerVariationPresentation\(/);

  const modalStart = customerPage.indexOf("{variationApproveModal && (");
  const modalEnd = customerPage.indexOf("{completeApproveModal && (", modalStart);
  assert.ok(modalStart > 0 && modalEnd > modalStart);
  const variationModal = customerPage.slice(modalStart, modalEnd);
  assert.doesNotMatch(variationModal, /Confirmed Site Meeting/);
  assert.doesNotMatch(variationModal, /readStoredVariationPriceList/);
  assert.doesNotMatch(variationModal, /parseVariationPriceList/);
});

test("both partner Step 9 forms persist structured variation rows", () => {
  assert.match(partnerPage, /const toFixerWorkflowVariationItems/);
  assert.equal(
    (partnerPage.match(/variationItems:\s*toFixerWorkflowVariationItems\(variationItems\)/g) || []).length,
    2,
  );
  assert.equal((partnerPage.match(/priceListRows\);/g) || []).length >= 2, true);
});

test("all three booking forms resolve GPS address fields during submit", () => {
  for (const relativePath of [
    "../app/[locale]/booking/household/page.tsx",
    "../app/[locale]/booking/project/page.tsx",
    "../app/[locale]/booking/professional/page.tsx",
  ]) {
    const page = readFileSync(new URL(relativePath, import.meta.url), "utf8");
    const submitStart = page.indexOf("async function handleSubmit");
    const successStart = page.indexOf("if (success)", submitStart);
    const submitBody = page.slice(submitStart, successStart);
    assert.ok(submitBody.includes("await normalizeGpsAddressForSubmit(gpsCoords"));
    assert.match(submitBody, /resolvedSubmitAddress/);
  }
});

test("embedded fixer, booking, and property authentication exposes visible password controls", () => {
  assert.match(passwordInput, /aria-label=\{label\}/);
  assert.match(passwordInput, /aria-pressed=\{visible\}/);
  assert.match(passwordInput, /data-password-visibility/);
  assert.match(passwordInput, /border-l border-gray-300 bg-gray-50 text-sky-900/);
  assert.match(passwordInput, /type=\{visible \? "text" : "password"\}/);
  assert.ok((fixerRegisterPage.match(/<PasswordInput/g) || []).length >= 2);
  assert.ok((propertyRegisterPage.match(/<PasswordInput/g) || []).length >= 2);
  assert.ok((subscriptionRegisterPage.match(/<PasswordInput/g) || []).length >= 2);
  assert.match(propertyRegisterPage, /<ReCaptcha/);
  assert.match(propertyRegisterPage, /!recaptchaToken/);
  const propertyPayload = propertyRegisterPage.slice(
    propertyRegisterPage.indexOf("const payload = {"),
    propertyRegisterPage.indexOf("const submitListing", propertyRegisterPage.indexOf("const payload = {")),
  );
  assert.doesNotMatch(propertyPayload, /recaptchaToken/);
  assert.match(subscriptionRegisterPage, /<ReCaptcha/);
  assert.match(subscriptionRegisterPage, /recaptchaToken/);
  assert.match(subscriptionRegisterPage, /!pdpaConsent \\|\\| !recaptchaToken/);
  const registrationRequest = subscriptionRegisterPage.slice(
    subscriptionRegisterPage.indexOf("body: JSON.stringify("),
    subscriptionRegisterPage.indexOf("      });", subscriptionRegisterPage.indexOf("body: JSON.stringify(")),
  );
  assert.doesNotMatch(registrationRequest, /recaptchaToken/);

  for (const relativePath of [
    "../app/[locale]/booking/household/page.tsx",
    "../app/[locale]/booking/project/page.tsx",
    "../app/[locale]/booking/professional/page.tsx",
  ]) {
    const page = readFileSync(new URL(relativePath, import.meta.url), "utf8");
    assert.ok((page.match(/<PasswordInput/g) || []).length >= 2);
  }
});

test("logged-in property contact fields use the authoritative profile and remain read-only", () => {
  assert.match(propertyRegisterPage, /fetchWithSubscriberSession\(/);
  assert.match(propertyRegisterPage, /["']\/api\/v1\/users\/me["']/);
  assert.doesNotMatch(propertyRegisterPage, /if \(!stored \|\| !token\)/);
  assert.match(propertyRegisterPage, /setProfileSessionState\("authenticated"\)/);
  assert.match(propertyRegisterPage, /submissionContact\?\.phone \|\| form\.contactPhone/);
  assert.match(propertyRegisterPage, /contactPhone: profile\.phone/);
  assert.equal(
    (propertyRegisterPage.match(/readOnly=\{profileSessionState !== "anonymous"\}/g) || []).length,
    3,
  );
  assert.equal(
    (propertyRegisterPage.match(/aria-readonly=\{profileSessionState !== "anonymous"\}/g) || []).length,
    3,
  );
  assert.match(propertyRegisterPage, /These contact details come from your account profile and cannot be changed in this listing/);
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
  assert.match(partnerPage, /projectUpcomingFixerMeetings\(mappedOrders\)/);
  assert.match(customerPage, /projectWorkflowChatHistory\(entry\)/);
  assert.match(customerPage, /Array\.isArray\(backendItem\.actions\)/);
  assert.match(customerPage, /send-meeting-invitation/);
  assert.match(partnerPage, /projectWorkflowChatHistory\(entry\)/);
});

test("customer and partner Steps 9-11 use authoritative workflow mutations", () => {
  for (const action of ["confirm-variation", "confirm-completion", "rate-partner"]) {
    assert.match(customerPage, new RegExp(`action:\\s*["']${action}["']`));
  }
  for (const action of ["send-variation", "skip-variation", "send-completion", "rate-customer"]) {
    assert.match(partnerPage, new RegExp(`action:\\s*["']${action}["']`));
  }
  assert.match(customerPage, /projectCustomerWorkflowRequest/);
  assert.match(partnerPage, /projectPartnerWorkflowRequest/);
});

test("customer and partner dashboard refreshes are non-overlapping and not five-second database floods", () => {
  for (const page of [customerPage, partnerPage]) {
    assert.match(page, /refreshInFlight/);
    assert.match(page, /if \(refreshInFlight\) return/);
    assert.match(page, /}, 30000\)/);
  }
});
test("partner orders preserve the normalized nested meeting snapshot", () => {
  assert.match(partnerPage, /date:\s*o\.meeting\?\.date\s*\|\|\s*o\.meetingDate/);
  assert.match(partnerPage, /scheduledAt:\s*o\.meeting\.scheduledAt/);
  assert.match(partnerPage, /confirmedAt:\s*o\.meeting\.confirmedAt/);
});

test("direct fixer chat has no fabricated default room or PO parsing fallback", () => {
  assert.doesNotMatch(customerChatPage, /defaultMessages/);
  assert.doesNotMatch(customerChatPage, /ghis_mock_active/);
  assert.doesNotMatch(customerChatPage, /poFromDesc/);
  assert.doesNotMatch(customerChatPage, /po_to_order_/);
  assert.match(customerChatPage, /applyAuthoritativeOrderMetadata/);
  assert.match(customerChatPage, /serviceCategory \|\| order\?\.service \|\| order\?\.title/);
});

test("property registration persists authoritative GPS mode and resolved matching fields", () => {
  const submitStart = propertyRegisterPage.indexOf("async function handleSubmit");
  const submitEnd = propertyRegisterPage.indexOf("if (submitted)", submitStart);
  const submitBody = propertyRegisterPage.slice(submitStart, submitEnd);
  assert.ok(submitBody.includes("await normalizeGpsAddressForSubmit(gpsCoords"));
  assert.match(submitBody, /province: persistedLocation.province/);
  assert.match(submitBody, /subdistrict:.*persistedLocation\.subdistrict/);
});

test("real-estate summaries and workflow modals use separate location projections", () => {
  assert.ok(realEstatePage.includes('getPropertySummaryLocation(prop)'));
  assert.ok(realEstatePage.includes('getPropertyModalLocation(showContactFlow)'));
  assert.doesNotMatch(realEstatePage, /function getPropertySiteLocation/);
});

test("real-estate filters cascade province, district, and subdistrict datasets", () => {
  assert.match(realEstatePage, /getDistrictsForProvince\(filters\.province\)/);
  assert.match(realEstatePage, /getSubdistrictsForDistrict\(/);
  assert.match(realEstatePage, /filters\.province,\s*filters\.district/);
  assert.match(realEstatePage, /district: e\.target\.value,[\s\S]*subdistrict: ""/);
  assert.match(realEstatePage, /disabled=\{!filters\.province\}/);
  assert.match(realEstatePage, /disabled=\{!filters\.district\}/);
});

test("property workflow projection declarations expose location and file helpers", () => {
  assert.match(propertyProjectionDeclaration, /propertyModalLocation/);
  assert.match(propertyProjectionDeclaration, /propertySummaryLocation/);
  assert.match(propertyProjectionDeclaration, /propertyFileUrls/);
});

test("customer and partner pages consume the property location/file projection", () => {
  // Summary surfaces (cards, requests, active jobs, chat titles) delegate to
  // propertySummaryLocation; action modals delegate to propertyModalLocation.
  assert.match(customerPage, /propertySummaryLocation/);
  assert.match(customerPage, /propertyModalLocation/);
  assert.match(partnerPage, /propertySummaryLocation/);
  assert.match(partnerPage, /propertyModalLocation/);
  assert.match(partnerPage, /propertyFileUrls\(/);
  assert.match(customerPage, /propertyFileUrls\(/);
});

test("property pages no longer define a page-local GPS-first site location helper", () => {
  // The old helpers computed GPS-first strings inline. The new wrappers delegate
  // to the shared projection helper and contain no toFixed(6) GPS formatting.
  assert.doesNotMatch(customerPage, /const getPropSiteLocation = \(p: Partial<PropInquiry>\) => \{/);
  assert.doesNotMatch(partnerPage, /const getPropSiteLocation = \(p: \{/);
  assert.doesNotMatch(customerPage, /lat\.toFixed\(6\), \$\{lng\.toFixed\(6\)\}/);
  assert.doesNotMatch(partnerPage, /lat\.toFixed\(6\), \$\{lng\.toFixed\(6\)\}/);
});


test("property contact flow uses the authoritative 8-step inquiry contract", () => {
  assert.match(realEstatePage, /api\/v1\/blue\/property-workflow\/inquiries/);
  assert.match(realEstatePage, /Step \$\{contactStep === "done" \? 4 : 3\} of 8/);
  assert.match(realEstatePage, /snapshot\?\.reference \|\| snapshot\?\.poNumber/);
  assert.doesNotMatch(realEstatePage, /function generatePO/);
  assert.doesNotMatch(realEstatePage, /Math\.random\(\)/);
});
