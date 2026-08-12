import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

describe('Pending fixer notification backfill', () => {
  it('persists complete in-app and email notifications for active pending applicants', () => {
    const migrationPath = join(
      __dirname,
      '../../../prisma/migrations/20260813120000_backfill_pending_fixer_notifications/migration.sql',
    );

    expect(existsSync(migrationPath)).toBe(true);

    const sql = readFileSync(migrationPath, 'utf8');
    expect(sql.match(/INSERT INTO "notifications"/g)).toHaveLength(2);
    expect(sql.match(/ON CONFLICT \("dedupeKey"\) DO NOTHING;/g)).toHaveLength(
      2,
    );
    expect(sql).toContain('\'IN_APP\'::"NotificationType"');
    expect(sql).toContain('\'EMAIL\'::"NotificationType"');
    expect(sql).toContain('account."isActive" = TRUE');
    expect(sql).toContain('fixer."status" = \'PENDING\'');
    expect(sql).toContain('\'fixer-registration-in-app:\' || fixer."id"');
    expect(sql).toContain('\'fixer-registration-email:\' || fixer."id"');
    expect(sql).toContain(
      'Complete and submit your identity verification before your profile can receive new opportunities.',
    );
  });
});
