/**
 * Resolves the API base URL at runtime.
 * - In browser: uses NEXT_PUBLIC_API_URL if set at build time, or detects from window.location
 * - On server: uses NEXT_PUBLIC_API_URL or localhost fallback
 */
function getApiBaseUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_API_URL;
  if (envUrl) return envUrl + "/api/v1";

  // Runtime detection for production — if running on cblue.co.th, use api.cblue.co.th
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (host === "cblue.co.th" || host === "www.cblue.co.th") {
      return "/api/v1";
    }
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
