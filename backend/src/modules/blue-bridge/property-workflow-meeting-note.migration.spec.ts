import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('property workflow meeting note migration', () => {
  it('adds the persisted meetingNote column without rewriting workflow data', () => {
    const sql = readFileSync(
      resolve(
        __dirname,
        '../../../prisma/migrations/20260723090000_add_property_inquiry_meeting_note/migration.sql',
      ),
      'utf8',
    );

    expect(sql).toContain('ALTER TABLE "property_inquiries"');
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS "meetingNote" TEXT');
    expect(sql).not.toMatch(/UPDATE\s+"property_inquiries"/i);
    expect(sql).not.toMatch(/DROP\s+(?:TABLE|COLUMN)/i);
  });
});
