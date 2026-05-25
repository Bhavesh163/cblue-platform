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
    if (!res.ok) return null;

    const data = await res.json().catch(() => null);
    const nextToken = typeof data?.accessToken === 'string' ? data.accessToken : null;
    if (!nextToken) return null;

    localStorage.setItem('subscriber_token', nextToken);
    if (data?.subscriber) {
      localStorage.setItem('subscriber', JSON.stringify(data.subscriber));
    }
    window.dispatchEvent(new Event('storage'));
    return nextToken;
  } catch {
    return null;
  }
}