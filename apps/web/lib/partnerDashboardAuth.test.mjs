import assert from "node:assert/strict";
import test from "node:test";

import { fetchPartnerDashboardWithAuthRetry } from "./partnerDashboardAuth.js";

test("retries partner dashboard requests with a refreshed token after 401", async () => {
  const calls = [];
  const fetchImpl = async (endpoint, init) => {
    calls.push({ endpoint, token: init.headers.Authorization });
    return calls.length === 1
      ? { status: 401, ok: false }
      : { status: 200, ok: true, json: async () => [] };
  };
  const writes = [];

  const result = await fetchPartnerDashboardWithAuthRetry({
    endpoint: "/api/v1/orders/fixer",
    token: "expired-token",
    refreshSession: async (token) => {
      assert.equal(token, "expired-token");
      return "fresh-token";
    },
    readSubscriber: () => ({ id: "partner-1" }),
    writeSession: (subscriber, token) => writes.push({ subscriber, token }),
    fetchImpl,
  });

  assert.equal(result.token, "fresh-token");
  assert.equal(result.response.status, 200);
  assert.deepEqual(calls, [
    { endpoint: "/api/v1/orders/fixer", token: "Bearer expired-token" },
    { endpoint: "/api/v1/orders/fixer", token: "Bearer fresh-token" },
  ]);
  assert.deepEqual(writes, [{ subscriber: { id: "partner-1" }, token: "fresh-token" }]);
});

test("does not call protected partner endpoints when no token is available", async () => {
  let fetchCalled = false;
  const result = await fetchPartnerDashboardWithAuthRetry({
    endpoint: "/api/v1/properties/my",
    getToken: () => "",
    refreshSession: async () => "fresh-token",
    fetchImpl: async () => {
      fetchCalled = true;
      return { status: 200, ok: true };
    },
  });

  assert.equal(fetchCalled, false);
  assert.deepEqual(result, { token: "", response: null });
});

test("refreshes an expiring partner session before the protected request", async () => {
  const calls = [];
  const writes = [];

  const result = await fetchPartnerDashboardWithAuthRetry({
    endpoint: "/api/v1/property-inquiries/lister",
    token: "nearly-expired-token",
    refreshBeforeRequest: async (token) => {
      assert.equal(token, "nearly-expired-token");
      return "fresh-token";
    },
    refreshSession: async () => {
      throw new Error("a proactive refresh must prevent the initial 401 retry");
    },
    readSubscriber: () => ({ id: "partner-1" }),
    writeSession: (subscriber, token) => writes.push({ subscriber, token }),
    fetchImpl: async (_endpoint, init) => {
      calls.push(init.headers.Authorization);
      return { status: 200, ok: true };
    },
  });

  assert.equal(result.token, "fresh-token");
  assert.deepEqual(calls, ["Bearer fresh-token"]);
  assert.deepEqual(writes, [{ subscriber: { id: "partner-1" }, token: "fresh-token" }]);
});
