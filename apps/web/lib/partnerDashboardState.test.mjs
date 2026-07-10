import assert from "node:assert/strict";
import test from "node:test";

import {
  preserveVisiblePartnerListOnEmptyRefresh,
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

test("preserves verified partner access while a live profile is temporarily incomplete", () => {
  assert.equal(
    shouldPreservePartnerDashboardState({
      reason: "profile_incomplete",
      hasStoredPartner: true,
      hadFixerAccess: true,
      hadVisibleOrders: false,
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

test("keeps visible partner lists when a refresh temporarily returns empty", () => {
  const previous = [{ po: "PO-1" }];
  assert.deepEqual(preserveVisiblePartnerListOnEmptyRefresh(previous, []), previous);
});

test("accepts non-empty partner refresh results as authoritative", () => {
  const previous = [{ po: "PO-1" }];
  const next = [{ po: "PO-2" }];
  assert.deepEqual(preserveVisiblePartnerListOnEmptyRefresh(previous, next), next);
});
