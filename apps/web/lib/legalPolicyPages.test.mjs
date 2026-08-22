import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const appRoot = new URL('../app/[locale]/', import.meta.url);
const readPage = (name) => readFileSync(new URL(name, appRoot), 'utf8');
const terms = readPage('terms/page.tsx');
const policyContent = readPage('legal-policy-content.tsx');

test('publishes all localized legal policy pages with required coverage', () => {
  assert.match(terms, /acceptable use|การใช้งานที่ยอมรับได้|可接受使用/i);
  for (const kind of ['refund', 'retention']) {
    assert.match(readPage(`${kind}-policy/page.tsx`), new RegExp(`kind="${kind}"`));
  }
  assert.match(policyContent, /processing|ค่าธรรมเนียม|处理费/i);
  assert.match(policyContent, /refund|คืนเงิน|退款/i);
  assert.match(policyContent, /cancel|ยกเลิก|取消/i);
  assert.match(policyContent, /eligib|สิทธิ|资格/i);
  assert.match(policyContent, /contact|ติดต่อ|联系/i);
  assert.match(policyContent, /KYC|evidence|หลักฐาน|证据/i);
  assert.match(policyContent, /backup|สำรอง|备份/i);
  assert.match(policyContent, /legal hold|กฎหมาย|法律保留/i);
  assert.match(policyContent, /PDPA/i);
  assert.match(policyContent, /delete|ลบ|删除/i);
});
