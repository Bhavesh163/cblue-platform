export function shouldPreservePartnerDashboardState(input?: {
  reason?: string;
  hasStoredPartner?: boolean;
  hadFixerAccess?: boolean;
  hadListerAccess?: boolean;
  hadVisibleOrders?: boolean;
  hadVisibleProperties?: boolean;
}): boolean;

export function preserveVisiblePartnerListOnEmptyRefresh<T>(previous: T[] | undefined | null, next: T[] | undefined | null): T[];
