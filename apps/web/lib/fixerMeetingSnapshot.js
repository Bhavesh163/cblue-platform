function persistedText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function firstPersistedText(...values) {
  return values.map(persistedText).find(Boolean) || "";
}

export function getFixerMeetingSnapshot(input = null) {
  const meeting = input?.meeting && typeof input.meeting === "object" ? input.meeting : null;

  return {
    meetingDate: firstPersistedText(meeting?.date, input?.meetingDate),
    meetingTime: firstPersistedText(meeting?.time, input?.meetingTime),
    meetingVenue: firstPersistedText(meeting?.venue, input?.meetingVenue),
    meetingNote: firstPersistedText(meeting?.note, input?.meetingNote),
  };
}
