const WORKFLOW_PO_PATTERN = /\b(?:PO|PRE)-(?:(?:\d{8})|(?:\d{4}-\d{4,}))\b/i;
const TERMINAL_STATUS_VALUES = new Set(["CANCELLED", "CANCELED", "DONE", "DECLINED", "FINISHED", "RATED"]);
const COMPLETED_AWAITING_RATING_PATTERN =
  /customer\s+confirmed\s+(?:project\s+)?complete|customer\s+confirmed\s+completion|rating\s+is\s+now\s+open|please\s+rate|rate\s+(?:the\s+customer|your\s+partner)/i;
const TERMINAL_ALERT_PATTERN =
  /workflow completed|job is now complete|job is complete|stored in history|rated this project|this inquiry is now closed|moved to history|cancelled|canceled|declined|unavailable/i;
const COMPLETION_CHAT_PATTERN =
  /workflow completed|job is now complete|job is complete|stored in history|rated this project|this inquiry is now closed|moved to history/i;
const UNKNOWN_PLACE_PATTERN = /^(?:unknown|n\/a|tbd|-|--\s*select)/i;
const CUSTOMER_MEETING_ADVANCED_PATTERN =
  /customer sent meeting invitation|meeting invitation sent|partner confirmed (?:site )?meeting|meeting confirmed by partner|submitted a variation|variation (?:request|approved)|marked the job as complete|confirmed (?:the )?job complete|rating is now open|rated this project/i;



const MEETING_VISIBLE_RECENT_CONFIRM_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;

function parseWorkflowMeetingDateTimeMs(meetingDate, meetingTime, fallback) {
  const rawDate = String(meetingDate || "").trim();
  const rawTime = String(meetingTime || "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
    const ts = new Date(`${rawDate}T${rawTime || "00:00"}`).getTime();
    if (Number.isFinite(ts) && ts > 0) return ts;
  }
  const ddmmyyyy = rawDate.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (ddmmyyyy) {
    const [, day, month, year] = ddmmyyyy;
    const [hour = "00", minute = "00"] = rawTime.split(":");
    const ts = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute)).getTime();
    if (Number.isFinite(ts) && ts > 0) return ts;
  }
  const numeric = Number(fallback);
  if (Number.isFinite(numeric) && numeric > 0) return numeric;
  const ts = new Date(fallback || (rawDate ? `${rawDate}T${rawTime || "00:00"}` : 0)).getTime();
  return Number.isFinite(ts) ? ts : 0;
}

export function isWorkflowMeetingCardVisible({
  meetingDate = "",
  meetingTime = "",
  createdAt,
  date,
  now = Date.now(),
  pastWindowMs = MEETING_VISIBLE_RECENT_CONFIRM_WINDOW_MS,
} = {}) {
  const currentTs = Number(now);
  const safeNow = Number.isFinite(currentTs) && currentTs > 0 ? currentTs : Date.now();
  const meetingTs = parseWorkflowMeetingDateTimeMs(meetingDate, meetingTime, date || createdAt);
  if (meetingTs > 0 && meetingTs >= safeNow - pastWindowMs) return true;
  const confirmedTs = parseWorkflowMeetingDateTimeMs("", "", createdAt || date);
  return confirmedTs > 0 && confirmedTs >= safeNow - pastWindowMs;
}

export function parseWorkflowMeetingInviteDetails(value) {
  const text = String(value || "");
  const match = text.match(/(?:customer\s+sent\s+meeting\s+invitation|meeting\s+invitation|partner\s+confirmed\s+site\s+meeting)(?:\s+for\s+(PO-(?:\d{8}|\d{4}-\d{4,})))?:\s*(\d{2}\/\d{2}\/\d{4})\s+(\d{2}:\d{2})\s+at\s+([\s\S]+?)(?:\.\s*(?:Note:|Next:|Waiting\b)|$)/i);
  const noteMatch = text.match(/\bNote:\s*([\s\S]*?)(?:\.+\s*Next:|$)/i);
  const rawNote = String(noteMatch?.[1] || "").trim();
  const meetingNote = rawNote && !/[.!?]$/.test(rawNote) ? `${rawNote}.` : rawNote;
  return {
    po: match?.[1] || "",
    meetingDate: match?.[2] || "",
    meetingDateLabel: match?.[2] || "",
    meetingTime: match?.[3] || "",
    meetingTimeLabel: match?.[3] || "",
    meetingVenue: String(match?.[4] || "").trim(),
    meetingNote,
  };
}

