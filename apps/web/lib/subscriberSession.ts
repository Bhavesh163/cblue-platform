// Per-page scoped session caches (sessionStorage). getXDashboardToken() reads
// these before the shared localStorage token, so they MUST be kept in sync with
// the shared token — otherwise a stale scoped token keeps 401ing after refresh.
const SCOPED_TOKEN_KEYS = [
  'cblue_customer_dashboard_token',
  'cblue_partner_dashboard_token',
];
const SCOPED_SUBSCRIBER_KEYS = [
  'cblue_customer_dashboard_subscriber',
  'cblue_partner_dashboard_subscriber',
];

let refreshInFlight: Promise<string | null> | null = null;

function getTokenExpirySeconds(token: string): number | null {
  try {
    const encodedPayload = token.split('.')[1];
    if (!encodedPayload) return null;
    const normalized = encodedPayload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=');
    const payload = JSON.parse(atob(padded)) as { exp?: unknown };
    return typeof payload.exp === 'number' ? payload.exp : null;
  } catch {
    return null;
  }
}

export function shouldRefreshSubscriberSession(token: string, leewaySeconds = 60): boolean {
  const expiresAt = getTokenExpirySeconds(token);
  return expiresAt !== null && expiresAt <= Math.floor(Date.now() / 1000) + leewaySeconds;
}
function clearScopedSessionTokens() {
  if (typeof window === 'undefined') return;
  try {
    for (const key of SCOPED_TOKEN_KEYS) sessionStorage.removeItem(key);
  } catch {
    // sessionStorage may be unavailable; shared token still drives auth.
  }
}

export function clearSubscriberSession() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('subscriber_token');
  localStorage.removeItem('subscriber');
  try {
    for (const key of SCOPED_TOKEN_KEYS) sessionStorage.removeItem(key);
    for (const key of SCOPED_SUBSCRIBER_KEYS) sessionStorage.removeItem(key);
  } catch {
    // Best-effort scoped cleanup; localStorage removal already logs the user out.
  }
  window.dispatchEvent(new Event('storage'));
}

export async function refreshSubscriberSession(
  currentToken?: string | null,
): Promise<string | null> {
  if (typeof window === 'undefined') return currentToken ?? null;

  const token = currentToken ?? localStorage.getItem('subscriber_token');
  if (!token) return null;

  if (refreshInFlight) return refreshInFlight;

  const refresh = async (): Promise<string | null> => {
    try {
      const res = await fetch('/api/v1/subscription/refresh-session', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 401 || res.status === 403) {
      clearSubscriberSession();
      return null;
    }
    if (!res.ok) return null;

    const data = await res.json().catch(() => null);
    const nextToken = typeof data?.accessToken === 'string' ? data.accessToken : null;
    if (!nextToken) return null;

    localStorage.setItem('subscriber_token', nextToken);
    if (data?.subscriber) {
      localStorage.setItem('subscriber', JSON.stringify(data.subscriber));
    }
    // Invalidate stale scoped caches so the next getXDashboardToken() read picks
    // up the freshly-minted token instead of looping on the expired one.
    clearScopedSessionTokens();
    window.dispatchEvent(new Event('storage'));
    return nextToken;
    } catch {
      return null;
    }
  };

  refreshInFlight = refresh();
  try {
    return await refreshInFlight;
  } finally {
    refreshInFlight = null;
  }
}

export async function ensureFreshSubscriberSession(
  currentToken?: string | null,
): Promise<string | null> {
  if (typeof window === 'undefined') return currentToken ?? null;
  const token = currentToken ?? localStorage.getItem('subscriber_token');
  if (!token) return null;
  return shouldRefreshSubscriberSession(token) ? refreshSubscriberSession(token) : token;
}