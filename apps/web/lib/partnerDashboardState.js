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
