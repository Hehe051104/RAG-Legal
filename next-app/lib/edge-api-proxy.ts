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

function normalizePath(path: string) {
  return path.startsWith("/") ? path : `/${path}`;
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

export function createApiProxy(targetPath: string) {
  const normalizedPath = normalizePath(targetPath);

  return async function proxy(request: Request) {
    const apiBaseUrl = getApiBaseUrl();

    if (!apiBaseUrl) {
      return Response.json(
        { error: "NEXT_PUBLIC_API_BASE_URL is not configured." },
        { status: 500 }
      );
    }

    const method = request.method.toUpperCase();
    const incomingUrl = new URL(request.url);
    const upstreamUrl = `${apiBaseUrl}${normalizedPath}${incomingUrl.search}`;

    try {
      const upstream = await fetch(upstreamUrl, {
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
        { error: `Upstream ${normalizedPath} request failed.` },
        { status: 502 }
      );
    }
  };
}