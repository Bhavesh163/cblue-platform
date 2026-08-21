import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const dashboardSource = readFileSync(
  new URL("../app/[locale]/dashboard/page.tsx", import.meta.url),
  "utf8",
);

test("recognizes the six-digit CBLUE property reference format", () => {
  assert.match(
    dashboardSource,
    /const PROP_PO_PATTERN = \/\^PRE-\\d\{4\}-\\d\{4,6\}\$\/i;/,
  );
});

test("renders property activity rows with the eight-step total", () => {
  assert.match(
    dashboardSource,
    /const itemIsProperty = isPropPoCode\(item\.po\) \|\| item\.propInquiry \|\| String\(item\.type \|\| ''\)\.startsWith\('prop_'\);/,
  );
  assert.match(
    dashboardSource,
    /Step \$\{item\.step\} of \$\{itemIsProperty \? 8 : 11\}/,
  );
});

test("preserves direct customer inquiry attachments for the active-job viewer", () => {
  assert.match(
    dashboardSource,
    /const inquiryAttachments = Array\.isArray\(api\?\.attachments\) \? api\.attachments : \[\];/,
  );
  assert.match(
    dashboardSource,
    /attachments: inquiryAttachments,\s+uploadedFiles: apiUploadedFiles,/,
  );
});

test("locks and bounds the customer property file modal", () => {
  assert.match(dashboardSource, /propRateModal,\s+propViewFilesModal,/);
  assert.match(dashboardSource, /role="dialog" aria-modal="true"/);
  assert.match(dashboardSource, /max-h-\[calc\(100dvh-2rem\)\].*flex flex-col overflow-hidden/);
});
