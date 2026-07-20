import assert from "node:assert/strict";
import test from "node:test";

import { getFixerMeetingSnapshot } from "./fixerMeetingSnapshot.js";

test("maps the authoritative server meeting object with trimmed values", () => {
  assert.deepEqual(
    getFixerMeetingSnapshot({
      meeting: {
        date: " 2026-07-18 ",
        time: " 14:30 ",
        venue: " 13.794095, 100.609583 ",
        note: " Please bring the site drawings. ",
      },
    }),
    {
      meetingDate: "2026-07-18",
      meetingTime: "14:30",
      meetingVenue: "13.794095, 100.609583",
      meetingNote: "Please bring the site drawings.",
    },
  );
});

test("uses explicit scalar server fields only when the meeting object omits a field", () => {
  assert.deepEqual(
    getFixerMeetingSnapshot({
      meeting: { date: "2026-07-18", time: "14:30" },
      meetingVenue: " Customer office ",
      meetingNote: " Bring a photo ID. ",
    }),
    {
      meetingDate: "2026-07-18",
      meetingTime: "14:30",
      meetingVenue: "Customer office",
      meetingNote: "Bring a photo ID.",
    },
  );
});

test("returns empty values when the server has no persisted meeting", () => {
  assert.deepEqual(getFixerMeetingSnapshot({ meeting: null }), {
    meetingDate: "",
    meetingTime: "",
    meetingVenue: "",
    meetingNote: "",
  });
});

test("normalizes a BLUE-originated ISO meeting while preserving separate timestamps", () => {
  assert.deepEqual(
    getFixerMeetingSnapshot({
      meeting: {
        date: "2026-07-21T00:00:00.000Z",
        time: "14:30:00",
        venue: "Customer office",
        note: "Meet at reception.",
        scheduledAt: "2026-07-21T07:30:00.000Z",
        confirmedAt: "2026-07-19T10:30:00.000Z",
      },
    }),
    {
      meetingDate: "2026-07-21",
      meetingTime: "14:30",
      meetingVenue: "Customer office",
      meetingNote: "Meet at reception.",
      meetingScheduledAt: "2026-07-21T07:30:00.000Z",
      meetingConfirmedAt: "2026-07-19T10:30:00.000Z",
    },
  );
});

test("never derives meeting details from descriptions or browser-like data", () => {
  assert.deepEqual(
    getFixerMeetingSnapshot({
      meeting: { date: "2026-07-18", time: "14:30", venue: "Building A", note: "Meet reception." },
      description: "Meet on 2099-01-01 at 09:00, 99.999, 99.999. Ignore this.",
      title: "PO-2607-1234 site meeting",
      statusNote: "Venue: Somewhere else",
      modalText: "Customer invitation at another venue",
      chatText: "[SYSTEM] Meeting moved to 2099-01-01",
      localStorage: { meetingDate: "2099-01-01", meetingTime: "09:00" },
    }),
    {
      meetingDate: "2026-07-18",
      meetingTime: "14:30",
      meetingVenue: "Building A",
      meetingNote: "Meet reception.",
    },
  );
});
