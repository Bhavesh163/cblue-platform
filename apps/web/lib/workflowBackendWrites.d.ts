export const WORKFLOW_BACKEND_WRITE_QUEUE_KEY: string;

export interface WorkflowBackendWrite {
  id?: string;
  url: string;
  options?: RequestInit;
}

export interface WorkflowBackendWriteResult {
  ok: boolean;
  failedWrites: WorkflowBackendWrite[];
  attemptedWrites: number;
}

export interface PersistWorkflowBackendWritesOptions {
  retryAttempts?: number;
  retryDelayMs?: number;
  storage?: Storage;
  queueKey?: string;
}

export interface FlushQueuedWorkflowBackendWritesOptions {
  retryAttempts?: number;
  retryDelayMs?: number;
  queueKey?: string;
}

export function isWorkflowBackendFallbackPayload(payload: unknown): boolean;

export function persistWorkflowBackendWrites(
  fetchImpl: typeof fetch,
  writes: WorkflowBackendWrite[],
  options?: PersistWorkflowBackendWritesOptions,
): Promise<WorkflowBackendWriteResult>;

export function flushQueuedWorkflowBackendWrites(
  fetchImpl: typeof fetch,
  storage: Storage,
  options?: FlushQueuedWorkflowBackendWritesOptions,
): Promise<WorkflowBackendWriteResult>;
