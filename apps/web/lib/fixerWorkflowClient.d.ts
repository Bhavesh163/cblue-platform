export interface PostFixerWorkflowActionInput {
  poNumber: string;
  action: string;
  token: string;
  payload?: Record<string, unknown>;
  idempotencyKey?: string;
  apiBase?: string;
  fetchImpl?: typeof fetch;
}

export function postFixerWorkflowAction<T = Record<string, unknown>>(
  input: PostFixerWorkflowActionInput,
): Promise<T>;
