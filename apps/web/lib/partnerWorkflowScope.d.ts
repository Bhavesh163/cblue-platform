export interface PartnerWorkflowScope {
  ids: string[];
  emails: string[];
  names: string[];
  phones: string[];
  orderPos: string[];
}

export function buildPartnerWorkflowScope(input?: {
  partner?: any;
  subscriber?: any;
  backendOrders?: any[];
}): PartnerWorkflowScope;

export function isPartnerWorkflowItemForScope(item: any, scope: PartnerWorkflowScope): boolean;

export function filterPartnerWorkflowItems(items: any[], scope: PartnerWorkflowScope): any[];
