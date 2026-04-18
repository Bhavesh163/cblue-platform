import { NextRequest, NextResponse } from "next/server";

const getBackendUrl = (): string => {
  // Priority: explicit backend URL → CI secret → wrangler vars → hardcoded fallback
  return (
    process.env.API_BACKEND_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    (process.env.NODE_ENV === "production"
      ? "https://api.cblue.co.th"
      : "http://localhost:3002")
  );
};

// Headers that must not be forwarded between hops
const HOP_BY_HOP = new Set([
  "host",
  "connection",
  "keep-alive",
  "transfer-encoding",
  "te",
  "trailer",
  "upgrade",
]);

const STRIP_RESPONSE = new Set(["content-encoding", "transfer-encoding"]);

async function proxy(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const backend = getBackendUrl();
  const target = new URL(`/api/v1/${path.join("/")}`, backend);

  // Forward query parameters
  request.nextUrl.searchParams.forEach((value, key) => {
    target.searchParams.set(key, value);
  });

  // Build forwarded headers
  const headers = new Headers();
  request.headers.forEach((value, key) => {
    if (!HOP_BY_HOP.has(key.toLowerCase())) {
      headers.set(key, value);
    }
  });

  // GET / HEAD must not have a body
  const body = ["GET", "HEAD"].includes(request.method)
    ? undefined
    : await request.arrayBuffer();

  try {
    const upstream = await fetch(target.toString(), {
      method: request.method,
      headers,
      body,
    });

    const responseHeaders = new Headers();
    upstream.headers.forEach((value, key) => {
      if (!STRIP_RESPONSE.has(key.toLowerCase())) {
        responseHeaders.set(key, value);
      }
    });

    return new NextResponse(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: responseHeaders,
    });
  } catch (err) {
    console.error("[api-proxy] upstream fetch failed:", err);
    return NextResponse.json(
      { error: "Backend unreachable", detail: String(err) },
      { status: 502 }
    );
  }
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
export const OPTIONS = proxy;

// Allow large file uploads (portfolio images, KYC docs)
export const config = {
  api: { bodyParser: false },
};
