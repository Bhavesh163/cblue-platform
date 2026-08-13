import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

describe('Verified company provider name backfill', () => {
  it('repairs only approved company submissions with complete saved reviews', () => {
    const migrationPath = join(
      __dirname,
      '../../../prisma/migrations/20260814100000_backfill_verified_company_provider_names/migration.sql',
    );

    expect(existsSync(migrationPath)).toBe(true);

    const sql = readFileSync(migrationPath, 'utf8');
    expect(sql).toContain('submission."status" = \'APPROVED\'');
    expect(sql).toContain('affidavit."evidenceStatus" = \'VALIDATED\'');
    expect(sql).toContain(
      '"ADMIN_COMPANY_NAME_CONFIRMED", "ADMIN_COMPANY_AUTHORITY_CONFIRMED"',
    );
    expect(sql).toContain('"ADMIN_COMPANY_INTENT_CONFIRMED"');
    expect(sql).toContain('"ADMIN_COMPANY_APPLICANT_IDENTITY_CONFIRMED"');
    expect(sql).toContain('"publicDisplayName" = approved_company."companyName"');
    expect(sql).toContain('"verifiedCompanyName" = approved_company."companyName"');
    expect(sql).toContain('"contactName" = fixer."verifiedCompanyName"');
    expect(sql).toContain('COMPANY_PROVIDER_NAME_BACKFILLED');
  });
});
