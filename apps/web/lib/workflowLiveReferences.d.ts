export function isWorkflowPoReferencedInStorage(storage: Storage | null | undefined, po: string): boolean;
export function extractWorkflowCompleteRequest(value: unknown): string;
export function getWorkflowStatusNote(value: unknown): string;
export function isVisibleWorkflowSystemText(value: unknown): boolean;
export function persistPartnerCompletionStatusNote(args: {
  chatText: unknown;
  fetchFn?: typeof fetch;
  po: string;
  resolveOrderIdByPo: (args: { po: string; fallbackOrderId?: string; token?: string }) => Promise<string | null | undefined>;
  storage?: Pick<Storage, "getItem"> | null;
  token?: string;
}): Promise<boolean>;