export function buildMeetingConfirmedAlert({
  id,
  po,
  audience = "customer",
  createdAt = Date.now(),
  time = "",
  customerEmail = "",
  customerName = "",
} = {}) {
  const normalizedPo = normalizeWorkflowPo(po) || String(po || "").trim();
  const isPartner = audience === "partner";
  const msg = isPartner
    ? `${normalizedPo} Meeting confirmed. Next: Send variation if needed.`
    : `${normalizedPo} Meeting confirmed`;
  const numericCreatedAt = Number(createdAt);
  const safeCreatedAt = Number.isFinite(numericCreatedAt) && numericCreatedAt > 0 ? numericCreatedAt : Date.now();
  return {
    id: id || `${isPartner ? "meeting-confirmed" : "meeting-confirmed-cust"}-${normalizedPo}`,
    po: normalizedPo,
    type: isPartner ? "meeting_confirmed" : "notice",
    msg,
    message: msg,
    msgTh: msg,
    msgZh: msg,
    ...(time ? { time } : {}),
    timestamp: new Date(safeCreatedAt).toISOString(),
    createdAt: safeCreatedAt,
    unread: true,
    dot: isPartner ? "bg-purple-500" : "bg-green-500",
    ...(customerEmail ? { customerEmail } : {}),
    ...(customerName ? { customerName } : {}),
  };
}

export function normalizeWorkflowPo(value) {
  const match = String(value ?? "").match(WORKFLOW_PO_PATTERN);
  return match ? match[0].toUpperCase() : "";
}

function normalizeWorkflowPlace(value) {
  const text = String(value ?? "").trim();
  return text && !UNKNOWN_PLACE_PATTERN.test(text) ? text : "";
}

