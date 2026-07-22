import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

describe('Property workflow notification backfills', () => {
  it('backfills the persisted Step 3 notification for PRE-2607-7944', () => {
    const migrationPath = join(
      __dirname,
      '../../../prisma/migrations/20260722143000_backfill_pre_2607_7944_notification/migration.sql',
    );

    expect(existsSync(migrationPath)).toBe(true);

    const sql = readFileSync(migrationPath, 'utf8');
    expect(sql).toContain('PRE-2607-7944');
    expect(sql).toContain("e.\"action\" = 'partner-notified'");
    expect(sql).toContain(
      "'audience', jsonb_build_array('customer', 'lister')",
    );
    expect(sql).toContain(
      'Please wait for the selected lister to accept the inquiry.',
    );
    expect(sql).toContain(
      'A customer selected your listing. Please accept or decline the inquiry.',
    );
    expect(sql).not.toMatch(/regexp|substring|split_part|regexp_matches/i);
  });
});
