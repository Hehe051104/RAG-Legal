export const runtime = 'edge';
export const dynamic = "force-dynamic";

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

function normalizeIncomingPath(pathname: string) {
	const basePath = process.env.NEXT_PUBLIC_BASE_PATH?.trim();

	if (basePath && pathname.startsWith(`${basePath}/`)) {
		return pathname.slice(basePath.length);
	}

	if (basePath && pathname === basePath) {
		return "/";
	}

	return pathname;
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

async function proxyAuth(request: Request) {
	const apiBaseUrl = getApiBaseUrl();

	if (!apiBaseUrl) {
		return Response.json(
			{ error: "NEXT_PUBLIC_API_BASE_URL is not configured." },
			{ status: 500 }
		);
	}

	const incomingUrl = new URL(request.url);
	const normalizedPath = normalizeIncomingPath(incomingUrl.pathname);
	const upstreamUrl = `${apiBaseUrl}${normalizedPath}${incomingUrl.search}`;

	try {
		const method = request.method.toUpperCase();
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
		return Response.json({ error: "Upstream auth request failed." }, { status: 502 });
	}
}

export const GET = proxyAuth;
export const POST = proxyAuth;
export const PUT = proxyAuth;
export const PATCH = proxyAuth;
export const DELETE = proxyAuth;
export const OPTIONS = proxyAuth;
export const HEAD = proxyAuth;
