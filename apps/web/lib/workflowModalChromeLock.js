export function toggleWorkflowModalChromeLock(locked, doc = globalThis.document) {
  if (!doc?.body || !doc?.documentElement) return;

  const body = doc.body;
  const html = doc.documentElement;
  const current = Number(body.dataset?.cblueWorkflowModalLocks || "0") || 0;
  const next = locked ? current + 1 : Math.max(0, current - 1);

  if (!body.dataset) body.dataset = {};
  if (next > 0) {
    body.dataset.cblueWorkflowModalLocks = String(next);
  } else {
    delete body.dataset.cblueWorkflowModalLocks;
  }

  const modalActive = next > 0;
  body.classList?.toggle("cblue-workflow-modal-open", modalActive);
  html.classList?.toggle("cblue-workflow-modal-open", modalActive);

  const header = typeof doc.querySelector === "function"
    ? doc.querySelector("[data-cblue-header-root]")
    : null;
  if (!header) return;

  header.classList?.toggle("pointer-events-none", modalActive);
  header.classList?.toggle("select-none", modalActive);
  header.classList?.toggle("blur-sm", modalActive);

  if (modalActive) {
    header.style.zIndex = "1";
    header.setAttribute?.("aria-hidden", "true");
    header.setAttribute?.("data-modal-open", "true");
  } else {
    header.style.zIndex = "";
    header.removeAttribute?.("aria-hidden");
    header.setAttribute?.("data-modal-open", "false");
  }
}
