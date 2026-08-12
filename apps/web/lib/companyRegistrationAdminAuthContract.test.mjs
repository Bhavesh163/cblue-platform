import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const registerUrl = new URL(
  "../app/[locale]/fixers/register/page.tsx",
  import.meta.url,
);
const adminUrl = new URL("../app/[locale]/admin/page.tsx", import.meta.url);
const recaptchaUrl = new URL(
  "../app/[locale]/components/ReCaptcha.tsx",
  import.meta.url,
);

test("company evidence upload failures identify the affected document", async () => {
  const source = await readFile(registerUrl, "utf8");

  assert.match(source, /companyEvidenceUploadError/);
  assert.match(source, /companyAffidavitLabel/);
  assert.match(source, /companyLetterOfIntentLabel/);
});

test("admin OTP retries clear the consumed token and reset the widget", async () => {
  const [adminSource, recaptchaSource] = await Promise.all([
    readFile(adminUrl, "utf8"),
    readFile(recaptchaUrl, "utf8"),
  ]);

  assert.match(adminSource, /setRecaptchaToken\(""\)/);
  assert.match(
    adminSource,
    /setRecaptchaResetKey\(\(current\) => current \+ 1\)/,
  );
  assert.match(adminSource, /resetKey=\{recaptchaResetKey\}/);
  assert.match(recaptchaSource, /resetKey\?: number/);
  assert.match(
    recaptchaSource,
    /window\.grecaptcha\.reset\(widgetIdRef\.current\)/,
  );
});