export function pickWorkflowMeetingVenue(...values) {
  for (const value of values) {
    const text = normalizeWorkflowPlace(value);
    if (text) return text;
  }
  return "";
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

export function isCustomerMeetingInviteActionAvailable(value = {}) {
  const authoritativeActions = Array.isArray(value?.actions) ? value.actions : null;
  if (value?.sourceVersion === "cblue-fixer-workflow-v1" || authoritativeActions) {
    return Boolean(
      authoritativeActions?.some(
        (action) =>
          String(action?.key || "").trim() === "send-meeting-invitation" &&
          String(action?.owner || "").trim() === "customer",
      ),
    );
  }
  const status = String(value?.status || "").toUpperCase();
  if (!["IN_PROGRESS", "CHAT_READY"].includes(status)) return false;
  return !getTextFields(value).some((text) =>
    CUSTOMER_MEETING_ADVANCED_PATTERN.test(text),
  );
}

export function hasWorkflowCompletionMarker(value) {
  return getTextFields(value).some((text) => COMPLETION_CHAT_PATTERN.test(text));
}

export function isTerminalWorkflowStatus(status) {
  return TERMINAL_STATUS_VALUES.has(String(status || "").toUpperCase());
}

const CANCELLABLE_WORKFLOW_STATUSES = new Set([
  "CREATED",
  "MATCHING",
  "ASSIGNED",
  "DEPOSIT_PENDING",
  "CONFIRMED",
  "IN_PROGRESS",
  "MEETING_REQUESTED",
]);

export function isClosedWorkflowActivity(value = {}) {
  const status = String(value?.status || "").toUpperCase();
  const workflowPhase = String(value?.workflowPhase || "").toUpperCase();
  if (String(value?.activityBucket || "").toLowerCase() === "history") return true;
  if (workflowPhase === "TERMINAL") return true;
  if (isTerminalWorkflowStatus(status)) return true;
  if (status === "COMPLETED") {
    const hasPersistedRatingWorkflow =
      workflowPhase === "RATING" &&
      (Array.isArray(value?.workflowEvents) ? value.workflowEvents : []).some((event) =>
        ["confirm-completion", "rate-partner", "rate-customer"].includes(
          String(event?.action || "").toLowerCase(),
        ),
      );
    if (hasPersistedRatingWorkflow) return false;
    return true;
  }
  return false;
}

export function isWorkflowOrderCancellable(value = {}) {
  const status = String(value?.status || "").toUpperCase();
  return !isClosedWorkflowActivity(value) && CANCELLABLE_WORKFLOW_STATUSES.has(status);
}

export function isWorkflowOrderChatEnabled(value = {}) {
  const status = String(value?.status || "").toUpperCase();
  return (
    !isClosedWorkflowActivity(value) &&
    value?.chatEnabled === true &&
    (status === "IN_PROGRESS" || status === "MEETING_REQUESTED")
  );
}

function hasSubmittedWorkflowRating(value) {
  if (!value || typeof value !== "object") return false;
  for (const key of ["rating", "partnerRating", "customerRating", "fixerRating", "listerRating"]) {
    const rating = value[key];
    if (rating == null || rating === "") continue;
    const numeric = Number(rating);
    if (Number.isFinite(numeric) ? numeric > 0 : true) return true;
  }
  return false;
}

export function isCompletedAwaitingWorkflowRating(value) {
  if (!value || typeof value !== "object") return false;
  if (String(value.status || "").toUpperCase() !== "COMPLETED") return false;
  if (String(value?.activityBucket || "").toLowerCase() === "history") return false;
  if (value?.sourceVersion === "cblue-fixer-workflow-v1" || Array.isArray(value?.actions)) {
    return (Array.isArray(value?.actions) ? value.actions : []).some((action) =>
      ["rate-partner", "rate-customer"].includes(
        String(action?.key || "").toLowerCase(),
      ),
    );
  }
  if (hasWorkflowCompletionMarker(value) || hasSubmittedWorkflowRating(value)) return false;
  return getTextFields(value).some((text) => COMPLETED_AWAITING_RATING_PATTERN.test(text));
}

function hasTerminalAlertMarker(value) {
  return getTextFields(value).some((text) => TERMINAL_ALERT_PATTERN.test(text));
}

function addPo(set, value) {
  const po = normalizeWorkflowPo(value);
  if (po) set.add(po);
}

export function filterLiveWorkflowItems(items = [], terminalPoValues = []) {
  const terminalPos =
    terminalPoValues instanceof Set
      ? terminalPoValues
      : new Set(Array.from(terminalPoValues || []).map(normalizeWorkflowPo).filter(Boolean));

  return (Array.isArray(items) ? items : []).filter((item) => {
    const po = normalizeWorkflowPo(item?.po || item?.poNumber || item?.id || item?.description || item);
    if (po && terminalPos.has(po)) return false;
    const status = String(item?.status || "").toUpperCase();
    if (isTerminalWorkflowStatus(status)) return false;
    if (status === "COMPLETED" && !isCompletedAwaitingWorkflowRating(item)) return false;
    if (hasTerminalAlertMarker(item)) return false;
    return true;
  });
}

function normalizeWorkflowPoSet(values = []) {
  const source = values instanceof Set ? [...values] : Array.from(values || []);
  return new Set(source.map(normalizeWorkflowPo).filter(Boolean));
}

export function filterWorkflowItemsByKnownBackendPos(
  items = [],
  {
    allowLocalCustomerWorkflow = false,
    backendPoValues = [],
    fallbackBackendPoValues = [],
    hasFetchedBackend = false,
  } = {},
) {
  const backendPos = normalizeWorkflowPoSet(backendPoValues);
  const fallbackPos = normalizeWorkflowPoSet(fallbackBackendPoValues);
  const knownBackendPos =
    backendPos.size > 0 || hasFetchedBackend ? backendPos : fallbackPos;

  return (Array.isArray(items) ? items : []).filter((item) => {
    const po = normalizeWorkflowPo(
      item?.po || item?.poNumber || item?.id || item?.description || item?.desc || item,
    );
    if (!po) return allowLocalCustomerWorkflow;
    if (po.startsWith("PRE-")) return true;
    if (knownBackendPos.size === 0) return allowLocalCustomerWorkflow;
    return knownBackendPos.has(po);
  });
}
export function normalizeWorkflowHistoryItems(items = []) {
  if (!Array.isArray(items)) return [];
  const byKey = new Map();
  for (const item of items) {
    if (!item || typeof item !== "object") continue;
    const po = normalizeWorkflowPo(
      item.po || item.poNumber || item.id || item.description || item.desc,
    );
    const key = po || String(item.id || "").trim();
    if (!key) continue;
    byKey.set(key, item);
  }
  return [...byKey.values()];
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
  const removableExactKeys = new Set([
    "cblue_po_attachments",
    "cblue_order_attachments",
  ]);
  const removed = [];
  const removableKeys = [];
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (!key) continue;
    if (removableExactKeys.has(key) || removablePrefixes.some((prefix) => key.startsWith(prefix))) {
      removableKeys.push(key);
    }
  }

  for (const key of removableKeys) {
    storage.removeItem(key);
    removed.push(key);
  }

  return removed;
}

