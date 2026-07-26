import assert from "node:assert/strict";
import test from "node:test";

import {
  enrichBudgetBreakdown,
  localizeBudgetBreakdown,
  localizeBudgetServiceList,
} from "./budgetLineLocalization.js";

const reportedBreakdown = [
  { service: "Fit-out", qty: 1000, unit: "sq.m.", unitRate: 30000, total: 30000000 },
  { service: "Reinstatement", qty: 100, unit: "sq.m.", unitRate: 10000, total: 1000000 },
  { service: "Construction", qty: 100, unit: "sq.m.", unitRate: 20000, total: 2000000 },
  { service: "Website development", qty: 10, unit: "page", unitRate: 1000, total: 10000 },
  { service: "chatbot", qty: 100, unit: "FAQ", unitRate: 100, total: 10000 },
  { service: "software development", qty: 1, unit: "job", unitRate: 10000, total: 10000 },
];

test("adds stable canonical keys without changing authoritative budget math", () => {
  const enriched = enrichBudgetBreakdown(reportedBreakdown);

  assert.deepEqual(
    enriched.map(({ serviceKey, unitKey }) => ({ serviceKey, unitKey })),
    [
      { serviceKey: "fitout", unitKey: "area" },
      { serviceKey: "reinstatement", unitKey: "area" },
      { serviceKey: "construction", unitKey: "area" },
      { serviceKey: "website", unitKey: "page" },
      { serviceKey: "chatbot", unitKey: "faq" },
      { serviceKey: "software", unitKey: "job" },
    ],
  );
  assert.deepEqual(
    enriched.map(({ serviceKey: _serviceKey, unitKey: _unitKey, ...item }) => item),
    reportedBreakdown,
  );
});

test("localizes the reported six-line budget in Thai", () => {
  const localized = localizeBudgetBreakdown(reportedBreakdown, "th");

  assert.deepEqual(
    localized.map(({ service, unit }) => ({ service, unit })),
    [
      { service: "งานตกแต่งภายใน", unit: "ตร.ม." },
      { service: "งานรื้อถอนคืนสภาพ", unit: "ตร.ม." },
      { service: "งานก่อสร้าง", unit: "ตร.ม." },
      { service: "งานพัฒนาเว็บไซต์", unit: "หน้า" },
      { service: "งานพัฒนาแชตบอต", unit: "ข้อ" },
      { service: "งานพัฒนาซอฟต์แวร์", unit: "งาน" },
    ],
  );
  assert.equal(localized.reduce((sum, item) => sum + item.total, 0), 33030000);
});

test("localizes canonical budget labels in Chinese and keeps English deterministic", () => {
  const chinese = localizeBudgetBreakdown(reportedBreakdown, "zh");
  const english = localizeBudgetBreakdown(reportedBreakdown, "en");

  assert.deepEqual(
    chinese.map(({ service, unit }) => ({ service, unit })),
    [
      { service: "室内装修", unit: "平方米" },
      { service: "恢复工程", unit: "平方米" },
      { service: "建筑施工", unit: "平方米" },
      { service: "网站开发", unit: "页" },
      { service: "聊天机器人开发", unit: "条" },
      { service: "软件开发", unit: "项" },
    ],
  );
  assert.deepEqual(
    english.map(({ service, unit }) => ({ service, unit })),
    [
      { service: "Fit-out", unit: "sq.m." },
      { service: "Reinstatement", unit: "sq.m." },
      { service: "Construction", unit: "sq.m." },
      { service: "Website development", unit: "page" },
      { service: "Chatbot development", unit: "FAQ" },
      { service: "Software development", unit: "job" },
    ],
  );
});

test("preserves unknown partner-defined services and units", () => {
  const custom = [{ service: "Special acoustic calibration", qty: 1, unit: "session", unitRate: 9000, total: 9000 }];

  assert.deepEqual(localizeBudgetBreakdown(custom, "th"), custom);
});

test("uses persisted hyphenated canonical keys without rewriting raw values", () => {
  const item = {
    service: "Partner mobile delivery",
    serviceKey: "mobile-app",
    qty: 1,
    unit: "engagement",
    unitKey: "job",
    unitRate: 50000,
    total: 50000,
  };

  assert.deepEqual(localizeBudgetBreakdown([item], "th"), [
    {
      ...item,
      service: "งานพัฒนาแอปมือถือ",
      unit: "งาน",
    },
  ]);
});

test("falls back to raw partner labels for unknown future canonical keys", () => {
  const item = {
    service: "New specialist service",
    serviceKey: "future-service",
    qty: 2,
    unit: "session",
    unitKey: "future-unit",
    unitRate: 3000,
    total: 6000,
  };

  assert.deepEqual(localizeBudgetBreakdown([item], "zh"), [item]);
});

test("builds a localized multi-service PO title from authoritative lines", () => {
  assert.equal(
    localizeBudgetServiceList(reportedBreakdown, "th"),
    "งานตกแต่งภายใน, งานรื้อถอนคืนสภาพ, งานก่อสร้าง, งานพัฒนาเว็บไซต์, งานพัฒนาแชตบอต, งานพัฒนาซอฟต์แวร์",
  );
});
