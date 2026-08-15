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
