import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const operationsUrl = new URL(
  "../app/[locale]/components/AdminOperationsPanel.tsx",
  import.meta.url,
);
const directoryUrl = new URL(
  "../app/[locale]/components/AdminPartnerDirectory.tsx",
  import.meta.url,
);
const auditUrl = new URL(
  "../app/[locale]/components/QualificationAuditPanel.tsx",
  import.meta.url,
);
const adminPageUrl = new URL("../app/[locale]/admin/page.tsx", import.meta.url);
const registerUrl = new URL(
  "../app/[locale]/fixers/register/page.tsx",
  import.meta.url,
);

test("admin operational actions use the rotating authenticated client", async () => {
  const source = await readFile(operationsUrl, "utf8");

  assert.match(source, /adminFetchResponse/);
  assert.match(source, /readAdminResponseError/);
  assert.match(source, /\/admin\/operations\/overview\?days=90/);
  assert.match(source, /\/admin\/demand-gaps\//);
  assert.doesNotMatch(source, /Authorization: "Bearer " \+ token/);
});

test("requested admin collections have bounded vertical scrolling", async () => {
  const [operations, directory, audit, adminPage] = await Promise.all([
    readFile(operationsUrl, "utf8"),
    readFile(directoryUrl, "utf8"),
    readFile(auditUrl, "utf8"),
    readFile(adminPageUrl, "utf8"),
  ]);

  assert.match(operations, /max-h-\[560px\] overflow-y-auto/);
  assert.match(operations, /max-h-\[480px\] space-y-3 overflow-y-auto/);
  assert.match(directory, /max-h-\[560px\] overflow-auto/);
  assert.match(audit, /max-h-\[480px\] overflow-auto/);
  assert.match(adminPage, /max-h-\[480px\] space-y-3 overflow-y-auto/);
  assert.match(adminPage, /max-h-\[480px\] overflow-auto/);
});

test("profile editing round-trips persisted matching location", async () => {
  const source = await readFile(registerUrl, "utf8");

  assert.match(source, /addressText: fixer\?\.serviceSubdistrict \|\| ""/);
  assert.match(source, /persistedLatitude/);
  assert.match(source, /persistedLongitude/);
  assert.match(source, /qualification\/evidence-preflight/);
});
