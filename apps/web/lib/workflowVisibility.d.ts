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
};

export function normalizeWorkflowPo(value: any): string;
export function hasWorkflowCompletionMarker(value: any): boolean;
export function isTerminalWorkflowStatus(status: any): boolean;
export function isCompletedAwaitingWorkflowRating(value: any): boolean;
export function collectTerminalWorkflowPos(input?: WorkflowVisibilityInput): Set<string>;
export function readBrowserTerminalWorkflowPos(storage?: StorageLike): Set<string>;
export function pruneWorkflowStorage(
  storage?: StorageLike & { removeItem(key: string): void },
  softLimitBytes?: number,
): string[];
