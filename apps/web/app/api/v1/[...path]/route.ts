import { NextRequest } from "next/server";

// NOTE: Do NOT set `export const runtime = "edge"` here.
// OpenNext bundles everything into a single CF Worker — explicit edge runtime
// on route handlers breaks the bundler. The Worker already runs at the edge.

/**
 * Resolve the backend base URL.
 *
 * Production: CF Worker → http://168.144.39.0.nip.io (iptables on droplet
 * redirects port 80 → 3002 → NestJS). We use nip.io wildcard DNS because
 * Cloudflare Workers cannot fetch bare IP addresses (error 1003).
 * nip.io resolves 168.144.39.0.nip.io → 168.144.39.0.
 */
const BACKEND_URL: string = (() => {
  // 1. Wrangler vars (set in wrangler.jsonc → available on CF Workers)
  if (process.env.API_BACKEND_URL) return process.env.API_BACKEND_URL;
  // 2. Production fallback: droplet via nip.io wildcard DNS
  if (process.env.NODE_ENV === "production") return "http://168.144.39.0.nip.io";
  // 3. Local dev
  return "http://localhost:3002";
})();

const SKIP_REQ = new Set([
  "host", "connection", "keep-alive", "transfer-encoding",
  "te", "trailer", "upgrade",
]);
const SKIP_RES = new Set(["content-encoding", "transfer-encoding"]);

async function handler(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
): Promise<Response> {
  let target = "";
  try {
    const { path } = await context.params;
    const url = new URL(`/api/v1/${path.join("/")}`, BACKEND_URL);

    // Forward query string
    request.nextUrl.searchParams.forEach((v, k) => url.searchParams.set(k, v));
    target = url.toString();

    // Forward headers (skip hop-by-hop)
    const headers = new Headers();
    request.headers.forEach((v, k) => {
      if (!SKIP_REQ.has(k.toLowerCase())) headers.set(k, v);
    });

    // Build fetch init
    const init: RequestInit & { duplex?: string } = {
      method: request.method,
      headers,
    };

    if (!["GET", "HEAD"].includes(request.method)) {
      init.body = request.body;
      init.duplex = "half"; // required for streaming body on edge
    }

    const upstream = await fetch(target, init);

    // If backend returned a non-JSON error (e.g., nginx HTML 403/404),
    // convert to a proper JSON 502 so the frontend shows "service unavailable"
    const ct = upstream.headers.get("content-type") || "";
    if (!upstream.ok && !ct.includes("application/json")) {
      await upstream.text().catch(() => {});
      return Response.json(
        {
          error: "backend_unavailable",
          message: "Backend service is temporarily unavailable",
          statusCode: 502,
        },
        { status: 502 },
      );
    }

    // Build response (strip hop-by-hop)
    const resHeaders = new Headers();
    upstream.headers.forEach((v, k) => {
      if (!SKIP_RES.has(k.toLowerCase())) resHeaders.set(k, v);
    });

    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: resHeaders,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[api-proxy]", request.method, target, msg);
    return Response.json(
      { error: "proxy_error", message: msg, backend: BACKEND_URL },
      { status: 502 },
    );
  }
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
export const OPTIONS = handler;
