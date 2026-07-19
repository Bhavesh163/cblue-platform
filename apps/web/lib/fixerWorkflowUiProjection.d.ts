export interface FixerWorkflowUiOrder {
  id?: string | null;
  orderId?: string | null;
  po?: string | null;
  poNumber?: string | null;
  orderNumber?: string | null;
  status?: string | null;
  workflowPhase?: string | null;
  currentStep?: number | null;
  activityBucket?: "request" | "active" | "history" | null;
  actions?: Array<{
    key?: string | null;
    owner?: "customer" | "partner" | null;
    label?: string | null;
    actionStep?: number | null;
    feeMode?: "payment" | "free-pass" | null;
  }> | null;
  chatMessages?: Array<Record<string, unknown>> | null;
  workflowEvents?: Array<{
    action?: string | null;
    createdAt?: string | number | null;
    actorRole?: "customer" | "partner" | null;
  }> | null;
  service?: string | null;
  serviceTh?: string | null;
  serviceZh?: string | null;
  customer?: string | null;
  title?: string | null;
  budget?: string | number | null;
  totalBudget?: string | number | null;
  fee?: string | number | null;
  chat?: { enabled?: boolean | null } | null;
  chatEnabled?: boolean | null;
  address?: {
    latitude?: string | number | null;
    longitude?: string | number | null;
    subdistrict?: string | null;
    district?: string | null;
    province?: string | null;
  } | null;
  projectLocation?: string | null;
  siteSubdistrict?: string | null;
  cardLocation?: string | null;
  location?: string | null;
  subdistrict?: string | null;
  meeting?: { date?: string | null; time?: string | null; venue?: string | null; note?: string | null } | null;
  meetingDate?: string | null;
  meetingTime?: string | null;
  meetingVenue?: string | null;
  meetingNote?: string | null;
  statusHistory?: Array<{ createdAt?: string | number | null }> | null;
  statusChangedAt?: string | number | null;
  updatedAt?: string | number | null;
  createdAt?: string | number | null;
  [key: string]: unknown;
}

export interface FixerWorkflowLocations {
  projectLocation: string;
  siteSubdistrict: string;
  cardLocation: string;
}

export function projectFixerLocations(order?: FixerWorkflowUiOrder | null): FixerWorkflowLocations;
export function reconcileFixerCardLocations(
  cachedItem?: Record<string, unknown> | null,
  backendOrder?: FixerWorkflowUiOrder | null,
): Record<string, unknown> & FixerWorkflowLocations & {
  location: string;
  subdistrict: string;
};

export interface PartnerMeetingProjection {
  meeting: { date: string; time: string; venue: string; note: string };
  meetingDate: string;
  meetingTime: string;
  meetingVenue: string;
  meetingNote: string;
  meetingDateLabel: string;
  meetingTimeLabel: string;
  venue: string;
}

export function projectPartnerMeetingConfirmation(order?: FixerWorkflowUiOrder | null): PartnerMeetingProjection;

export function reconcilePartnerMeetingRequest(
  cachedRequest?: Record<string, unknown> | null,
  backendOrder?: FixerWorkflowUiOrder | null,
): Record<string, unknown> & PartnerMeetingProjection & {
  po: string;
  status: "MEETING_REQUESTED";
  type: "meeting_confirm_partner";
  workflowType: "meeting_confirm_partner";
  step: 8;
  mockStep: 8;
  actionNeeded: true;
};

export function mergeFixerWorkflowRecord(
  cachedRecord?: Record<string, unknown> | null,
  backendOrder?: FixerWorkflowUiOrder | null,
): Record<string, unknown> & PartnerMeetingProjection & FixerWorkflowLocations & {
  po: string;
  location: string;
  subdistrict: string;
};

export interface FixerChatRoomProjection {
  id: string;
  po: string;
  name: string;
  service: string;
  lastMsg: string;
  time: string | number;
  messageItems: unknown[];
}

export function projectFixerChatRoom(
  order?: FixerWorkflowUiOrder | null,
  messages?: unknown[],
): FixerChatRoomProjection | null;

export function isCustomerFixerActionNeeded(order?: FixerWorkflowUiOrder | null, fallbackStep?: number): boolean;
export function projectAuthoritativeFixerStep(order?: FixerWorkflowUiOrder | null): number;

export interface WorkflowUiAlert {
  id: string;
  po?: string;
  workflowStage?: number;
  authoritative?: boolean;
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
export function buildMeetingConfirmedWorkflowAlert(order?: FixerWorkflowUiOrder | null): WorkflowUiAlert | null;
export function mergeAuthoritativeWorkflowAlerts(alerts?: Array<WorkflowUiAlert | null | undefined>): WorkflowUiAlert[];

export interface PartnerWorkflowRequest extends Record<string, unknown> {
  po: string;
  workflowType: "meeting_confirm_partner" | "variation_decision_partner";
  type: "meeting_confirm_partner" | "variation_decision_partner";
  step: number;
  actionNeeded: true;
  actionKey: string;
  actionLabel: string;
  availableActions: string[];
}

export function projectPartnerWorkflowRequest(
  order?: FixerWorkflowUiOrder | null,
): PartnerWorkflowRequest | null;

export interface WorkflowChatHistoryProjection {
  id: string;
  po: string;
  name: string;
  service: string;
  readOnly: true;
  messageItems: unknown[];
}

export function projectWorkflowChatHistory(
  order?: FixerWorkflowUiOrder | null,
  messages?: unknown[],
): WorkflowChatHistoryProjection | null;

export function projectUpcomingFixerMeetings(
  orders?: FixerWorkflowUiOrder[],
  now?: number,
): Array<FixerWorkflowUiOrder & PartnerMeetingProjection & { po: string; meetingAt: number }>;
