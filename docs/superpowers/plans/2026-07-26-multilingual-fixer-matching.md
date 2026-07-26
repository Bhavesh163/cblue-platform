# Multilingual Fixer Matching Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make CBLUE Step 2 deterministically understand English, Thai, and Chinese multi-service requests and persist the same authoritative matched budget through Steps 3 and 5 for all three fixer booking forms.

**Architecture:** Add a focused backend-owned canonical service registry and multilingual request parser. `FixerService.matchFixers` consumes parsed canonical request lines and matches them only to equivalent canonical partner price-list rows; the shared web `FixerResults` component renders and persists the backend breakdown without independently inventing service lines.

**Tech Stack:** NestJS, TypeScript, Jest, Prisma, Next.js, Node test runner.

## Global Constraints

- Modify CBLUE only; do not edit BLUE or LBLUE.
- Preserve the public `GET /api/v1/fixers/match` route and all three existing booking forms.
- Do not change cancellation, decline, terminal-job filtering, forgot-password, or property workflow behavior.
- Do not display mock candidates or technical/process copy in production.
- Typhoon cannot create services, quantities, prices, or candidates.
- Accept typo recovery only when one canonical service is the unambiguous best match.
- Support no more than 30 extracted requested service lines.
- Stage and commit only files belonging to this fix from the dirty worktree.

---

### Task 1: Canonical Multilingual Service Registry

**Files:**
- Create: `backend/src/modules/fixer/service-intent-registry.ts`
- Test: `backend/src/modules/fixer/service-intent-registry.spec.ts`

**Interfaces:**
- Produces:
  - `ServiceGroup = "build" | "digital" | "household" | "professional" | "other"`
  - `ServiceUnitKind = "area" | "page" | "faq" | "unit" | "job" | "room" | "floor" | "other"`
  - `CanonicalServiceMatch`
  - `canonicalizeServiceText(value: string): CanonicalServiceMatch | null`
  - `getCanonicalServiceDefinition(key: string): CanonicalServiceDefinition | null`

- [ ] **Step 1: Write failing registry tests**

Add literal table-driven expectations for exact aliases and common mistakes:

```ts
it.each([
  ['office fit out', 'fitout'],
  ['fiiitout', 'fitout'],
  ['ออกแบบและตกแต่งภายใน', 'fitout'],
  ['办公室装修', 'fitout'],
  ['รื้อถอนและปรับสภาพพื้นที่เดิม', 'reinstatement'],
  ['退租还原', 'reinstatement'],
  ['งานก่อสร้างอาคารสำนักงาน', 'construction'],
  ['办公楼建设', 'construction'],
  ['งานพัฒนาแชตบอตตอบคำถาม', 'chatbot'],
  ['FAQ机器人开发', 'chatbot'],
  ['งานปประปา', 'plumbing'],
])('canonicalizes %s as %s', (input, expected) => {
  expect(canonicalizeServiceText(input)?.key).toBe(expected);
});

it('rejects an ambiguous short typo', () => {
  expect(canonicalizeServiceText('webb')).toBeNull();
});
```

- [ ] **Step 2: Run the registry test and verify RED**

Run:

```bash
cd backend
npm test -- --runInBand src/modules/fixer/service-intent-registry.spec.ts
```

Expected: FAIL because the registry module does not exist.

- [ ] **Step 3: Implement the registry**

Define data rather than matching branches:

```ts
export type CanonicalServiceDefinition = {
  key: string;
  group: ServiceGroup;
  units: ServiceUnitKind[];
  aliases: string[];
  typoAliases?: string[];
};

export const SERVICE_INTENT_REGISTRY: CanonicalServiceDefinition[] = [
  {
    key: 'fitout',
    group: 'build',
    units: ['area'],
    aliases: [
      'fitout', 'fit out', 'fit-out', 'office fitout', 'tenant improvement',
      'ตกแต่งภายใน', 'ออกแบบและตกแต่งภายใน', 'ตกแต่งสำนักงาน',
      '装修', '裝修', '办公室装修', '辦公室裝修', '室内装修',
    ],
    typoAliases: ['fiiitout', 'fitot', 'fituot'],
  },
  // Include every household, project-team, and professional service
  // listed in the approved design and supplied catalog.
];
```

Normalize aliases with NFKC and exact phrase matching first. Apply bounded
Levenshtein matching only to Latin/Thai token sequences of sufficient length,
with a fixed confidence threshold and a unique-best margin.

- [ ] **Step 4: Run the registry tests and verify GREEN**

Run the Task 1 test command and confirm all cases pass.

### Task 2: Clause-Local Multilingual Quantity Parser

**Files:**
- Create: `backend/src/modules/fixer/multilingual-service-request-parser.ts`
- Test: `backend/src/modules/fixer/multilingual-service-request-parser.spec.ts`

**Interfaces:**
- Consumes: `canonicalizeServiceText`, registry unit compatibility.
- Produces:

