const PO_PATTERN = /\bPO-(?:\d{8}|\d{4}-\d{4,})\b/i;

const LIVE_WORKFLOW_KEYS = [
  "ghis_mock_active",
  "ghis_mock_dyn_req",
  "partner_mock_dyn_req",
];

const TERMINAL_WORKFLOW_KEYS = [
  "ghis_mock_history",
  "partner_mock_history",
  "ghis_mock_rated",
  "partner_mock_rated",
  "ghis_rated_jobs",
  "partner_rated_jobs",
];

const TERMINAL_STATUSES = new Set([
  "ARCHIVED",
  "CANCELLED",
  "CANCELED",
  "CLOSED",
  "COMPLETED",
  "DECLINED",
  "REJECTED",
  "RATED",
]);

const TERMINAL_TYPES = new Set([
  "cancelled",
  "canceled",
  "closed",
  "complete_approved",
  "declined",
  "history",
  "rated",
]);

const DEFAULT_COMPLETE_REQUEST =
  "Work is completed. Please review and mark as complete to close this project.";

const WORKFLOW_STATUS_NOTE_PATTERN =
  /customer\s+cancel|declin|reason:|\[complete_data\]|project-complete|job-complete|partner\s+has\s+marked\s+the\s+job\s+as\s+complete|customer\s+confirmed\s+(?:project\s+)?complete|customer\s+sent\s+meeting\s+invitation|partner\s+confirmed\s+site\s+meeting|variation/i;
const POST_VARIATION_TYPES = new Set([
  "complete_partner",
  "complete_pending",
  "rate_partner",
  "rate_pending",
]);

function normalizePo(value) {
  const match = String(value || "").match(PO_PATTERN);
  return match ? match[0].toUpperCase() : "";
}

