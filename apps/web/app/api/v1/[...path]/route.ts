import { NextRequest } from "next/server";

// NOTE: Do NOT set `export const runtime = "edge"` here.
// OpenNext bundles everything into a single CF Worker — explicit edge runtime
// on route handlers breaks the bundler. The Worker already runs at the edge.

/**
 * Resolve the backend base URL.
 *
 * Production: CF Worker → http://168.144.39.0 (DigitalOcean droplet nginx)
 * nginx routes via Host header to NestJS on 127.0.0.1:3002
 *
 * NEXT_PUBLIC_API_URL is intentionally NOT used here because it's set to
 * https://api.cblue.co.th which has no DNS record (yet). Once the DNS A
 * record is created, API_BACKEND_URL in wrangler.jsonc can be updated to
 * https://api.cblue.co.th and this will work through Cloudflare.
 */
const BACKEND_URL: string = (() => {
  // 1. Wrangler vars (set in wrangler.jsonc → available on CF Workers)
  if (process.env.API_BACKEND_URL) return process.env.API_BACKEND_URL;
  // 2. Production fallback: droplet IP directly
  if (process.env.NODE_ENV === "production") return "http://168.144.39.0";
  // 3. Local dev
  return "http://localhost:3002";
})();

// Host header to send to nginx so it routes to the correct server block
const BACKEND_HOST = "api.cblue.co.th";

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
    headers.set("host", BACKEND_HOST);

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
