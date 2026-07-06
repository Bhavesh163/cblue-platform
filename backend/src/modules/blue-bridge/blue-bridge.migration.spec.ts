import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

describe('Blue bridge budget backfills', () => {
  it('stores the authoritative PO-2606-4636 Original Budget without text parsing', () => {
    const migrationPath = join(
      __dirname,
      '../../../prisma/migrations/20260706120000_backfill_po_2606_4636_budget/migration.sql',
    );

    expect(existsSync(migrationPath)).toBe(true);

    const sql = readFileSync(migrationPath, 'utf8');
    expect(sql).toContain('PO-2606-4636');
    expect(sql).toContain("'service', 'Fit-out'");
    expect(sql).toContain("'qty', 20");
    expect(sql).toContain("'unitRate', 30000");
    expect(sql).toContain("'total', 600000");
    expect(sql).toContain("'service', 'Reinstatement'");
    expect(sql).toContain("'service', 'Construction'");
    expect(sql).toContain("'service', 'Website development'");
    expect(sql).toContain("'service', 'chatbot'");
    expect(sql).not.toMatch(/\bregexp|substring|split_part|regexp_matches\b/i);
  });
});