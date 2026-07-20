function persistedText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function firstPersistedText(...values) {
  return values.map(persistedText).find(Boolean) || "";
}

function normalizedMeetingDate(...values) {
  const date = firstPersistedText(...values);
  const iso = /^(\d{4}-\d{2}-\d{2})(?:T|\s|$)/.exec(date);
  if (iso) return iso[1];
  return /^\d{2}\/\d{2}\/\d{4}$/.test(date) ? date : "";
}

function normalizedMeetingTime(...values) {
  const time = firstPersistedText(...values);
  const match = /^(\d{1,2}:\d{2})(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?$/.exec(time);
  return match ? match[1] : "";
}

export function getFixerMeetingSnapshot(input = null) {
  const meeting = input?.meeting && typeof input.meeting === "object" ? input.meeting : null;
  const scheduledAt = firstPersistedText(meeting?.scheduledAt, input?.meetingScheduledAt);
  const confirmedAt = firstPersistedText(meeting?.confirmedAt, input?.meetingConfirmedAt);

  return {
    meetingDate: normalizedMeetingDate(meeting?.date, input?.meetingDate),
    meetingTime: normalizedMeetingTime(meeting?.time, input?.meetingTime),
    meetingVenue: firstPersistedText(meeting?.venue, input?.meetingVenue),
    meetingNote: firstPersistedText(meeting?.note, input?.meetingNote),
    ...(scheduledAt ? { meetingScheduledAt: scheduledAt } : {}),
    ...(confirmedAt ? { meetingConfirmedAt: confirmedAt } : {}),
  };
}
