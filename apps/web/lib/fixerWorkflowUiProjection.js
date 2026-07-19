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

export function projectFixerChatRoom(order = null, messages = []) {
  if (!order || isClosedWorkflowActivity(order)) return null;
  const chatEnabled = order?.chat?.enabled ?? order?.chatEnabled;
  if (chatEnabled !== true) return null;

  const po = explicitPo(order);
  if (!po) return null;
  const messageItems = Array.isArray(messages) ? messages.filter(Boolean) : [];
  if (!messageItems.length) return null;
  const latest = messageItems[messageItems.length - 1] || {};
  const service =
    normalizedText(order?.service) ||
    normalizedText(order?.title) ||
    normalizedText(order?.serviceTh) ||
    po;
  const budget = numericBudget(order);

  return {
    id: po,
    po,
    name: `${service} - ${po} - ฿${budget.toLocaleString("en-US")}`,
    service,
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

export function isCustomerFixerActionNeeded(order = null, fallbackStep = 0) {
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
