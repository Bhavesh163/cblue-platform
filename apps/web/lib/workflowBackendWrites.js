export const WORKFLOW_BACKEND_WRITE_QUEUE_KEY = "cblue_pending_workflow_backend_writes";

export function isWorkflowBackendFallbackPayload(payload) {
  return Boolean(payload && typeof payload === "object" && payload.statusFallback === true);
}

function sleep(ms) {
  if (!ms) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function readJsonResponse(response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { rawText: text };
  }
}

function normalizeWrite(write) {
  if (!write || typeof write !== "object") return null;
  const url = String(write.url || "").trim();
  if (!url) return null;
  const options = write.options && typeof write.options === "object" ? write.options : {};
  return {
    id: String(write.id || `${options.method || "GET"}:${url}`).trim(),
    url,
    options,
  };
}

function readQueuedWrites(storage, queueKey) {
  if (!storage || typeof storage.getItem !== "function") return [];
  try {
    const parsed = JSON.parse(storage.getItem(queueKey) || "[]");
    return Array.isArray(parsed) ? parsed.map(normalizeWrite).filter(Boolean) : [];
  } catch {
    return [];
  }
}

function writeQueuedWrites(storage, queueKey, writes) {
  if (!storage || typeof storage.setItem !== "function" || typeof storage.removeItem !== "function") return;
  const normalized = writes.map(normalizeWrite).filter(Boolean);
  if (normalized.length === 0) {
    try {
      storage.removeItem(queueKey);
    } catch {}
    return;
  }
  try {
    storage.setItem(queueKey, JSON.stringify(normalized));
  } catch {}
}

function enqueueFailedWrites(storage, queueKey, failedWrites) {
  if (!storage || failedWrites.length === 0) return;
  const byId = new Map();
  for (const write of readQueuedWrites(storage, queueKey)) byId.set(write.id, write);
  for (const write of failedWrites.map(normalizeWrite).filter(Boolean)) byId.set(write.id, write);
  writeQueuedWrites(storage, queueKey, [...byId.values()]);
}

async function sendWorkflowBackendWrite(fetchImpl, write, retryAttempts, retryDelayMs) {
  let lastError = null;
  for (let attempt = 0; attempt <= retryAttempts; attempt += 1) {
    try {
      const response = await fetchImpl(write.url, write.options);
      const payload = await readJsonResponse(response);
      if (response.ok && !isWorkflowBackendFallbackPayload(payload)) {
        return { ok: true, payload, attempts: attempt + 1 };
      }
      lastError = new Error(
        isWorkflowBackendFallbackPayload(payload)
          ? "Workflow backend write returned proxy fallback"
          : `Workflow backend write failed with HTTP ${response.status}`,
      );
    } catch (error) {
      lastError = error;
    }
    if (attempt < retryAttempts) await sleep(retryDelayMs);
  }
  return { ok: false, error: lastError, attempts: retryAttempts + 1 };
}

export async function persistWorkflowBackendWrites(
  fetchImpl,
  writes,
  {
    retryAttempts = 2,
    retryDelayMs = 400,
    storage,
    queueKey = WORKFLOW_BACKEND_WRITE_QUEUE_KEY,
  } = {},
) {
  const normalizedWrites = (Array.isArray(writes) ? writes : []).map(normalizeWrite).filter(Boolean);
  const failedWrites = [];
  for (const write of normalizedWrites) {
    const result = await sendWorkflowBackendWrite(fetchImpl, write, retryAttempts, retryDelayMs);
    if (!result.ok) failedWrites.push(write);
  }
  enqueueFailedWrites(storage, queueKey, failedWrites);
  return { ok: failedWrites.length === 0, failedWrites, attemptedWrites: normalizedWrites.length };
}

export async function flushQueuedWorkflowBackendWrites(
  fetchImpl,
  storage,
  {
    retryAttempts = 1,
    retryDelayMs = 400,
    queueKey = WORKFLOW_BACKEND_WRITE_QUEUE_KEY,
  } = {},
) {
  const queuedWrites = readQueuedWrites(storage, queueKey);
  if (queuedWrites.length === 0) return { ok: true, failedWrites: [], attemptedWrites: 0 };

  const failedWrites = [];
  for (const write of queuedWrites) {
    const result = await sendWorkflowBackendWrite(fetchImpl, write, retryAttempts, retryDelayMs);
    if (!result.ok) failedWrites.push(write);
  }
  writeQueuedWrites(storage, queueKey, failedWrites);
  return { ok: failedWrites.length === 0, failedWrites, attemptedWrites: queuedWrites.length };
}
