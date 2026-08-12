import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const registerUrl = new URL(
  "../app/[locale]/fixers/register/page.tsx",
  import.meta.url,
);
const adminUrl = new URL("../app/[locale]/admin/page.tsx", import.meta.url);
const adminApiUrl = new URL(
  "../app/[locale]/components/adminApi.ts",
  import.meta.url,
);
const subscriberSessionUrl = new URL("./subscriberSession.ts", import.meta.url);
const recaptchaUrl = new URL(
  "../app/[locale]/components/ReCaptcha.tsx",
  import.meta.url,
);
const compressionUrl = new URL(
  "../app/[locale]/lib/portfolio-image-compression.ts",
  import.meta.url,
);
const adminRoleMigrationUrl = new URL(
  "../../../backend/prisma/migrations/20260812193000_restore_suppadesh_admin_role/migration.sql",
  import.meta.url,
);

test("company evidence upload failures identify the affected document", async () => {
  const source = await readFile(registerUrl, "utf8");

  assert.match(source, /companyEvidenceUploadError/);
  assert.match(source, /companyAffidavitLabel/);
  assert.match(source, /companyLetterOfIntentLabel/);
});

test("company PDF preparation does not start a worker before lossless compression is evaluated", async () => {
  const source = await readFile(compressionUrl, "utf8");
  const optimizedCheck = source.indexOf(
    "optimizedBytes.byteLength <= PORTFOLIO_PDF_TARGET_BYTES",
  );
  const workerStart = source.indexOf(
    "loadingTask = pdfjs.getDocument",
    optimizedCheck,
  );

  assert.ok(optimizedCheck >= 0);
  assert.ok(workerStart > optimizedCheck);
});

test("company evidence preparation is serialized before form submission", async () => {
  const source = await readFile(registerUrl, "utf8");

  assert.match(source, /companyEvidencePreparationQueueRef/);
  assert.match(source, /companyEvidencePreparationQueueRef\.current\.then/);
  assert.match(source, /companyEvidenceProcessingCount > 0/);
});

test("admin repair updates only the existing authorized account", async () => {
  const source = await readFile(adminRoleMigrationUrl, "utf8");

  assert.match(source, /lower\(email\) = 'suppadesh@hotmail\.com'/);
  assert.match(source, /role = 'ADMIN'::"UserRole"/);
  assert.doesNotMatch(source, /INSERT INTO "users"/);
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

test("protected registration requests use the refreshable subscriber session", async () => {
  const [registerSource, sessionSource] = await Promise.all([
    readFile(registerUrl, "utf8"),
    readFile(subscriberSessionUrl, "utf8"),
  ]);

  assert.match(registerSource, /authenticatedSubscriberRequest/);
  assert.doesNotMatch(
    registerSource,
    /await fetch\((?:fixerEndpoint|["'`]\/api\/v1\/(?:users\/me|fixers\/me|qualification))/,
  );
  assert.match(sessionSource, /refreshSubscriberSession\(token\)/);
  assert.match(sessionSource, /clearSubscriberSession\(\)/);
});

test("an unrecoverable admin authorization failure expires the shared console session", async () => {
  const [adminSource, adminApiSource] = await Promise.all([
    readFile(adminUrl, "utf8"),
    readFile(adminApiUrl, "utf8"),
  ]);

  assert.match(
    adminApiSource,
    /ADMIN_SESSION_EXPIRED_EVENT = "cblue:admin-session-expired"/,
  );
  assert.match(
    adminApiSource,
    /response\.status === 401 \|\| response\.status === 403/,
  );
  assert.match(adminApiSource, /window\.dispatchEvent/);
  assert.match(
    adminSource,
    /window\.addEventListener\(\s*ADMIN_SESSION_EXPIRED_EVENT/,
  );
});
