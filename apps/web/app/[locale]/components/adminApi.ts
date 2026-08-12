import { getApiUrl } from "../lib/api";

const ADMIN_TOKEN_KEY = "cblue_admin_token";
const ADMIN_REFRESH_TOKEN_KEY = "cblue_admin_refresh_token";
export const ADMIN_SESSION_EXPIRED_EVENT = "cblue:admin-session-expired";

export class AdminApiError extends Error {
  readonly status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "AdminApiError";
    this.status = status;
  }
}

type TokenResponse = {
  accessToken?: string;
  refreshToken?: string;
};

export async function readAdminResponseError(
  response: Response,
  fallback: string,
) {
  const payload = await response.json().catch(() => null);
  const message = payload?.message;
  if (Array.isArray(message)) return message.join(", ");
  return typeof message === "string" && message.trim() ? message : fallback;
}

async function rotateAdminToken() {
  const refreshToken = window.sessionStorage.getItem(ADMIN_REFRESH_TOKEN_KEY);
  if (!refreshToken) return null;
  const response = await fetch(getApiUrl("/auth/refresh"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });
  if (!response.ok) return null;
  const tokens = (await response.json()) as TokenResponse;
  if (!tokens.accessToken || !tokens.refreshToken) return null;
  window.localStorage.setItem(ADMIN_TOKEN_KEY, tokens.accessToken);
  window.sessionStorage.setItem(ADMIN_REFRESH_TOKEN_KEY, tokens.refreshToken);
  return tokens.accessToken;
}

function expireAdminSession() {
  clearAdminTokens();
  window.dispatchEvent(new Event(ADMIN_SESSION_EXPIRED_EVENT));
}

export async function adminFetchResponse(
  input: RequestInfo | URL,
  init: RequestInit = {},
) {
  const request = (accessToken: string) =>
    fetch(input, {
      ...init,
      headers: {
        ...(init.headers || {}),
        Authorization: "Bearer " + accessToken,
      },
    });
  const token = window.localStorage.getItem(ADMIN_TOKEN_KEY) || "";
  if (!token) {
    expireAdminSession();
    return new Response(null, { status: 401 });
  }
  let response = await request(token);
  if (response.status === 401) {
    const rotatedToken = await rotateAdminToken();
    if (rotatedToken) response = await request(rotatedToken);
  }
  if (response.status === 401 || response.status === 403) {
    expireAdminSession();
  }
  return response;
}

export async function adminRequest<T>(
  endpoint: string,
  init: RequestInit = {},
): Promise<T> {
  const request = (accessToken: string) =>
    fetch(getApiUrl(endpoint), {
      ...init,
      cache: "no-store",
      headers: {
        ...(init.headers || {}),
        Authorization: "Bearer " + accessToken,
      },
    });

  const token = window.localStorage.getItem(ADMIN_TOKEN_KEY) || "";
  if (!token) {
    expireAdminSession();
    throw new AdminApiError("Admin session expired", 401);
  }
  let response = await request(token);
  if (response.status === 401) {
    const rotatedToken = await rotateAdminToken();
    if (rotatedToken) response = await request(rotatedToken);
  }
  if (response.status === 401 || response.status === 403) {
    expireAdminSession();
  }
  if (!response.ok) {
    throw new AdminApiError(
      await readAdminResponseError(response, "Admin request failed"),
      response.status,
    );
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export function persistAdminTokens(tokens: TokenResponse) {
  if (tokens.accessToken) {
    window.localStorage.setItem(ADMIN_TOKEN_KEY, tokens.accessToken);
  }
  if (tokens.refreshToken) {
    window.sessionStorage.setItem(ADMIN_REFRESH_TOKEN_KEY, tokens.refreshToken);
  }
}

export function clearAdminTokens() {
  window.localStorage.removeItem(ADMIN_TOKEN_KEY);
  window.localStorage.removeItem("cblue_admin_user");
  window.sessionStorage.removeItem(ADMIN_REFRESH_TOKEN_KEY);
}
