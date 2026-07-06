import assert from "node:assert/strict";
import test from "node:test";

import {
  shouldPreservePartnerDashboardState,
} from "./partnerDashboardState.js";

test("preserves partner dashboard data during transient profile fetch failures", () => {
  assert.equal(
    shouldPreservePartnerDashboardState({
      reason: "profile_fetch_failed",
      hasStoredPartner: true,
      hadFixerAccess: true,
      hadVisibleOrders: true,
    }),
    true,
  );
});

test("does not preserve partner dashboard data for confirmed logout", () => {
  assert.equal(
    shouldPreservePartnerDashboardState({
      reason: "logout",
      hasStoredPartner: true,
      hadFixerAccess: true,
      hadVisibleOrders: true,
    }),
    false,
  );
});

test("does not preserve partner dashboard data when no partner identity exists", () => {
  assert.equal(
    shouldPreservePartnerDashboardState({
      reason: "profile_fetch_failed",
      hasStoredPartner: false,
      hadFixerAccess: true,
      hadVisibleOrders: true,
    }),
    false,
  );
});
