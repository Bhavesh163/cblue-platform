# Multilingual Fixer Matching Design

## Scope

Fix CBLUE Step 2 matching for English, Thai, and Chinese across the household,
project-team, and professional booking forms. Preserve the existing 11-step
workflow, ranking rules, property workflow, cancellation, decline, and terminal
job visibility behavior.

## Root Cause

All three booking forms already call the shared `FixerResults` component and
`GET /api/v1/fixers/match`. The defect is in the shared matching pipeline:

1. The backend normalizer supports isolated Thai and Chinese aliases but the
   quantity parser assumes mostly space-delimited English.
2. Thai `ตร.ม.` punctuation is removed before unit extraction, producing a
   representation that the quantity expression does not recognize.
3. Thai and Chinese conjunctions and service phrases can occur without spaces,
   while context slicing expects word boundaries.
4. Service-before-quantity and quantity-before-service forms are handled by
   window heuristics that can bind a quantity to the next service.
5. Important aliases such as Thai reinstatement and chatbot phrases are absent.
6. Backend matching and frontend budget fallback use separate normalization
   tables, allowing Steps 2, 3, and 5 to disagree.
7. Existing tests cover a simple Thai single-service sentence, not production-
   shaped multilingual multi-service requests.

## Authoritative Architecture

CBLUE backend owns request interpretation and matched budget lines:

`Booking form -> /fixers/match -> multilingual parser -> price-list matcher -> matched breakdown -> selected order budgetBreakdown`

The three web booking forms continue to share `FixerResults`. The frontend
renders backend `estimatedBreakdown`; it does not independently reinterpret a
description when an authoritative backend match is required.

BLUE and LBLUE are not changed. The existing enterprise flow remains:

`Flutter -> BLUE NestJS bridge -> CBLUE backend -> BLUE normalized runtime -> Flutter`

## Canonical Service Registry

Create a data-driven registry of canonical service concepts. Each concept has:

- stable canonical key;
- English, Thai, Simplified Chinese, and Traditional Chinese aliases;
- common transliterations and bounded misspellings;
- compatible units;
- service group used by the existing high-value ranking rule.

Initial coverage includes every service category in the supplied household,
project-team, and professional catalog, including detailed household maintenance
phrases. The registry is extensible without adding matching branches.

Examples:

- `fitout`: office fit out, fit-out, fitout, interior fitout, tenant
  improvement, ตกแต่งภายใน, ออกแบบและตกแต่งภายใน, 装修, 办公室装修.
- `reinstatement`: reinstatement, make good, strip out and reinstate,
  รื้อถอนคืนสภาพ, รื้อถอนและปรับสภาพพื้นที่เดิม, 恢复工程, 退租还原.
- `construction`: building construction, office construction, civil works,
  งานก่อสร้างอาคาร, งานโยธา, 建筑施工, 土建工程.
- `website`: website development, web development, พัฒนาเว็บไซต์, 网站开发.
- `chatbot`: chatbot development, FAQ bot, พัฒนาแชตบอต, แชตบอตตอบคำถาม,
  聊天机器人, FAQ机器人.

## Text Normalization

Normalize before clause and quantity extraction:

- Unicode NFKC;
- English case folding;
- Thai, Arabic, and full-width Chinese digits;
- thousands separators;
- punctuation and Unicode multiplication/area symbols;
- whitespace without requiring Thai or Chinese word boundaries;
- canonical units:
  - area: `sqm`, `m2`, `m²`, `sq.m.`, `ตร.ม.`, `ตรม.`, `ตารางเมตร`,
    `平方米`, `平米`;
  - page: `page`, `pages`, `หน้า`, `页`, `頁`;
  - FAQ: `FAQ`, `FAQs`, `ข้อ`, `คำถาม`, `问答`, `問題`;
  - common job, item, room, floor, and unit forms.

Recognize clause separators and conjunctions including comma, semicolon,
newline, ampersand, `and`, `plus`, `with`, `และ`, `พร้อม`, `รวมถึง`, `กับ`,
`和`, `及`, `与`, `以及`, and `、`, whether or not surrounded by spaces.

## Request Extraction

1. Detect canonical service mentions from the registry.
2. Detect quantities and compatible units.
3. Bind each quantity to the nearest compatible service mention inside its
   local clause.
4. Support service-before-quantity and quantity-before-service syntax.
5. Preserve source order and allow up to 30 requested lines.
6. Deduplicate overlapping alias matches without merging distinct quantities.
7. Skip a line when no service can be identified safely.

Typo matching is bounded to registry aliases. It is accepted only when one
canonical service is the unambiguous best match above a minimum confidence and
margin. Ambiguous text is not guessed.

## Price-List Matching and Ranking

- Match each requested canonical service only to a partner price-list row with
  the same canonical service.
- Never substitute a different service to increase coverage.
- Calculate each line from requested quantity and the persisted partner unit
  rate.
- Preserve the existing important highest-value service-group ranking.
- Exclude candidates with no matched price-list lines.
- Typhoon may review deterministic candidate ordering but cannot create service
  intents, quantities, prices, or candidates.

## Step Consistency

- Step 2 displays backend candidate breakdowns.
- Step 3 persists the selected backend breakdown into `Order.budgetBreakdown`.
- Step 5 reads the persisted order breakdown.
- A missing authoritative breakdown yields no budget lines; descriptions,
  browser storage, or unrelated price estimates are not used to invent them.

## Testing

Test first with production-shaped fixtures:

- the exact reported English and Thai five-service descriptions;
- equivalent Simplified and Traditional Chinese descriptions;
- service-before-quantity and quantity-before-service forms;
- compact Thai/Chinese text without spaces;
- all supported area/page/FAQ unit variants;
- common English, Thai, and Chinese misspellings;
- ambiguous typo rejection;
- unrelated partner rejection;
- correct five-line partner breakdown and totals;
- partial partner offers contain only their true lines;
- up to 30 requested lines;
- the household, project-team, and professional controller contract;
- selected Step 2 breakdown persists unchanged for Steps 3 and 5.

## Deployment and Verification

Run focused matcher tests, order persistence tests, backend build, web tests,
web type checking/build, and `git diff --check`. Stage only files belonging to
this fix, commit to CBLUE `main`, push, monitor deployment, and probe the
production matcher with sanitized English, Thai, and Chinese requests.
