export const PO_PROJECT_DETAILS_PREFIX = "cblue_po_project_details_";

export function storePoProjectDetails(po: string, details: string) {
  if (!po || typeof window === "undefined") return;
  const text = String(details || "").trim();
  if (!text) return;
  try {
    localStorage.setItem(`${PO_PROJECT_DETAILS_PREFIX}${String(po).trim()}`, text);
  } catch {
    // Non-blocking booking detail persistence.
  }
}

export function readStoredPoProjectDetails(po?: string | null): string {
  if (!po || typeof window === "undefined") return "";
  try {
    return String(localStorage.getItem(`${PO_PROJECT_DETAILS_PREFIX}${String(po).trim()}`) || "").trim();
  } catch {
    return "";
  }
}
