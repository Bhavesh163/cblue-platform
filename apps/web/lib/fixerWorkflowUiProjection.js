import { getFixerMeetingSnapshot } from "./fixerMeetingSnapshot.js";
import { isClosedWorkflowActivity } from "./workflowVisibility.js";

function normalizedText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function timestamp(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const raw = value.trim();
    if (/^\d+$/.test(raw)) {
      const numeric = Number(raw);
      if (Number.isFinite(numeric)) return numeric;
    }
    const localized = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:[ T](\d{2}):(\d{2}))?$/);
    if (localized) {
      const [, day, month, year, hour = "00", minute = "00"] = localized;
      return new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute)).getTime();
    }
  }
  const parsed = Date.parse(String(value || ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function explicitPo(order) {
  return normalizedText(order?.po || order?.poNumber || order?.orderNumber);
}

export function projectFixerLocations(order = null) {
  const address = order?.address && typeof order.address === "object" ? order.address : {};
  const latitude = Number(address.latitude);
  const longitude = Number(address.longitude);
  const hasCoordinates =
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    !(Math.abs(latitude) < 0.000001 && Math.abs(longitude) < 0.000001);
  const siteSubdistrict =
    normalizedText(order?.siteSubdistrict) ||
    normalizedText(order?.subdistrict) ||
    normalizedText(address.subdistrict) ||
    normalizedText(address.district) ||
    normalizedText(address.province);
  const projectLocation = hasCoordinates
    ? `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
    : normalizedText(order?.projectLocation) || normalizedText(order?.location) || siteSubdistrict;

  return {
    projectLocation,
    siteSubdistrict,
    cardLocation: siteSubdistrict || projectLocation,
  };
}

export function reconcileFixerCardLocations(cachedItem = null, backendOrder = null) {
  const locations = projectFixerLocations(backendOrder);
  return {
    ...(cachedItem || {}),
    ...locations,
    location: locations.projectLocation,
    subdistrict: locations.cardLocation,
  };
}

export function projectPartnerMeetingConfirmation(order = null) {
  const meeting = getFixerMeetingSnapshot(order);
  return {
    meeting: {
      date: meeting.meetingDate,
      time: meeting.meetingTime,
      venue: meeting.meetingVenue,
      note: meeting.meetingNote,
    },
    ...meeting,
    meetingDateLabel: meeting.meetingDate,
    meetingTimeLabel: meeting.meetingTime,
    venue: meeting.meetingVenue,
  };
}

export function mergeFixerWorkflowRecord(cachedRecord = null, backendOrder = null) {
  if (!backendOrder) return cachedRecord || {};
  const authoritativeFields = Object.fromEntries(
    Object.entries(backendOrder).filter(([, value]) => value !== undefined && value !== null),
  );
  const meeting = projectPartnerMeetingConfirmation(backendOrder);
  const locations = projectFixerLocations(backendOrder);

  return {
    ...(cachedRecord || {}),
    ...authoritativeFields,
    po: explicitPo(backendOrder) || explicitPo(cachedRecord),
    ...locations,
    location: locations.projectLocation,
    subdistrict: locations.cardLocation,
    ...meeting,
  };
}

function numericBudget(order) {
  const raw = order?.budget ?? order?.totalBudget ?? order?.fee ?? 0;
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  const parsed = Number(String(raw || "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function fixerChatIdentity(order) {
  const po = explicitPo(order);
  if (!po) return null;
  const service =
    normalizedText(order?.service) ||
    normalizedText(order?.serviceCategory) ||
    normalizedText(order?.title) ||
    normalizedText(order?.serviceTh) ||
    po;
  const budget = numericBudget(order);
  return {
    po,
    service,
    name: `${service} - ${po} - ฿${budget.toLocaleString("en-US")}`,
  };
}

export function projectFixerChatRoom(order = null, messages = []) {
  if (!order || isClosedWorkflowActivity(order)) return null;
  const chatEnabled = order?.chat?.enabled ?? order?.chatEnabled;
  if (chatEnabled !== true) return null;

  const identity = fixerChatIdentity(order);
  if (!identity) return null;
  const messageItems = Array.isArray(messages) ? messages.filter(Boolean) : [];
  if (!messageItems.length) return null;
  const latest = messageItems[messageItems.length - 1] || {};

  return {
    id: identity.po,
    ...identity,
    lastMsg: normalizedText(latest?.text),
    time: latest?.time || latest?.createdAt || "",
    messageItems,
  };
}

export function reconcilePartnerMeetingRequest(cachedRequest = null, backendOrder = null) {
  const meeting = projectPartnerMeetingConfirmation(backendOrder);
  const locations = projectFixerLocations(backendOrder);
  const po = explicitPo(backendOrder) || explicitPo(cachedRequest);

  return {
    ...(cachedRequest || {}),
    orderId: backendOrder?.orderId || backendOrder?.id || cachedRequest?.orderId,
    po,
    service: backendOrder?.service || cachedRequest?.service,
    serviceTh: backendOrder?.serviceTh || cachedRequest?.serviceTh,
    serviceZh: backendOrder?.serviceZh || cachedRequest?.serviceZh,
    customer: backendOrder?.customer || cachedRequest?.customer,
    workflowPhase: backendOrder?.workflowPhase || "MEETING_CONFIRM",
    status: "MEETING_REQUESTED",
    type: "meeting_confirm_partner",
    workflowType: "meeting_confirm_partner",
    step: 8,
    mockStep: 8,
    actionNeeded: true,
    ...locations,
    location: locations.projectLocation,
    subdistrict: locations.cardLocation,
    ...meeting,
  };
}

const FIXER_STEP_BY_PHASE = Object.freeze({
  DRAFT: 3,
  PARTNER_DECISION: 5,
  FEE: 6,
  CHAT: 7,
  MEETING_CONFIRM: 8,
  VARIATION: 9,
  VARIATION_CONFIRM: 9,
  COMPLETION: 10,
  COMPLETION_CONFIRM: 10,
  RATING: 11,
  TERMINAL: 11,
});

export function projectAuthoritativeFixerStep(order = null) {
  const phase = normalizedText(order?.workflowPhase).toUpperCase();
  if (FIXER_STEP_BY_PHASE[phase]) return FIXER_STEP_BY_PHASE[phase];
  const currentStep = Number(order?.currentStep || 0);
  return Number.isInteger(currentStep) && currentStep >= 1 && currentStep <= 11
    ? currentStep
    : 0;
}

export function buildMeetingConfirmedWorkflowAlert(order = null) {
  const po = explicitPo(order);
  if (!po || projectAuthoritativeFixerStep(order) !== 9 || isClosedWorkflowActivity(order)) {
    return null;
  }
  const event = (Array.isArray(order?.workflowEvents) ? order.workflowEvents : []).find(
    (item) =>
      normalizedText(item?.action) === "confirm-meeting" &&
      normalizedText(item?.actorRole) === "partner" &&
      timestamp(item?.createdAt) > 0,
  );
  if (!event) return null;

  return {
    id: `a-meeting-confirmed-${po}`,
    po,
    workflowStage: 9,
    authoritative: true,
    msg: `${po} Meeting confirmed.`,
    msgTh: `${po} Meeting confirmed.`,
    msgZh: `${po} Meeting confirmed.`,
    createdAt: timestamp(event.createdAt),
    dot: "bg-teal-500",
    supersedesIds: [`a-pay-${po}`, `a-chat-${po}`, `a-meeting-wait-${po}`],
  };
}

export function isCustomerFixerActionNeeded(order = null, fallbackStep = 0) {
  if (Array.isArray(order?.actions)) {
    return order.actions.some(
      (action) =>
        normalizedText(action?.owner) === "customer" &&
        normalizedText(action?.key) !== "customer-cancel",
    );
  }
  const phase = normalizedText(order?.workflowPhase).toUpperCase();
  const status = normalizedText(order?.status).toUpperCase();

  if (phase === "MEETING_CONFIRM" || status === "MEETING_REQUESTED") return false;
  if (phase) {
    return ["FEE", "CHAT", "VARIATION_CONFIRM", "COMPLETION_CONFIRM", "RATING"].includes(phase);
  }
  return [6, 8, 9, 10, 11].includes(Number(fallbackStep));
}

export function buildCustomerMeetingAwaitingPartnerAlert(order = null) {
  const phase = normalizedText(order?.workflowPhase).toUpperCase();
  const status = normalizedText(order?.status).toUpperCase();
  const po = explicitPo(order);
  if (!po || phase !== "MEETING_CONFIRM" || isClosedWorkflowActivity(order)) return null;

  const createdAt =
    timestamp(order?.statusHistory?.[0]?.createdAt) ||
    timestamp(order?.statusChangedAt) ||
    timestamp(order?.updatedAt) ||
    timestamp(order?.createdAt);

  return {
    id: `a-meeting-wait-${po}`,
    po,
    workflowStage: 8,
    authoritative: true,
    msg: `${po}: Your site meeting invitation was sent. CBLUE is awaiting partner confirmation.`,
    msgTh: `${po}: ส่งคำเชิญนัดหมายหน้างานแล้ว ขณะนี้กำลังรอพาร์ทเนอร์ยืนยัน`,
    msgZh: `${po}: 现场会议邀请已发送，目前正在等待合作伙伴确认。`,
    createdAt,
    dot: "bg-teal-500",
    supersedesIds: [`a-pay-${po}`, `a-chat-${po}`],
  };
}

export function mergeAuthoritativeWorkflowAlerts(alerts = []) {
  const byId = new Map();

  for (const alert of alerts.filter(Boolean)) {
    const id = normalizedText(alert?.id);
    const createdAt = timestamp(alert?.createdAt || alert?.time);
    if (!id || !createdAt) continue;
    const candidate = { ...alert, createdAt };
    const existing = byId.get(id);
    if (!existing) {
      byId.set(id, candidate);
      continue;
    }
    const newer = createdAt >= timestamp(existing.createdAt || existing.time) ? candidate : existing;
    const metadata = {
      po: normalizedText(existing.po) || normalizedText(candidate.po),
      workflowStage: Number(existing.workflowStage || candidate.workflowStage || 0),
      authoritative: existing.authoritative === true || candidate.authoritative === true,
    };
    byId.set(id, { ...newer, ...metadata });
  }

  const deduplicated = Array.from(byId.values());
  const superseded = new Set(deduplicated.flatMap((alert) => alert?.supersedesIds || []));
  const highestStageByPo = new Map();
  const authoritativeStageByPo = new Map();
  for (const alert of deduplicated) {
    const po = normalizedText(alert?.po);
    const stage = Number(alert?.workflowStage || 0);
    if (po && stage > Number(highestStageByPo.get(po) || 0)) highestStageByPo.set(po, stage);
    if (po && stage && alert?.authoritative === true) authoritativeStageByPo.set(po, stage);
  }

  return deduplicated
    .filter((alert) => {
      if (superseded.has(alert.id)) return false;
      const id = normalizedText(alert?.id);
      const po = normalizedText(alert?.po);
      const stage = Number(alert?.workflowStage || 0);
      if (po && authoritativeStageByPo.has(po)) return alert?.authoritative === true;
      return !po || !stage || stage >= Number(highestStageByPo.get(po) || 0);
    })
    .sort(
      (left, right) => timestamp(right.createdAt || right.time) - timestamp(left.createdAt || left.time),
    );
}

export function projectPartnerWorkflowRequest(order = null) {
  if (!order || isClosedWorkflowActivity(order)) return null;
  const partnerActions = (Array.isArray(order?.actions) ? order.actions : []).filter(
    (action) => normalizedText(action?.owner) === "partner",
  );
  const primaryAction = partnerActions.find(
    (action) => normalizedText(action?.key) !== "customer-cancel",
  );
  if (!primaryAction) return null;

  const key = normalizedText(primaryAction.key);
  const step = Number(primaryAction.actionStep || order?.currentStep || 0);
  if (key === "confirm-meeting") {
    return {
      ...reconcilePartnerMeetingRequest(null, order),
      actionKey: key,
      actionLabel: normalizedText(primaryAction.label),
      availableActions: partnerActions.map((action) => normalizedText(action?.key)).filter(Boolean),
    };
  }
  if (["send-variation", "skip-variation"].includes(key)) {
    return {
      ...mergeFixerWorkflowRecord(null, order),
      workflowType: "variation_decision_partner",
      type: "variation_decision_partner",
      step,
      mockStep: step,
      actionNeeded: true,
      actionKey: key,
      actionLabel: normalizedText(primaryAction.label),
      availableActions: partnerActions.map((action) => normalizedText(action?.key)).filter(Boolean),
    };
  }
  return null;
}

export function projectWorkflowChatHistory(order = null, messages = undefined) {
  if (!order || !isClosedWorkflowActivity(order)) return null;
  const identity = fixerChatIdentity(order);
  if (!identity) return null;
  const sourceMessages = Array.isArray(messages)
    ? messages
    : Array.isArray(order?.chatMessages)
      ? order.chatMessages
      : [];
  const messageItems = sourceMessages.filter(Boolean);
  if (!messageItems.length) return null;
  return {
    id: identity.po,
    ...identity,
    readOnly: true,
    messageItems,
  };
}

function meetingTimestamp(dateValue, timeValue) {
  const date = normalizedText(dateValue);
  const time = normalizedText(timeValue) || "00:00";
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const localized = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(date);
  let parts = null;
  if (iso) parts = [Number(iso[1]), Number(iso[2]), Number(iso[3])];
  if (localized) parts = [Number(localized[3]), Number(localized[2]), Number(localized[1])];
  const timeParts = /^(\d{1,2}):(\d{2})$/.exec(time);
  if (!parts || !timeParts) return 0;
  const value = new Date(
    parts[0],
    parts[1] - 1,
    parts[2],
    Number(timeParts[1]),
    Number(timeParts[2]),
  ).getTime();
  return Number.isFinite(value) ? value : 0;
}

export function projectUpcomingFixerMeetings(orders = [], now = Date.now()) {
  return (Array.isArray(orders) ? orders : [])
    .flatMap((order) => {
      if (!order || isClosedWorkflowActivity(order)) return [];
      const confirmed = (Array.isArray(order?.workflowEvents) ? order.workflowEvents : []).some(
        (event) =>
          normalizedText(event?.action) === "confirm-meeting" &&
          normalizedText(event?.actorRole) === "partner" &&
          timestamp(event?.createdAt) > 0,
      );
      if (!confirmed) return [];
      const meeting = projectPartnerMeetingConfirmation(order);
      const meetingAt = meetingTimestamp(meeting.meetingDate, meeting.meetingTime);
      if (!meetingAt || meetingAt <= Number(now || 0)) return [];
      return [{
        ...mergeFixerWorkflowRecord(null, order),
        po: explicitPo(order),
        meetingAt,
        meeting,
      }];
    })
    .sort((left, right) => left.meetingAt - right.meetingAt)
    .slice(0, 3);
}
