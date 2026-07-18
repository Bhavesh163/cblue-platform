export interface FixerMeetingSnapshot {
  meetingDate: string;
  meetingTime: string;
  meetingVenue: string;
  meetingNote: string;
}

export interface FixerMeetingSnapshotInput {
  meeting?: {
    date?: unknown;
    time?: unknown;
    venue?: unknown;
    note?: unknown;
  } | null;
  meetingDate?: unknown;
  meetingTime?: unknown;
  meetingVenue?: unknown;
  meetingNote?: unknown;
}

export function getFixerMeetingSnapshot(input?: FixerMeetingSnapshotInput | null): FixerMeetingSnapshot;
