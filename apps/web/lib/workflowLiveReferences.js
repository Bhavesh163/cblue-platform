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