function readStorageArray(storage, key) {
  try {
    const raw = storage?.getItem?.(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    if (parsed && typeof parsed === "object") return Object.values(parsed);
  } catch {}
  return [];
}

function getItemPo(item) {
  if (typeof item === "string") return normalizePo(item);
  if (!item || typeof item !== "object") return "";
  return normalizePo(
    item.po ||
      item.poNumber ||
      item.poCode ||
      item.orderPo ||
      item.orderNumber ||
      item.id ||
      item.msg ||
      item.message,
  );
}

function isTerminalItem(item) {
  if (!item || typeof item !== "object") return false;
  const status = String(item.status || item.workflowStatus || "").toUpperCase();
  const type = String(item.type || item.workflowType || "").toLowerCase();
  return TERMINAL_STATUSES.has(status) || TERMINAL_TYPES.has(type);
}

function storageHasPo(storage, keys, normalizedPo, predicate) {
  for (const key of keys) {
    const items = readStorageArray(storage, key);
    if (items.some((item) => getItemPo(item) === normalizedPo && predicate(item))) {
      return true;
    }
  }
  return false;
}

export function isWorkflowPoReferencedInStorage(storage, po) {
  const normalizedPo = normalizePo(po);
  if (!storage || !normalizedPo) return false;

  if (storageHasPo(storage, TERMINAL_WORKFLOW_KEYS, normalizedPo, () => true)) {
    return false;
  }

  return storageHasPo(storage, LIVE_WORKFLOW_KEYS, normalizedPo, (item) => !isTerminalItem(item));
}

export function extractWorkflowCompleteRequest(value) {
  const text = String(value || "");
  const tagged = text.match(/\[COMPLETE_DATA\]([\s\S]*?)\[\/COMPLETE_DATA\]/i);
  if (tagged?.[1]?.trim()) return tagged[1].trim();

  if (
    /partner\s+has\s+marked\s+the\s+job\s+as\s+complete/i.test(text) ||
    /project-complete\s+request/i.test(text) ||
    /submitted\s+(?:the\s+)?(?:job-)?complete\s+request/i.test(text)
  ) {
    return DEFAULT_COMPLETE_REQUEST;
  }

  return "";
}

const DEFAULT_VARIATION_REQUEST =
  "Partner has submitted a variation for your approval. Please review and confirm to proceed.";

export function extractWorkflowVariationRequest(value) {
  const text = String(value || "");
  const tagged = text.match(/\[VARIATION_DATA\]([\s\S]*?)\[\/VARIATION_DATA\]/i);
  if (tagged?.[1]?.trim()) return tagged[1].trim();

  if (
    /partner\s+has\s+submitted\s+a\s+variation/i.test(text) ||
    /variation\s+request\s+sent/i.test(text) ||
    /submitted\s+(?:a\s+)?variation\s+request/i.test(text)
  ) {
    return DEFAULT_VARIATION_REQUEST;
  }

  return "";
}

export function getWorkflowStatusNote(value) {
  const rows = Array.isArray(value?.statusHistory) ? value.statusHistory : [];
  const rowNotes = rows.map((row) => String(row?.note || "").trim()).filter(Boolean);
  const statusNote = String(value?.statusNote || "").trim();
  const directNote = String(value?.note || "").trim();
  const candidates = [statusNote, ...rowNotes, directNote].filter(Boolean);
  const meaningful = candidates.find((note) => WORKFLOW_STATUS_NOTE_PATTERN.test(note));
  return meaningful || rowNotes[0] || statusNote || directNote || "";
}

export function isVisibleWorkflowSystemText(value) {
  return /^\s*\[(?:system|cblue)\]/i.test(String(value || "").trim());
}

function variationApprovalStorageKey(po) {
  const normalizedPo = normalizePo(po);
  return normalizedPo
    ? `customer_variation_approved_${normalizedPo.replace(/[^A-Z0-9]+/g, "_")}`
    : "";
}

export function markWorkflowVariationApproved(storage, po) {
  const key = variationApprovalStorageKey(po);
  if (!key || typeof storage?.setItem !== "function") return false;
  try {
    storage.setItem(key, "1");
    return true;
  } catch {
    return false;
  }
}

export function isWorkflowPastVariation({ activeItem, backendOrder, po, storage }) {
  const normalizedPo = normalizePo(po);
  if (!normalizedPo) return false;

  if (Number(activeItem?.step || activeItem?.mockStep || 0) >= 10) {
    return true;
  }

  const backendNote = getWorkflowStatusNote(backendOrder);
  if (
    /customer\s+approved\s+(?:the\s+)?variation|partner\s+may\s+now\s+submit\s+project\s+complete/i.test(
      backendNote,
    )
  ) {
    return true;
  }

  const approvalKey = variationApprovalStorageKey(normalizedPo);
  if (approvalKey && storage?.getItem?.(approvalKey) === "1") {
    return true;
  }

  return storageHasPo(
    storage,
    ["ghis_mock_dyn_req", "partner_mock_dyn_req"],
    normalizedPo,
    (item) =>
      Number(item?.step || item?.mockStep || 0) >= 10 ||
      POST_VARIATION_TYPES.has(String(item?.type || "").toLowerCase()),
  );
}

export async function persistPartnerVariationStatusNote({
  chatText,
  fetchFn = globalThis.fetch,
  po,
  resolveOrderIdByPo,
  storage,
  token,
}) {
  const normalizedPo = normalizePo(po);
  const desc = extractWorkflowVariationRequest(chatText);
  if (!normalizedPo || !desc || typeof resolveOrderIdByPo !== "function" || typeof fetchFn !== "function") {
    return false;
  }

  try {
    const mappedOrderId = storage?.getItem?.(`po_to_order_${normalizedPo}`) || "";
    const orderId = await resolveOrderIdByPo({ po: normalizedPo, fallbackOrderId: mappedOrderId, token });
    if (!orderId) return false;
    const headers = token
      ? { "Content-Type": "application/json", Authorization: `Bearer ${token}` }
      : { "Content-Type": "application/json" };
    const response = await fetchFn(`/api/v1/orders/${orderId}/status`, {
      method: "PUT",
      headers,
      body: JSON.stringify({
        status: "IN_PROGRESS",
        note: `Partner submitted variation request for ${normalizedPo}. [VARIATION_DATA]${desc}[/VARIATION_DATA]`,
      }),
    });
    return Boolean(response?.ok);
  } catch {
    return false;
  }
}

export async function persistPartnerCompletionStatusNote({
  chatText,
  fetchFn = globalThis.fetch,
  po,
  resolveOrderIdByPo,
  storage,
  token,
}) {
  const normalizedPo = normalizePo(po);
  const desc = extractWorkflowCompleteRequest(chatText);
  if (!normalizedPo || !desc || typeof resolveOrderIdByPo !== "function" || typeof fetchFn !== "function") {
    return false;
  }

  try {
    const mappedOrderId = storage?.getItem?.(`po_to_order_${normalizedPo}`) || "";
    const orderId = await resolveOrderIdByPo({ po: normalizedPo, fallbackOrderId: mappedOrderId, token });
    if (!orderId) return false;
    const headers = token
      ? { "Content-Type": "application/json", Authorization: `Bearer ${token}` }
      : { "Content-Type": "application/json" };
    const response = await fetchFn(`/api/v1/orders/${orderId}/status`, {
      method: "PUT",
      headers,
      body: JSON.stringify({
        status: "IN_PROGRESS",
        note: `Partner submitted project-complete request for ${normalizedPo}. [COMPLETE_DATA]${desc}[/COMPLETE_DATA]`,
      }),
    });
    return Boolean(response?.ok);
  } catch {
    return false;
  }
}

export async function persistCustomerRatingStatusNote({
  fetchFn = globalThis.fetch,
  po,
  rating,
  resolveOrderIdByPo,
  storage,
  token,
}) {
  const normalizedPo = normalizePo(po);
  const numericRating = Number(rating);
  if (
    !normalizedPo ||
    !Number.isFinite(numericRating) ||
    numericRating <= 0 ||
    typeof resolveOrderIdByPo !== "function" ||
    typeof fetchFn !== "function"
  ) {
    return false;
  }

  try {
    const mappedOrderId = storage?.getItem?.(`po_to_order_${normalizedPo}`) || "";
    const orderId = await resolveOrderIdByPo({
      po: normalizedPo,
      fallbackOrderId: mappedOrderId,
      token,
    });
    if (!orderId) return false;
    const headers = token
      ? { "Content-Type": "application/json", Authorization: `Bearer ${token}` }
      : { "Content-Type": "application/json" };
    const response = await fetchFn(`/api/v1/orders/${orderId}/status`, {
      method: "PUT",
      headers,
      body: JSON.stringify({
        status: "COMPLETED",
        note: `Customer rated this project ${numericRating}/5 stars. Workflow completed.`,
      }),
    });
    return Boolean(response?.ok);
  } catch {
    return false;
  }
}
