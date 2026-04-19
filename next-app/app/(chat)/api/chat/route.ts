export const runtime = 'edge';
export const dynamic = "force-dynamic";

const UPSTREAM_CHAT_PATH = "/api/chat";

const REQUEST_HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailers",
  "transfer-encoding",
  "upgrade",
  "host",
  "content-length",
]);

const RESPONSE_HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailers",
  "transfer-encoding",
  "upgrade",
  "content-length",
]);

function getApiBaseUrl() {
  const raw = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  if (!raw) {
    return null;
  }
  return raw.endsWith("/") ? raw.slice(0, -1) : raw;
}

function buildUpstreamUrl(request: Request, apiBaseUrl: string) {
  const incomingUrl = new URL(request.url);
  return `${apiBaseUrl}${UPSTREAM_CHAT_PATH}${incomingUrl.search}`;
}

function buildUpstreamHeaders(request: Request) {
  const headers = new Headers(request.headers);
  for (const headerName of REQUEST_HOP_BY_HOP_HEADERS) {
    headers.delete(headerName);
  }
  return headers;
}

function buildDownstreamHeaders(upstream: Response) {
  const headers = new Headers(upstream.headers);
  for (const headerName of RESPONSE_HOP_BY_HOP_HEADERS) {
    headers.delete(headerName);
  }
  return headers;
}

async function proxyChat(request: Request) {
  const apiBaseUrl = getApiBaseUrl();

  if (!apiBaseUrl) {
    return Response.json(
      { error: "NEXT_PUBLIC_API_BASE_URL is not configured." },
      { status: 500 }
    );
  }

  const method = request.method.toUpperCase();

  try {
    const upstream = await fetch(buildUpstreamUrl(request, apiBaseUrl), {
      method,
      headers: buildUpstreamHeaders(request),
      redirect: "manual",
      body: method === "GET" || method === "HEAD" ? undefined : request.body,
    });

    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: buildDownstreamHeaders(upstream),
    });
  } catch {
    return Response.json(
      { error: "Upstream /api/chat request failed." },
      { status: 502 }
    );
  }
}

export const GET = proxyChat;
export const POST = proxyChat;
export const PUT = proxyChat;
export const PATCH = proxyChat;
export const DELETE = proxyChat;
export const OPTIONS = proxyChat;
export const HEAD = proxyChat;