```ts
export type ParsedRequestedService = {
  canonicalKey: string;
  quantity: number;
  unit: string;
  unitKind: ServiceUnitKind;
  sourceIndex: number;
  sourceText: string;
  confidence: number;
};

export function parseRequestedServices(
  description: string,
  maxItems?: number,
): ParsedRequestedService[];
```

- [ ] **Step 1: Write the exact failing Thai test**

```ts
const thai =
  'ต้องการทีมงานสำหรับดำเนินการออกแบบและตกแต่งภายในสำนักงานขนาด 1,000 ตร.ม., ' +
  'งานรื้อถอนและปรับสภาพพื้นที่เดิมขนาด 100 ตร.ม., ' +
  'งานก่อสร้างอาคารสำนักงานขนาด 100 ตร.ม., ' +
  'งานพัฒนาเว็บไซต์จำนวน 10 หน้า และ' +
  'งานพัฒนาแชตบอตตอบคำถามถาม-ตอบ (FAQ) จำนวน 100 ข้อ';

expect(parseRequestedServices(thai)).toEqual([
  expect.objectContaining({ canonicalKey: 'fitout', quantity: 1000, unit: 'sqm' }),
  expect.objectContaining({ canonicalKey: 'reinstatement', quantity: 100, unit: 'sqm' }),
  expect.objectContaining({ canonicalKey: 'construction', quantity: 100, unit: 'sqm' }),
  expect.objectContaining({ canonicalKey: 'website', quantity: 10, unit: 'page' }),
  expect.objectContaining({ canonicalKey: 'chatbot', quantity: 100, unit: 'faq' }),
]);
```

- [ ] **Step 2: Add Chinese, word-order, spacing, unit, and limit tests**

Cover:

```ts
'办公室装修1000平方米、场地恢复100平方米、办公楼建设100平方米、网站开发10页以及FAQ机器人开发100问答'
'office fit out 1000 m2; reinstatement 100 m²; construction 100 sqm; website 10 pages; chatbot 100 FAQs'
'1000ตร.ม.ตกแต่งภายในและ100ตร.ม.ก่อสร้างอาคาร'
```

Assert Thai digits, full-width digits, comma-separated numbers, service before
quantity, quantity before service, conjunctions without spaces, and a hard
30-line cap.

- [ ] **Step 3: Run parser tests and verify RED**

Run:

```bash
cd backend
npm test -- --runInBand src/modules/fixer/multilingual-service-request-parser.spec.ts
```

Expected: FAIL because the parser module does not exist.

- [ ] **Step 4: Implement normalization and clause-local binding**

Implement:

```ts
const normalized = input
  .normalize('NFKC')
  .replace(/[๐-๙]/g, toAsciiThaiDigit)
  .replace(/(\d),(?=\d{3}\b)/g, '$1')
  .replace(/(?:ตร\.?\s*ม\.?|ตารางเมตร|平方米|平米|m²|m2|sq\.?\s*m\.?|sqm)/giu, ' sqm ')
  .replace(/(?:หน้า|页|頁|pages?)/giu, ' page ')
  .replace(/(?:ข้อ|คำถาม|问答|問答|faqs?)/giu, ' faq ');
```

Detect registry alias spans and quantity spans, split using multilingual hard
separators, and pair each quantity with the nearest compatible service span in
the same clause. Resolve overlapping alias spans by longest exact match, then
confidence, then source position.

- [ ] **Step 5: Run parser tests and verify GREEN**

Run the Task 2 test command and confirm every literal expected line passes.

### Task 3: Integrate Parsed Services into Top-8 Matching

**Files:**
- Modify: `backend/src/modules/fixer/fixer.service.ts`
- Modify: `backend/src/modules/fixer/fixer.service.spec.ts`

**Interfaces:**
- Consumes: `parseRequestedServices`, `canonicalizeServiceText`.
- Preserves: `matchFixers(...)` signature and `SelectedFixer` response.
- Produces authoritative `estimatedBreakdown`.

- [ ] **Step 1: Add a failing production-shaped matcher test**

Use one Bhavesh fixture with these exact price-list rows:

```ts
[
  { service: 'Fit-out', quantity: '1', unit: 'sq.m.', finalPrice: '30000' },
  { service: 'Reinstatement', quantity: '1', unit: 'sq.m.', finalPrice: '10000' },
  { service: 'Construction', quantity: '1', unit: 'sq.m.', finalPrice: '20000' },
  { service: 'Website development', quantity: '1', unit: 'page', finalPrice: '1000' },
  { service: 'Chatbot', quantity: '1', unit: 'FAQ', finalPrice: '100' },
]
```

Call `matchFixers` with the reported Thai sentence and assert the five literal
breakdown lines and total `33_020_000`.

- [ ] **Step 2: Add Chinese and partial-offer matcher tests**

Assert the Chinese equivalent returns the same five lines. Assert a partner
without website/chatbot rows receives only its true build lines. Assert an
unrelated marketing/cafe provider is absent.

- [ ] **Step 3: Run focused matcher tests and verify RED**

Run:

