export interface FixerWorkflowUiOrder {
  po?: string | null;
  poNumber?: string | null;
  orderNumber?: string | null;
  status?: string | null;
  workflowPhase?: string | null;
  meeting?: { date?: string | null; time?: string | null; venue?: string | null; note?: string | null } | null;
  meetingDate?: string | null;
  meetingTime?: string | null;
  meetingVenue?: string | null;
  meetingNote?: string | null;
  statusHistory?: Array<{ createdAt?: string | number | null }> | null;
  statusChangedAt?: string | number | null;
  updatedAt?: string | number | null;
  createdAt?: string | number | null;
}

export function projectPartnerMeetingConfirmation(order?: FixerWorkflowUiOrder | null): {
  meeting: { date: string; time: string; venue: string; note: string };
  meetingDate: string;
  meetingTime: string;
  meetingVenue: string;
  meetingNote: string;
  meetingDateLabel: string;
  meetingTimeLabel: string;
  venue: string;
};

export function isCustomerFixerActionNeeded(order?: FixerWorkflowUiOrder | null, fallbackStep?: number): boolean;

export interface WorkflowUiAlert {
  id: string;
  po?: string;
  msg?: string;
  msgTh?: string;
  msgZh?: string;
  time?: string | number;
  createdAt?: string | number;
  dot?: string;
  supersedesIds?: string[];
  [key: string]: unknown;
}

export function buildCustomerMeetingAwaitingPartnerAlert(order?: FixerWorkflowUiOrder | null): WorkflowUiAlert | null;
export function mergeAuthoritativeWorkflowAlerts(alerts?: Array<WorkflowUiAlert | null | undefined>): WorkflowUiAlert[];
