import assert from "node:assert/strict";
import test from "node:test";

import {
  buildPartnerWorkflowScope,
  filterBlockedPartnerAdvancedItems,
  filterPartnerWorkflowItems,
  isPartnerPreAcceptanceWorkflowItem,
  isPartnerWorkflowItemForScope,
} from "./partnerWorkflowScope.js";

test("does not show customer-originated workflow items to the same user's partner page", () => {
  const scope = buildPartnerWorkflowScope({
    partner: { id: "user-ghis", email: "ghiscafe@gmail.com", name: "Ghis Cafe" },
    backendOrders: [],
  });

  const ghisCustomerToBhavesh = {
    po: "PO-2606-9845",
    type: "meeting_pending_partner",
    customer: "Ghis Cafe",
    customerEmail: "ghiscafe@gmail.com",
    partnerName: "Bhavesh",
    partnerEmail: "bhaveshfung@gmail.com",
  };

  assert.equal(isPartnerWorkflowItemForScope(ghisCustomerToBhavesh, scope), false);
  assert.deepEqual(filterPartnerWorkflowItems([ghisCustomerToBhavesh], scope), []);
});

test("shows legacy local workflow items when a backend fixer order proves ownership", () => {
  const scope = buildPartnerWorkflowScope({
    partner: { id: "user-bhavesh", email: "bhaveshfung@gmail.com", name: "Bhavesh Fung" },
    backendOrders: [{ po: "PO-2606-9845", id: "order-bhavesh" }],
  });

  const legacyMeetingRequest = {
    po: "PO-2606-9845",
    type: "meeting_confirm_partner",
    customer: "Ghis Cafe",
  };

  assert.equal(isPartnerWorkflowItemForScope(legacyMeetingRequest, scope), true);
});

test("keeps explicitly addressed pending accept cards visible before backend polling catches up", () => {
  const scope = buildPartnerWorkflowScope({
    partner: { id: "fixer-suppadesh", email: "suppadesh@yahoo.com", name: "Suppadesh Fungprasertsuk" },
    backendOrders: [],
  });

  const request = {
    po: "PO-2607-0001",
    type: "pending_accept",
    customer: "Cblue Customer",
    partnerEmail: "suppadesh@yahoo.com",
    partnerName: "Suppadesh Fungprasertsuk",
  };

  assert.equal(isPartnerWorkflowItemForScope(request, scope), true);
});

test("blocks stale advanced partner cards when backend still requires PO acceptance", () => {
  const backendPendingAccept = {
    po: "PO-2607-8341",
    type: "pending_accept",
    status: "PENDING",
    step: 5,
    service: "SAFETY OFFICER",
  };
  const staleMeetingConfirm = {
    po: "PO-2607-8341",
    type: "meeting_confirm_partner",
    workflowType: "meeting_confirm_partner",
    status: "MEETING_REQUESTED",
    step: 8,
    desc: "Customer sent a site meeting invitation.",
  };

  assert.equal(isPartnerPreAcceptanceWorkflowItem(backendPendingAccept), true);
  assert.deepEqual(
    filterBlockedPartnerAdvancedItems([staleMeetingConfirm, { po: "PO-2607-9999", type: "meeting_confirm_partner", step: 8 }], [backendPendingAccept]),
    [{ po: "PO-2607-9999", type: "meeting_confirm_partner", step: 8 }],
  );
});
