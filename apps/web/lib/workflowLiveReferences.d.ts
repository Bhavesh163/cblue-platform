export function isWorkflowPoReferencedInStorage(storage: Storage | null | undefined, po: string): boolean;
export function extractWorkflowCompleteRequest(value: unknown): string;
export function extractWorkflowVariationRequest(value: unknown): string;
export function getWorkflowStatusNote(value: unknown): string;
export function isVisibleWorkflowSystemText(value: unknown): boolean;
export function markWorkflowVariationApproved(
  storage: Pick<Storage, "setItem"> | null | undefined,
  po: string,
): boolean;
export function isWorkflowPastVariation(args: {
  activeItem?: unknown;
  backendOrder?: unknown;
  po: string;
  storage?: Pick<Storage, "getItem"> | null;
}): boolean;
export function persistPartnerVariationStatusNote(args: {
  chatText: unknown;
  fetchFn?: typeof fetch;
  po: string;
  resolveOrderIdByPo: (args: { po: string; fallbackOrderId?: string; token?: string }) => Promise<string | null | undefined>;
  storage?: Pick<Storage, "getItem"> | null;
  token?: string;
}): Promise<boolean>;
export function persistPartnerCompletionStatusNote(args: {
  chatText: unknown;
  fetchFn?: typeof fetch;
  po: string;
  resolveOrderIdByPo: (args: { po: string; fallbackOrderId?: string; token?: string }) => Promise<string | null | undefined>;
  storage?: Pick<Storage, "getItem"> | null;
  token?: string;
}): Promise<boolean>;
export function persistCustomerRatingStatusNote(args: {
  fetchFn?: typeof fetch;
  po: string;
  rating: number;
  resolveOrderIdByPo: (args: { po: string; fallbackOrderId?: string; token?: string }) => Promise<string | null | undefined>;
  storage?: Pick<Storage, "getItem"> | null;
  token?: string;
}): Promise<boolean>;
