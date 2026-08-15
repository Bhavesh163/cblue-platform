import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const profilePages = [
  "app/[locale]/dashboard/page.tsx",
  "app/[locale]/fixers/page.tsx",
  "app/[locale]/partner-zone/page.tsx",
];

async function readWebFile(relativePath) {
  return readFile(path.join(webRoot, relativePath), "utf8");
}

test("profile surfaces use the shared password-confirmed closure control", async () => {
  const sources = await Promise.all(profilePages.map(readWebFile));

  for (const source of sources) {
    assert.match(source, /AccountClosureDialog/);
    assert.doesNotMatch(
      source,
      /fetch\(\s*["']\/api\/v1\/users\/me["'][\s\S]{0,300}method\s*:\s*["']DELETE["']/,
    );
  }
});

test("closure dialog submits the authoritative endpoint and handles blockers", async () => {
  const source = await readWebFile(
    "app/[locale]/components/AccountClosureDialog.tsx",
  );

  assert.match(source, /\/api\/v1\/users\/me\/account-closure/);
  assert.match(source, /currentPassword/);
  assert.match(source, /type=\{visible \? "text" : "password"\}/);
  assert.match(source, /response\.status === 409/);
  assert.match(source, /response\.status === 429/);
  assert.match(source, /response\.status === 503/);
  assert.match(source, /response\.ok\) \{ clearSubscriberSession\(\)/);
  assert.ok(
    source.indexOf("response.ok") < source.indexOf("clearSubscriberSession()"),
    "session state must only be cleared after a successful closure response",
  );
});
