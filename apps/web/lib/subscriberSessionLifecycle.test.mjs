import assert from "node:assert/strict";
import test from "node:test";

import {
  captureSubscriberRefresh,
  invalidateSubscriberSession,
  isSubscriberRefreshCurrent,
} from "./subscriberSessionLifecycle.js";

function createStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    removeItem(key) {
      values.delete(key);
    },
    setItem(key, value) {
      values.set(key, String(value));
    },
  };
}

test("logout invalidates an in-flight subscriber refresh", () => {
  const storage = createStorage({ subscriber_token: "old-token" });
  const refresh = captureSubscriberRefresh(storage, "old-token");

  invalidateSubscriberSession(storage);
  storage.removeItem("subscriber_token");

  assert.equal(isSubscriberRefreshCurrent(storage, refresh), false);
});

test("an in-flight refresh cannot overwrite a newer subscriber login", () => {
  const storage = createStorage({ subscriber_token: "old-token" });
  const refresh = captureSubscriberRefresh(storage, "old-token");

  storage.setItem("subscriber_token", "new-login-token");

  assert.equal(isSubscriberRefreshCurrent(storage, refresh), false);
});

test("the current subscriber refresh may commit while its session is unchanged", () => {
  const storage = createStorage({ subscriber_token: "current-token" });
  const refresh = captureSubscriberRefresh(storage, "current-token");

  assert.equal(isSubscriberRefreshCurrent(storage, refresh), true);
});
