import assert from "node:assert/strict";
import test from "node:test";

import { chooseAuthoritativeBudgetBreakdown } from "./bookingBudgetBreakdown.js";

test("uses the selected candidate breakdown before recomputing from a stale price list", () => {
  const selectedBreakdown = [
    {
      service: "Fit out",
      qty: 600,
      unit: "sq.m.",
      unitRate: 28000,
      total: 16800000,
    },
  ];

  const result = chooseAuthoritativeBudgetBreakdown({
    selectedBreakdown,
    storedBreakdown: null,
    description: "I have a 600 fitout work.",
    priceList: [{ service: "image ads", quantity: "600", unit: "image", finalPrice: "1200000" }],
    computeBudgetBreakdown: () => [
      {
        service: "image ads",
        qty: 600,
        unit: "image",
        unitRate: 2000,
        total: 1200000,
      },
    ],
  });

  assert.deepEqual(result, selectedBreakdown);
});

test("uses a stored PO breakdown before recomputing", () => {
  const storedBreakdown = [
    {
      service: "Fit-out",
      qty: 600,
      unit: "sq.m.",
      unitRate: 30000,
      total: 18000000,
    },
  ];

  const result = chooseAuthoritativeBudgetBreakdown({
    selectedBreakdown: null,
    storedBreakdown,
    description: "I have a 600 fitout work.",
    priceList: [{ service: "steel work", quantity: "1", unit: "sq.m.", finalPrice: "1500" }],
    computeBudgetBreakdown: () => [
      {
        service: "steel work",
        qty: 600,
        unit: "sq.m.",
        unitRate: 1500,
        total: 900000,
      },
    ],
  });

  assert.deepEqual(result, storedBreakdown);
});

test("keeps the persisted construction and chatbot PO lines over a stale Step-5 recomputation", () => {
  const persistedBreakdown = [
    { service: "Fit-out", qty: 600, unit: "sq.m.", unitRate: 30000, total: 18000000 },
    { service: "Reinstatement", qty: 300, unit: "sq.m.", unitRate: 10000, total: 3000000 },
    { service: "Construction", qty: 700, unit: "sq.m.", unitRate: 20000, total: 14000000 },
    { service: "Website development", qty: 10, unit: "page", unitRate: 1000, total: 10000 },
    { service: "Chatbot", qty: 100, unit: "FAQ", unitRate: 100, total: 10000 },
  ];

  const result = chooseAuthoritativeBudgetBreakdown({
    selectedBreakdown: persistedBreakdown,
    storedBreakdown: [
      { service: "Reinstatement", qty: 700, unit: "sq.m.", unitRate: 10000, total: 7000000 },
    ],
    description:
      "I want a team to carry out a 600 sq.m. office fit out, a 300 sq.m. reinstatement work a 700 office building construction and a 10 page website development and a 100 FAQ chatbot development.",
    priceList: [
      { service: "Reinstatement", unit: "sq.m.", finalPrice: 10000 },
      { service: "Website development", unit: "page", finalPrice: 1000 },
    ],
    computeBudgetBreakdown: () => [
      { service: "Reinstatement", qty: 700, unit: "sq.m.", unitRate: 10000, total: 7000000 },
      { service: "Website development", qty: 100, unit: "page", unitRate: 1000, total: 100000 },
    ],
  });

  assert.deepEqual(result, persistedBreakdown);
});
