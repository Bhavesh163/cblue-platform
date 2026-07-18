import { getFixerMeetingSnapshot } from "./fixerMeetingSnapshot.js";

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
  if (!po || phase !== "MEETING_CONFIRM" || status !== "MEETING_REQUESTED") return null;

  const createdAt =
    timestamp(order?.statusHistory?.[0]?.createdAt) ||
    timestamp(order?.statusChangedAt) ||
    timestamp(order?.updatedAt) ||
    timestamp(order?.createdAt);

  return {
    id: `a-meeting-wait-${po}`,
    po,
    msg: `${po}: Your site meeting invitation was sent. CBLUE is awaiting partner confirmation.`,
    msgTh: `${po}: ส่งคำเชิญนัดหมายหน้างานแล้ว ขณะนี้กำลังรอพาร์ทเนอร์ยืนยัน`,
    msgZh: `${po}: 现场会议邀请已发送，目前正在等待合作伙伴确认。`,
    createdAt,
    dot: "bg-teal-500",
    supersedesIds: [`a-pay-${po}`, `a-chat-${po}`],
  };
}

export function mergeAuthoritativeWorkflowAlerts(alerts = []) {
  const valid = alerts.filter(Boolean);
  const superseded = new Set(valid.flatMap((alert) => alert?.supersedesIds || []));
  const byId = new Map();

  for (const alert of valid) {
    const id = normalizedText(alert?.id);
    const createdAt = timestamp(alert?.createdAt || alert?.time);
    if (!id || !createdAt || superseded.has(id)) continue;
    const existing = byId.get(id);
    if (!existing || createdAt >= timestamp(existing.createdAt || existing.time)) {
      byId.set(id, { ...alert, createdAt });
    }
  }

  return Array.from(byId.values()).sort(
    (left, right) => timestamp(right.createdAt || right.time) - timestamp(left.createdAt || left.time),
  );
}
