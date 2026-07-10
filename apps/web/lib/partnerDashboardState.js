export function shouldPreservePartnerDashboardState({
  reason,
  hasStoredPartner,
  hadFixerAccess,
  hadListerAccess,
  hadVisibleOrders,
  hadVisibleProperties,
} = {}) {
  if (reason === "logout" || reason === "confirmed_no_access") return false;
  if (!hasStoredPartner) return false;
  return Boolean(
    hadFixerAccess ||
      hadListerAccess ||
      hadVisibleOrders ||
      hadVisibleProperties,
  );
}

export function preserveVisiblePartnerListOnEmptyRefresh(previous, next) {
  const previousList = Array.isArray(previous) ? previous : [];
  if (!Array.isArray(next)) return previousList;
  if (previousList.length > 0 && next.length === 0) return previousList;
  return next;
}
