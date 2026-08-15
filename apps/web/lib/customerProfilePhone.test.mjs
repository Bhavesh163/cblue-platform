import test from "node:test";
import assert from "node:assert/strict";

import { customerPhoneUpdateError } from "./customerProfilePhone.js";

test("customer phone errors distinguish ownership conflicts", () => {
  assert.equal(
    customerPhoneUpdateError("en", 409),
    "This phone number is already linked to another active account.",
  );
});

test("customer phone errors keep a clear retry message for service failures", () => {
  assert.equal(
    customerPhoneUpdateError("en", 500),
    "We could not update your phone number. Please try again.",
  );
});

test("customer phone errors support every CBLUE locale", () => {
  assert.notEqual(customerPhoneUpdateError("th", 409), customerPhoneUpdateError("en", 409));
  assert.notEqual(customerPhoneUpdateError("zh", 409), customerPhoneUpdateError("en", 409));
});
