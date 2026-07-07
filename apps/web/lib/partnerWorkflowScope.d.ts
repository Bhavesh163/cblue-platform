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
export function isPartnerPreAcceptanceWorkflowItem(item: any): boolean;

export function isPartnerAdvancedWorkflowItem(item: any): boolean;

export function filterBlockedPartnerAdvancedItems(items: any[], preAcceptanceItems: any[]): any[];
