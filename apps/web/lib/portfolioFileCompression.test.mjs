import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const helperUrl = new URL(
  "../app/[locale]/lib/portfolio-image-compression.ts",
  import.meta.url,
);
const registerUrl = new URL(
  "../app/[locale]/fixers/register/page.tsx",
  import.meta.url,
);

test("portfolio preparation compresses oversized PDFs instead of rejecting them", async () => {
  const source = await readFile(helperUrl, "utf8");

  assert.match(source, /async function compressPdfFile/);
  assert.match(source, /pdfjs-dist/);
  assert.match(source, /PDFDocument/);
  assert.match(source, /file\.size <= PORTFOLIO_MAX_FILE_BYTES/);
  assert.doesNotMatch(source, /PDF must be no larger than 0\.3 MB/);
});

test("fixer registration promises automatic compression for images and PDFs", async () => {
  const source = await readFile(registerUrl, "utf8");

  assert.match(
    source,
    /Images and PDFs are compressed automatically to no more than 0\.3 MB each\./,
  );
  assert.match(source, /multiple/);
  assert.match(source, /PORTFOLIO_MAX_FILES/);
});

test("company evidence uses compression before upload", async () => {
  const [helperSource, registerSource] = await Promise.all([
    readFile(helperUrl, "utf8"),
    readFile(registerUrl, "utf8"),
  ]);

  assert.match(helperSource, /prepareQualificationEvidenceFile/);
  assert.match(helperSource, /compressPdfFile\(file, true\)/);
  assert.match(helperSource, /preserveReadability/);
  assert.match(registerSource, /prepareCompanyEvidence/);
  assert.match(registerSource, /setCompanyAffidavit/);
  assert.match(registerSource, /setCompanyLetterOfIntent/);
  assert.match(
    registerSource,
    /Images and PDFs are compressed to no more than 0\.3 MB each\./,
  );
});

test("KYC, company evidence, and portfolio share localized 0.3 MB preparation", async () => {
  const registerSource = await readFile(registerUrl, "utf8");

  assert.match(registerSource, /prepareQualificationEvidenceFile\(file\)/);
  assert.match(
    registerSource,
    /uploadKycImmediately\(documentType, preparedFile\)/,
  );
  assert.match(registerSource, /qualificationFilePreparationError/);
  assert.match(registerSource, /more than 50 pages/);
});
