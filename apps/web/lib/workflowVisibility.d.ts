type WorkflowVisibilityInput = {
  backendOrders?: any[];
  historyItems?: any[];
  alerts?: any[];
  chatMessagesByPo?: Record<string, any[]>;
  terminalPoValues?: any[];
  closedPoValues?: any[];
};

type StorageLike = {
  length: number;
  key(index: number): string | null;
  getItem(key: string): string | null;
  setItem?(key: string, value: string): void;
};

export function isWorkflowMeetingCardVisible(input?: {
  meetingDate?: string;
  meetingTime?: string;
  createdAt?: any;
  date?: any;
  now?: any;
  pastWindowMs?: number;
}): boolean;
export function parseWorkflowMeetingInviteDetails(value: any): {
  po: string;
  meetingDate: string;
  meetingDateLabel: string;
  meetingTime: string;
  meetingTimeLabel: string;
  meetingVenue: string;
  meetingNote: string;
};
export function buildMeetingConfirmedAlert(input?: {
  id?: string;
  po?: any;
  audience?: "partner" | "customer";
  createdAt?: any;
  time?: string;
  customerEmail?: string;
  customerName?: string;
}): any;
export function normalizeWorkflowPo(value: any): string;
export function pickWorkflowMeetingVenue(...values: any[]): string;
export function hasWorkflowCompletionMarker(value: any): boolean;
export function isTerminalWorkflowStatus(status: any): boolean;
export function isCompletedAwaitingWorkflowRating(value: any): boolean;
export function filterLiveWorkflowItems(items?: any[], terminalPoValues?: Set<string> | any[]): any[];
export function filterWorkflowItemsByKnownBackendPos(
  items?: any[],
  options?: {
    allowLocalCustomerWorkflow?: boolean;
    backendPoValues?: any;
    fallbackBackendPoValues?: any;
  },
): any[];
export function normalizeWorkflowHistoryItems(items?: any[]): any[];
export function collectTerminalWorkflowPos(input?: WorkflowVisibilityInput): Set<string>;
export function readBrowserTerminalWorkflowPos(storage?: StorageLike): Set<string>;
export function pruneWorkflowStorage(
  storage?: StorageLike & { removeItem(key: string): void },
  softLimitBytes?: number,
): string[];
export function setWorkflowStorageItem(
  storage: StorageLike & { setItem(key: string, value: string): void; removeItem?(key: string): void },
  key: string,
  value: any,
  options?: { softLimitBytes?: number },
): { ok: boolean; compacted: boolean; value: any };
