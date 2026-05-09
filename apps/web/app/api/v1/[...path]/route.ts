import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

// NOTE: Do NOT set `export const runtime = "edge"` here.
// OpenNext bundles everything into a single CF Worker — explicit edge runtime
// on route handlers breaks the bundler. The Worker already runs at the edge.

/**
 * Resolve the backend base URL.
 *
 * Production: CF Worker → http://api-backend.cblue.co.th (DNS-only A record
 * pointing to 168.144.39.0; iptables on droplet redirects port 80 → 3002).
 * CF Workers cannot fetch bare IP addresses (error 1003).
 */





function getBackendUrls() {
  const env = process.env.API_BACKEND_URL;
  if (env) {
    return env
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
  }

  if (process.env.NODE_ENV === "development") {
    return ["http://localhost:3002"];
  }

  // Cloudflare Workers block outgoing fetches to non-standard HTTP ports (like 3002).
  // We MUST use standard port 80 (or 443) which points to Nginx reverse proxy.
  return ["http://api-backend.cblue.co.th"];
}






const SKIP_REQ = new Set([
  "host", "keep-alive", "connection",
  "te", "trailer", "upgrade", "accept-encoding", "content-length"
]);
const SKIP_RES = new Set(["content-encoding", "transfer-encoding", "content-length", "connection"]);
const PASSTHROUGH_ERROR_STATUS = new Set([400, 401, 403, 404, 409, 422, 429]);

async function handler(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
): Promise<Response> {
  const backendUrls = getBackendUrls();
  let target = "";
  try {
    const { path } = await context.params;

    // Forward headers (skip hop-by-hop)
    const headers = new Headers();
    request.headers.forEach((v, k) => {
      if (!SKIP_REQ.has(k.toLowerCase())) headers.set(k, v);
    });
    
    // Explicitly add Authorization header from known auth cookies if missing.
    const token =
      request.cookies.get("subscriber_token")?.value ||
      request.cookies.get("token")?.value ||
      request.cookies.get("accessToken")?.value ||
      request.cookies.get("auth_token")?.value;
    if (token && !headers.has('authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    // Build fetch init
    const init: RequestInit & { duplex?: string } = {
      method: request.method,
      headers,
      cache: "no-store", // CRITICAL: Prevent cross-session data bleeding by disabling internal Next.js fetch cache.
      signal: AbortSignal.timeout(30000), // Add 30s timeout
    };

    if (!["GET", "HEAD", "OPTIONS"].includes(request.method.toUpperCase())) {
      init.body = request.body;
      init.duplex = "half"; // required for streaming body on edge
    }

    const method = request.method.toUpperCase();
    const canRetry = ["GET", "HEAD", "OPTIONS"].includes(method);
    let upstream: Response | null = null;
    let lastError: unknown = null;

    for (let i = 0; i < backendUrls.length; i += 1) {
      const url = new URL(`/api/v1/${path.join("/")}`, backendUrls[i]);
      request.nextUrl.searchParams.forEach((v, k) => url.searchParams.set(k, v));
      target = url.toString();

      try {
        const attempt = await fetch(target, init);

        if (!canRetry || attempt.status < 500 || i === backendUrls.length - 1) {
          upstream = attempt;
          break;
        }
      } catch (err) {
        lastError = err;
        if (!canRetry || i === backendUrls.length - 1) {
          throw err;
        }
      }
    }

    if (!upstream) {
      throw lastError instanceof Error ? lastError : new Error("No upstream response");
    }

    // Build response (strip hop-by-hop)
    const resHeaders = new Headers();
    upstream.headers.forEach((v, k) => {
      if (!SKIP_RES.has(k.toLowerCase())) resHeaders.set(k, v);
    });

    const nullBodyStatuses = [101, 204, 205, 304];
    const bodyBuffer = nullBodyStatuses.includes(upstream.status) ? null : await upstream.arrayBuffer();

    return new Response(bodyBuffer, {
      status: upstream.status,
      // Cloudflare throws if statusText is explicitly empty string, omit it
      headers: resHeaders,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[api-proxy]", request.method, target, msg);
    return Response.json(
      { error: "proxy_error", message: msg, backends: backendUrls },
      { status: 500 }, // Change 502 to 500 to prevent CF override
    );
  }
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
export const OPTIONS = handler;