```bash
cd backend
npm test -- --runInBand src/modules/fixer/fixer.service.spec.ts -t 'multilingual multi-service'
```

Expected: FAIL with zero candidates or missing/misbound breakdown lines.

- [ ] **Step 4: Replace heuristic pair matching with canonical parsed lines**

Within `matchFixers`:

```ts
const requestedServices = parseRequestedServices(description || '');

const canonicalPriceRows = list.flatMap((item, priceIndex) => {
  const canonical = canonicalizeServiceText(String(item.service || ''));
  return canonical ? [{ item, priceIndex, canonical }] : [];
});
```

For each parsed request, select only rows whose canonical key is identical and
whose unit kind is compatible. Calculate `unitRate`, `total`, `pairIndex`, and
service group from canonical data. If parsing returns no request lines, retain
the existing safe single-service path for selected category requests.

- [ ] **Step 5: Run matcher tests and verify GREEN**

Run the Task 3 focused test, then the complete fixer service suite:

```bash
cd backend
npm test -- --runInBand src/modules/fixer/fixer.service.spec.ts
```

### Task 4: Lock All Three Booking Forms and Step 3/5 Persistence to the Backend Breakdown

**Files:**
- Modify: `apps/web/app/[locale]/components/FixerResults.tsx`
- Modify: `apps/web/lib/computeBudgetBreakdown.test.mjs`
- Modify: `backend/src/modules/order/order.service.spec.ts`

**Interfaces:**
- Consumes: backend candidate `estimatedBreakdown`.
- Produces: unchanged `Order.budgetBreakdown` from the selected candidate.

- [ ] **Step 1: Add failing order-persistence regression**

Create an order fixture whose selected multilingual breakdown has five lines.
Assert `Order.budgetBreakdown` receives those exact lines without reparsing the
description.

- [ ] **Step 2: Add frontend authoritative-breakdown regression**

Assert a supplied `estimatedBreakdown` is selected unchanged even when the Thai
description would produce different frontend fallback text. Assert no
description-derived line appears when the backend breakdown is empty for a
candidate that has not matched.

- [ ] **Step 3: Run tests and verify RED where behavior diverges**

Run:

```bash
cd backend
npm test -- --runInBand src/modules/order/order.service.spec.ts
cd ../apps/web
node --test lib/computeBudgetBreakdown.test.mjs
```

- [ ] **Step 4: Make the backend breakdown authoritative**

Keep the three booking pages unchanged because they already share
`FixerResults`. Update selection and PO creation so candidate display and order
creation use `estimatedBreakdown` returned by `/fixers/match`. Do not create
missing matched lines from browser storage or a frontend synonym table.

- [ ] **Step 5: Run Task 4 tests and verify GREEN**

Run both Task 4 test commands and confirm the persisted lines are identical.

### Task 5: Full Verification, Focused Commit, Push, and Deployment

**Files:**
- Modify: `docs/superpowers/plans/2026-07-26-multilingual-fixer-matching.md`
- Include: only files changed by Tasks 1-4 and the approved design/specification.

- [ ] **Step 1: Run focused and regression verification**

```bash
cd backend
npm test -- --runInBand src/modules/fixer/service-intent-registry.spec.ts src/modules/fixer/multilingual-service-request-parser.spec.ts src/modules/fixer/fixer.service.spec.ts src/modules/order/order.service.spec.ts
npm run build
cd ../apps/web
node --test lib/budgetSynonyms.test.mjs lib/computeBudgetBreakdown.test.mjs
npm run check-types
npm run build
cd ../..
git diff --check
```

- [ ] **Step 2: Review dirty-file ownership**

Run `git status --short`, inspect every intended diff, and verify no BLUE,
LBLUE, property workflow, cancellation, decline, terminal visibility, or
unrelated pre-existing dirty file is staged.

- [ ] **Step 3: Commit only the focused CBLUE files**

```bash
git add docs/superpowers/specs/2026-07-26-multilingual-fixer-matching-design.md \
  docs/superpowers/plans/2026-07-26-multilingual-fixer-matching.md \
  backend/src/modules/fixer/service-intent-registry.ts \
  backend/src/modules/fixer/service-intent-registry.spec.ts \
  backend/src/modules/fixer/multilingual-service-request-parser.ts \
  backend/src/modules/fixer/multilingual-service-request-parser.spec.ts \
  backend/src/modules/fixer/fixer.service.ts \
  backend/src/modules/fixer/fixer.service.spec.ts \
  backend/src/modules/order/order.service.spec.ts \
  apps/web/app/[locale]/components/FixerResults.tsx \
  apps/web/lib/computeBudgetBreakdown.test.mjs
git commit -m "Fix multilingual fixer service matching"
git push origin main
```

- [ ] **Step 4: Verify deployment**

Monitor the CBLUE deployment workflow to completion. Probe
`GET /api/v1/fixers/match` with sanitized English, Thai, Simplified Chinese,
and Traditional Chinese descriptions at a service area containing known
matching partners. Confirm non-empty candidates and exact five-line breakdowns
without exposing user tokens or secrets.
