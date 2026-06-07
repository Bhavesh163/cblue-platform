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
}