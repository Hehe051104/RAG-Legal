export const runtime = 'edge';
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

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

const AUTH_TOKEN_COOKIE = "legal_auth_token";

type LoginEnvelope = {
	status?: "success" | "error";
	data?: {
		token?: {
			access_token?: string;
			expires_in?: number;
		};
	};
};

function getApiBaseUrl() {
	const raw = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
	if (!raw) {
		return null;
	}

	return raw.endsWith("/") ? raw.slice(0, -1) : raw;
}

function buildUpstreamHeaders(request: Request) {
	const headers = new Headers(request.headers);
	for (const headerName of REQUEST_HOP_BY_HOP_HEADERS) {
		headers.delete(headerName);
	}

	return headers;
}

export async function POST(request: Request) {
	const apiBaseUrl = getApiBaseUrl();
	if (!apiBaseUrl) {
		return NextResponse.json(
			{ error: "NEXT_PUBLIC_API_BASE_URL is not configured." },
			{ status: 500 }
		);
	}

	const requestBody = await request.text();

	let upstream: Response;
	try {
		upstream = await fetch(`${apiBaseUrl}/api/auth/login`, {
			method: "POST",
			headers: buildUpstreamHeaders(request),
			body: requestBody,
			redirect: "manual",
		});
	} catch {
		return NextResponse.json({ error: "Upstream /api/auth/login request failed." }, { status: 502 });
	}

	const contentType = upstream.headers.get("content-type") ?? "";

	if (!contentType.includes("application/json")) {
		const passthroughBody = await upstream.text();
		return new NextResponse(passthroughBody, {
			status: upstream.status,
			statusText: upstream.statusText,
			headers: {
				"content-type": contentType || "text/plain; charset=utf-8",
			},
		});
	}

	let payload: LoginEnvelope | Record<string, unknown>;
	try {
		payload = (await upstream.json()) as LoginEnvelope;
	} catch {
		return NextResponse.json({ error: "Invalid JSON response from upstream login." }, { status: 502 });
	}

	const response = NextResponse.json(payload, {
		status: upstream.status,
		statusText: upstream.statusText,
	});

	if (upstream.ok && (payload as LoginEnvelope).status === "success") {
		const token = (payload as LoginEnvelope).data?.token?.access_token;
		const expiresIn = Number((payload as LoginEnvelope).data?.token?.expires_in ?? 0);

		if (typeof token === "string" && token.length > 0) {
			response.cookies.set(AUTH_TOKEN_COOKIE, token, {
				httpOnly: true,
				secure: process.env.NODE_ENV === "production",
				sameSite: "lax",
				path: "/",
				maxAge: Number.isFinite(expiresIn) ? Math.max(0, expiresIn) : 0,
			});
		}
	}

	return response;
}
