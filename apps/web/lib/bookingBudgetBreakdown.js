function hasBreakdownLines(value) {
  return Array.isArray(value) && value.length > 0;
}

export function chooseAuthoritativeBudgetBreakdown({
  selectedBreakdown,
  storedBreakdown,
  description,
  priceList,
  computeBudgetBreakdown,
} = {}) {
  if (hasBreakdownLines(selectedBreakdown)) return selectedBreakdown;
  if (hasBreakdownLines(storedBreakdown)) return storedBreakdown;
  if (typeof computeBudgetBreakdown !== "function") return null;

  const computed = computeBudgetBreakdown(description || "", Array.isArray(priceList) ? priceList : []);
  return hasBreakdownLines(computed) ? computed : null;
}
