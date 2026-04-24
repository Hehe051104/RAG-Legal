export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

function getApiBaseUrl() {
	const raw = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
	if (!raw) {
		return null;
	}

	return raw.endsWith("/") ? raw.slice(0, -1) : raw;
}

export async function POST(request: Request) {
	const apiBaseUrl = getApiBaseUrl();
	if (!apiBaseUrl) {
		console.error("NEXT_PUBLIC_API_BASE_URL is not configured for /api/auth/send-code");
		return NextResponse.json(
			{ error: "NEXT_PUBLIC_API_BASE_URL is not configured." },
			{ status: 500 }
		);
	}

	const targetUrl = `${apiBaseUrl}/api/auth/send-code`;
	console.log("Proxying send-code to:", targetUrl);

	const requestBody = await request.text();

	try {
		const response = await fetch(targetUrl, {
			method: "POST",
			headers: {
				Accept: "application/json",
				"Content-Type": "application/json",
			},
			body: requestBody,
			redirect: "manual",
		});

		const contentType = response.headers.get("content-type") ?? "";

		if (contentType.includes("application/json")) {
			const json = await response.json();
			return NextResponse.json(json, {
				status: response.status,
				statusText: response.statusText,
			});
		}

		const text = await response.text();
		return new NextResponse(text, {
			status: response.status,
			statusText: response.statusText,
			headers: {
				"content-type": contentType || "text/plain; charset=utf-8",
			},
		});
	} catch (error) {
		console.error("Send code proxy failed:", error);
		return NextResponse.json({ error: String(error) }, { status: 502 });
	}
}
