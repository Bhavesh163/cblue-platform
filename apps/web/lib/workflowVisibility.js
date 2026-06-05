const WORKFLOW_PO_PATTERN = /\b(?:PO|PRE)-(?:(?:\d{8})|(?:\d{4}-\d{4,}))\b/i;
const TERMINAL_STATUS_VALUES = new Set(["CANCELLED", "CANCELED", "DONE", "DECLINED"]);
const COMPLETED_AWAITING_RATING_PATTERN =
  /customer\s+confirmed\s+(?:project\s+)?complete|customer\s+confirmed\s+completion|rating\s+is\s+now\s+open|please\s+rate|rate\s+(?:the\s+customer|your\s+partner)/i;
const TERMINAL_ALERT_PATTERN =
  /workflow completed|job is now complete|job is complete|stored in history|rated this project|this inquiry is now closed|moved to history|cancelled|canceled|declined|unavailable/i;
const COMPLETION_CHAT_PATTERN =
  /workflow completed|job is now complete|job is complete|stored in history|rated this project|this inquiry is now closed|moved to history/i;

export function normalizeWorkflowPo(value) {
  const match = String(value ?? "").match(WORKFLOW_PO_PATTERN);
  return match ? match[0].toUpperCase() : "";
}

function getTextFields(value) {
  if (value == null) return [];
  if (typeof value === "string" || typeof value === "number") return [String(value)];
  if (Array.isArray(value)) return value.flatMap(getTextFields);
  if (typeof value !== "object") return [];
  return [
    value.text,
    value.msg,
    value.message,
    value.note,
    value.statusNote,
    value.description,
    value.desc,
    value.title,
    value.statusHistory,
  ]
    .filter((entry) => entry != null)
    .flatMap(getTextFields);
}

export function hasWorkflowCompletionMarker(value) {
  return getTextFields(value).some((text) => COMPLETION_CHAT_PATTERN.test(text));
}

export function isTerminalWorkflowStatus(status) {
  return TERMINAL_STATUS_VALUES.has(String(status || "").toUpperCase());
}

export function isCompletedAwaitingWorkflowRating(value) {
  if (!value || typeof value !== "object") return false;
  if (String(value.status || "").toUpperCase() !== "COMPLETED") return false;
  return getTextFields(value).some((text) => COMPLETED_AWAITING_RATING_PATTERN.test(text));
}

function hasTerminalAlertMarker(value) {
  return getTextFields(value).some((text) => TERMINAL_ALERT_PATTERN.test(text));
}

function addPo(set, value) {
  const po = normalizeWorkflowPo(value);
  if (po) set.add(po);
}

export function collectTerminalWorkflowPos({
  backendOrders = [],
  historyItems = [],
  alerts = [],
  chatMessagesByPo = {},
  terminalPoValues = [],
  closedPoValues = [],
} = {}) {
  const terminal = new Set();

  for (const value of terminalPoValues) addPo(terminal, value);

  for (const item of historyItems || []) {
    addPo(terminal, item?.po || item?.id || item?.description || item?.desc || item);
  }

  for (const order of backendOrders || []) {
    if (isTerminalWorkflowStatus(order?.status)) {
      addPo(terminal, order?.po || order?.poNumber || order?.description || order?.desc || order?.id);
    }
  }

  for (const alert of alerts || []) {
    if (!hasTerminalAlertMarker(alert)) continue;
    addPo(terminal, alert?.po || alert?.message || alert?.msg || alert?.description || alert);
  }

  for (const [poLike, messages] of Object.entries(chatMessagesByPo || {})) {
    if (!hasWorkflowCompletionMarker(messages)) continue;
    addPo(terminal, poLike);
  }

  for (const value of closedPoValues || []) {
    const po = normalizeWorkflowPo(value);
    const messages = chatMessagesByPo?.[po] || chatMessagesByPo?.[value];
    if (messages && hasWorkflowCompletionMarker(messages)) terminal.add(po);
  }

  return terminal;
}

export function readBrowserTerminalWorkflowPos(storage) {
  const chatMessagesByPo = {};
  const alerts = [];
  const historyItems = [];
  if (!storage || typeof storage.length !== "number" || typeof storage.key !== "function") {
    return new Set();
  }

  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (!key) continue;
    if (key.startsWith("chat_messages_")) {
      const po = normalizeWorkflowPo(key.replace(/^chat_messages_/, ""));
      if (!po) continue;
      try {
        const parsed = JSON.parse(storage.getItem(key) || "[]");
        chatMessagesByPo[po] = Array.isArray(parsed) ? parsed : [];
      } catch {
        chatMessagesByPo[po] = [];
      }
      continue;
    }

    if (key === "partner_alerts" || key.startsWith("cblue_customer_alerts")) {
      try {
        const parsed = JSON.parse(storage.getItem(key) || "[]");
        if (Array.isArray(parsed)) alerts.push(...parsed);
      } catch {}
      continue;
    }

    if (key === "ghis_mock_history") {
      try {
        const parsed = JSON.parse(storage.getItem(key) || "[]");
        if (Array.isArray(parsed)) historyItems.push(...parsed);
      } catch {}
    }
  }

  return collectTerminalWorkflowPos({ chatMessagesByPo, alerts, historyItems });
}

export function pruneWorkflowStorage(storage, softLimitBytes = 4.5 * 1024 * 1024) {
  if (!storage || typeof storage.length !== "number" || typeof storage.key !== "function") {
    return [];
  }

  let total = 0;
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (!key) continue;
    total += (key.length + String(storage.getItem(key) || "").length) * 2;
  }
  if (total < softLimitBytes) return [];

  const removablePrefixes = [
    "cblue_po_breakdown_",
    "cblue_variation_price_list_",
  ];
  const removed = [];
  const removableKeys = [];
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (!key) continue;
    if (removablePrefixes.some((prefix) => key.startsWith(prefix))) {
      removableKeys.push(key);
    }
  }

  for (const key of removableKeys) {
    storage.removeItem(key);
    removed.push(key);
  }

  return removed;
}
