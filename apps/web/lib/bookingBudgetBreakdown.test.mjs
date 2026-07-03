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
