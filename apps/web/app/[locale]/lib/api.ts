/**
 * Resolves the API base URL at runtime.
 * - In browser: uses NEXT_PUBLIC_API_URL if set at build time, or detects from window.location
 * - On server: uses NEXT_PUBLIC_API_URL or localhost fallback
 */
function getApiBaseUrl(): string {
  // Production browser requests must use the same-origin Cloudflare proxy.
  // This avoids depending on a separately configured public API hostname.
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (host === "cblue.co.th" || host === "www.cblue.co.th") {
      return "/api/v1";
    }
  }

  const envUrl = process.env.NEXT_PUBLIC_API_URL;
  if (envUrl) {
    const normalizedEnvUrl = envUrl.endsWith("/") ? envUrl.slice(0, -1) : envUrl;
    return normalizedEnvUrl + "/api/v1";
  }

  return "http://localhost:3002/api/v1";
}

export function getApiUrl(endpoint: string): string {
  return `${getApiBaseUrl()}${endpoint}`;
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ success: boolean; data: T; timestamp: string }> {
  const res = await fetch(`${getApiBaseUrl()}${endpoint}`, {
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: "Request failed" }));
    throw new Error(error.message || `HTTP ${res.status}`);
  }

  return res.json();
}
