export function shouldPreservePartnerDashboardState(input?: {
  reason?: string;
  hasStoredPartner?: boolean;
  hadFixerAccess?: boolean;
  hadListerAccess?: boolean;
  hadVisibleOrders?: boolean;
  hadVisibleProperties?: boolean;
}): boolean;
