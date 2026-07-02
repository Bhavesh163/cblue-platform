function normalizeText(value) {
  return String(value || "").trim().replace(/\s+/g, " ").toLowerCase();
}

function normalizeEmail(value) {
  return normalizeText(value);
}

function normalizePhone(value) {
  return String(value || "").replace(/\D+/g, "");
}

function normalizeId(value) {
  return normalizeText(value);
}

function normalizePo(value) {
  return String(value || "").trim().toUpperCase();
}

function unique(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function addObjectIdentity(values, source) {
  if (!source || typeof source !== "object") return;
  values.ids.push(source.id, source.userId, source.fixerId, source.providerId);
  values.emails.push(source.email, source.contactEmail, source.fixerEmail, source.partnerEmail, source.providerEmail);
  values.names.push(source.name, source.contactName, source.company, source.companyName, source.partnerName, source.fixerAlias);
  values.phones.push(source.phone, source.contactPhone);

  if (source.fixer && typeof source.fixer === "object") {
    addObjectIdentity(values, source.fixer);
    addObjectIdentity(values, source.fixer.user);
  }
  if (source.user && typeof source.user === "object") addObjectIdentity(values, source.user);
}

function collectScopeValues(partner, subscriber) {
  const values = { ids: [], emails: [], names: [], phones: [] };
  addObjectIdentity(values, subscriber);
  addObjectIdentity(values, partner);
  return {
    ids: unique(values.ids.map(normalizeId)),
    emails: unique(values.emails.map(normalizeEmail)),
    names: unique(values.names.map(normalizeText)),
    phones: unique(values.phones.map(normalizePhone)),
  };
}

function collectPoValues(backendOrders) {
  return unique(
    (Array.isArray(backendOrders) ? backendOrders : [])
      .flatMap((order) => [
        order?.po,
        order?.poNumber,
        order?.metadata?.po,
        String(order?.description || "").match(/\bPO-(?:\d{8}|\d{4}-\d{4,})\b/i)?.[0],
      ])
      .map(normalizePo),
  );
}

export function buildPartnerWorkflowScope({ partner = null, subscriber = null, backendOrders = [] } = {}) {
  const identity = collectScopeValues(partner, subscriber);
  return {
    ...identity,
    orderPos: collectPoValues(backendOrders),
  };
}

function hasIntersection(left, right) {
  if (!left.length || !right.length) return false;
  const rightSet = new Set(right);
  return left.some((value) => rightSet.has(value));
}

function collectItemPartnerValues(item) {
  const values = { ids: [], emails: [], names: [], phones: [] };
  if (!item || typeof item !== "object") return values;

  values.ids.push(
    item.partnerId,
    item.fixerId,
    item.providerId,
    item.selectedFixerId,
    item.assignedFixerId,
    item.orderFixerId,
  );
  values.emails.push(
    item.partnerEmail,
    item.fixerEmail,
    item.providerEmail,
    item.selectedFixerEmail,
    item.assignedFixerEmail,
  );
  values.names.push(
    item.partnerName,
    item.fixerAlias,
    item.fixerName,
    item.providerName,
    item.selectedFixerName,
    item.assignedFixerName,
  );
  values.phones.push(item.partnerPhone, item.fixerPhone, item.providerPhone, item.selectedFixerPhone);

  addObjectIdentity(values, item.fixer);
  addObjectIdentity(values, item.provider);
  addObjectIdentity(values, item.partner);
  addObjectIdentity(values, item.selectedFixer);

  return {
    ids: unique(values.ids.map(normalizeId)),
    emails: unique(values.emails.map(normalizeEmail)),
    names: unique(values.names.map(normalizeText)),
    phones: unique(values.phones.map(normalizePhone)),
  };
}

function collectItemCustomerValues(item) {
  const values = { emails: [], names: [], phones: [] };
  if (!item || typeof item !== "object") return values;

  values.emails.push(item.customerEmail, item.user?.email, item.customer?.email);
  values.names.push(item.customerName, item.customer, item.user?.name, item.customer?.name);
  values.phones.push(item.customerPhone, item.user?.phone, item.customer?.phone);

  return {
    emails: unique(values.emails.map(normalizeEmail)),
    names: unique(values.names.map(normalizeText)),
    phones: unique(values.phones.map(normalizePhone)),
  };
}

export function isPartnerWorkflowItemForScope(item, scope) {
  if (!item || !scope) return false;

  const po = normalizePo(item.po || item.poNumber || item.id);
  if (po && Array.isArray(scope.orderPos) && scope.orderPos.includes(po)) return true;

  const partnerValues = collectItemPartnerValues(item);
  if (hasIntersection(partnerValues.emails, scope.emails || [])) return true;
  if (hasIntersection(partnerValues.ids, scope.ids || [])) return true;
  if (hasIntersection(partnerValues.phones, scope.phones || [])) return true;
  if (hasIntersection(partnerValues.names, scope.names || [])) return true;

  const customerValues = collectItemCustomerValues(item);
  if (hasIntersection(customerValues.emails, scope.emails || [])) return false;
  if (hasIntersection(customerValues.phones, scope.phones || [])) return false;
  if (hasIntersection(customerValues.names, scope.names || [])) return false;

  return false;
}

export function filterPartnerWorkflowItems(items, scope) {
  return (Array.isArray(items) ? items : []).filter((item) => isPartnerWorkflowItemForScope(item, scope));
}
