function requiredText(value, label) {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) throw new Error(`${label} is required`);
  return text;
}

export async function postFixerWorkflowAction({
  poNumber,
  action,
  token,
  payload = {},
  idempotencyKey = "",
  apiBase = "/api/v1",
  fetchImpl = globalThis.fetch,
} = {}) {
  const po = requiredText(poNumber, "PO number");
  const actionKey = requiredText(action, "Workflow action");
  const accessToken = requiredText(token, "An authenticated user token");
  if (typeof fetchImpl !== "function") throw new Error("Fetch is unavailable");

  const headers = {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };
  const requestId = typeof idempotencyKey === "string" ? idempotencyKey.trim() : "";
  if (requestId) headers["Idempotency-Key"] = requestId;

  const response = await fetchImpl(
    `${String(apiBase || "/api/v1").replace(/\/$/, "")}/blue/workflow-details/${encodeURIComponent(po)}/actions/${encodeURIComponent(actionKey)}`,
    {
      method: "POST",
      headers,
      body: JSON.stringify(payload && typeof payload === "object" ? payload : {}),
    },
  );
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.message || `Workflow action failed (${response.status || "unknown"})`);
  }
  return data;
}