function isQuotaError(error) {
  const name = String(error?.name || "");
  const message = String(error?.message || "");
  return /QuotaExceeded|NS_ERROR_DOM_QUOTA_REACHED/i.test(name) || /quota/i.test(message);
}

function trimText(value, limit = 1200) {
  const text = String(value || "");
  return text.length > limit ? `${text.slice(0, limit)}...` : text;
}

function compactChatHistory(messages) {
  if (!Array.isArray(messages)) return undefined;
  return messages.slice(-4).map((message) => {
    if (message == null || typeof message !== "object") return { text: trimText(message, 180) };
    return {
      id: message.id,
      sender: message.sender,
      senderName: message.senderName,
      text: trimText(message.text || message.message || message.msg || "", 180),
      time: message.time,
      createdAt: message.createdAt,
    };
  });
}

function compactHistoryEntry(entry) {
  if (!entry || typeof entry !== "object") return entry;
  const compacted = { ...entry };
  for (const key of [
    "attachments",
    "files",
    "imageUrls",
    "images",
    "issueImage",
    "metadata",
    "projectImages",
    "rawAttachments",
  ]) {
    delete compacted[key];
  }
  if (compacted.description) compacted.description = trimText(compacted.description, 300);
  if (compacted.desc) compacted.desc = trimText(compacted.desc, 300);
  if (compacted.projectDetails) compacted.projectDetails = trimText(compacted.projectDetails, 300);
  if (Array.isArray(compacted.chatHistory)) {
    compacted.chatHistory = compactChatHistory(compacted.chatHistory);
  }
  return compacted;
}

function summarizeHistoryEntry(entry) {
  if (!entry || typeof entry !== "object") return entry;
  const chatHistory = compactChatHistory(entry.chatHistory);
  return {
    id: entry.id,
    po: entry.po,
    title: entry.title || entry.service,
    service: entry.service || entry.title,
    customer: entry.customer,
    counterpartName: entry.counterpartName,
    completedAt: entry.completedAt,
    createdAt: entry.createdAt,
    statusChangedAt: entry.statusChangedAt,
    status: entry.status,
    statusName: entry.statusName,
    statusNote: trimText(entry.statusNote, 220),
    step: entry.step,
    stepName: entry.stepName,
    budget: entry.budget,
    fee: entry.fee,
    tier: entry.tier,
    rating: entry.rating,
    partnerRating: entry.partnerRating,
    customerRating: entry.customerRating,
    location: entry.location,
    subdistrict: entry.subdistrict,
    projectDetails: trimText(entry.projectDetails || entry.description || entry.desc || "", 220),
    description: trimText(entry.description || entry.projectDetails || entry.desc || "", 220),
    ...(chatHistory && chatHistory.length > 0 ? { chatHistory: chatHistory.slice(-2) } : {}),
  };
}

function tinyHistoryEntry(entry) {
  if (!entry || typeof entry !== "object") return entry;
  const chatHistory = compactChatHistory(entry.chatHistory);
  return {
    po: entry.po,
    title: entry.title || entry.service,
    service: entry.service || entry.title,
    completedAt: entry.completedAt,
    statusChangedAt: entry.statusChangedAt,
    status: entry.status,
    statusName: entry.statusName,
    statusNote: trimText(entry.statusNote, 140),
    step: entry.step,
    stepName: entry.stepName,
    budget: entry.budget,
    fee: entry.fee,
    partnerRating: entry.partnerRating,
    customerRating: entry.customerRating,
    ...(chatHistory && chatHistory.length > 0 ? { chatHistory: chatHistory.slice(-1) } : {}),
  };
}

function compactWorkflowStorageValue(key, value) {
  if (key !== "ghis_mock_history" || !Array.isArray(value)) return value;
  const byPo = new Map();
  for (const entry of value) {
    const po = normalizeWorkflowPo(entry?.po || entry?.id || entry?.description || entry);
    const mapKey = po || String(entry?.id || byPo.size);
    byPo.set(mapKey, compactHistoryEntry(entry));
  }
  return [...byPo.values()]
    .sort((a, b) => {
      const bDate = new Date(b?.completedAt || b?.statusChangedAt || b?.createdAt || b?.date || 0).getTime();
      const aDate = new Date(a?.completedAt || a?.statusChangedAt || a?.createdAt || a?.date || 0).getTime();
      return (Number.isFinite(bDate) ? bDate : 0) - (Number.isFinite(aDate) ? aDate : 0);
    })
    .slice(0, 40);
}

