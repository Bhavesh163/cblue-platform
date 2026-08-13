import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { QUALIFICATION_DOCUMENT_TYPES } from './dto/upload-qualification-document.dto';

describe('Qualification evidence database contract', () => {
  it('allows every authoritative qualification document type', () => {
    const migrationPath = join(
      __dirname,
      '../../../prisma/migrations/20260813170000_allow_company_letter_evidence/migration.sql',
    );

    expect(existsSync(migrationPath)).toBe(true);

    const sql = readFileSync(migrationPath, 'utf8');
    for (const documentType of QUALIFICATION_DOCUMENT_TYPES) {
      expect(sql).toContain(`'${documentType}'`);
    }
    expect(sql).toContain("'id-back'");
    expect(sql).toContain(
      'VALIDATE CONSTRAINT "kyc_documents_documentType_allowed"',
    );
  });

  it('keeps company authorization evidence in the validated constraint', () => {
    const migrationPath = join(
      __dirname,
      '../../../prisma/migrations/20260813170000_allow_company_letter_evidence/migration.sql',
    );
    const sql = readFileSync(migrationPath, 'utf8');

    expect(sql).toMatch(
      /CHECK \([\s\S]*'company-affidavit'[\s\S]*'company-letter-of-intent'[\s\S]*\) NOT VALID;/,
    );
  });
});