function summarizeWorkflowStorageValue(key, value) {
  if (key !== "ghis_mock_history" || !Array.isArray(value)) return value;
  return value.map(summarizeHistoryEntry).slice(0, 20);
}

function tinyWorkflowStorageValue(key, value) {
  if (key !== "ghis_mock_history" || !Array.isArray(value)) return value;
  return value.map(tinyHistoryEntry).slice(0, 10);
}

function serializeStorageValue(value) {
  return typeof value === "string" ? value : JSON.stringify(value);
}

function compactExistingWorkflowHistory(storage) {
  if (!storage || typeof storage.getItem !== "function" || typeof storage.setItem !== "function") return false;
  let parsed;
  try {
    parsed = JSON.parse(storage.getItem("ghis_mock_history") || "[]");
  } catch {
    return false;
  }
  if (!Array.isArray(parsed) || parsed.length === 0) return false;

  const compacted = compactWorkflowStorageValue("ghis_mock_history", parsed);
  const summarized = summarizeWorkflowStorageValue("ghis_mock_history", compacted);
  const tiny = tinyWorkflowStorageValue("ghis_mock_history", summarized);
  const candidates = [
    ...(Array.isArray(tiny) ? [tiny.slice(0, 1), tiny.slice(0, 5)] : []),
    tiny,
    ...(Array.isArray(summarized) ? [summarized.slice(0, 1), summarized.slice(0, 5), summarized.slice(0, 10), summarized.slice(0, 20)] : []),
    summarized,
    compacted,
  ];

  for (const candidate of candidates) {
    try {
      storage.setItem("ghis_mock_history", serializeStorageValue(candidate));
      return true;
    } catch (error) {
      if (!isQuotaError(error)) return false;
    }
  }

  return false;
}

export function setWorkflowStorageItem(storage, key, value, { softLimitBytes = 4.5 * 1024 * 1024 } = {}) {
  if (!storage || typeof storage.setItem !== "function") {
    return { ok: false, compacted: false, value };
  }

  const candidates = [value];
  const compacted = compactWorkflowStorageValue(key, value);
  if (compacted !== value) candidates.push(compacted);
  const summarized = summarizeWorkflowStorageValue(key, compacted);
  if (summarized !== compacted) candidates.push(summarized);
  const tiny = tinyWorkflowStorageValue(key, summarized);
  if (tiny !== summarized) candidates.push(tiny);
  if (Array.isArray(tiny) && tiny.length > 5) candidates.push(tiny.slice(0, 5));
  if (Array.isArray(tiny) && tiny.length > 1) candidates.push(tiny.slice(0, 1));
  if (Array.isArray(summarized) && summarized.length > 10) candidates.push(summarized.slice(0, 10));
  if (Array.isArray(summarized) && summarized.length > 5) candidates.push(summarized.slice(0, 5));
  if (Array.isArray(summarized) && summarized.length > 1) candidates.push(summarized.slice(0, 1));
  if (Array.isArray(compacted) && compacted.length > 20) candidates.push(compacted.slice(0, 20));
  if (Array.isArray(compacted) && compacted.length > 10) candidates.push(compacted.slice(0, 10));
  if (Array.isArray(compacted) && compacted.length > 5) candidates.push(compacted.slice(0, 5));
  if (Array.isArray(compacted) && compacted.length > 1) candidates.push(compacted.slice(0, 1));

  let sawQuotaError = false;
  for (const candidate of candidates) {
    try {
      pruneWorkflowStorage(storage, softLimitBytes);
      storage.setItem(key, serializeStorageValue(candidate));
      return { ok: true, compacted: candidate !== value, value: candidate };
    } catch (error) {
      sawQuotaError = sawQuotaError || isQuotaError(error);
      if (!isQuotaError(error)) return { ok: false, compacted: candidate !== value, value: candidate };
    }

    try {
      if (key !== "ghis_mock_history") compactExistingWorkflowHistory(storage);
      pruneWorkflowStorage(storage, 0);
      storage.setItem(key, serializeStorageValue(candidate));
      return { ok: true, compacted: candidate !== value, value: candidate };
    } catch (error) {
      sawQuotaError = sawQuotaError || isQuotaError(error);
      if (!isQuotaError(error)) return { ok: false, compacted: candidate !== value, value: candidate };
    }
  }

  return { ok: false, compacted: sawQuotaError, value: candidates[candidates.length - 1] ?? value };
}
