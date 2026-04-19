export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

function getApiBaseUrl() {
	const raw = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
	if (!raw) {
		return null;
	}

	// 兼容 Vercel 后台配置末尾是否带有 `/`
	return raw.endsWith("/") ? raw.slice(0, -1) : raw;
}

export async function POST(request: Request) {
	const apiBaseUrl = getApiBaseUrl();
	if (!apiBaseUrl) {
		return NextResponse.json(
			{ error: "NEXT_PUBLIC_API_BASE_URL is not configured." },
			{ status: 500 }
		);
	}

	const targetUrl = `${apiBaseUrl}/api/auth/token/verify`;
	console.log("Proxying to:", targetUrl);

	const body = await request.text();

	try {
		const response = await fetch(targetUrl, {
			method: "POST",
			headers: {
				Accept: "application/json",
				"Content-Type": "application/json",
			},
			body,
			redirect: "manual",
		});

		console.log("Response Status:", response.status);

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
		console.error("Token verify proxy request failed:", error);
		return NextResponse.json(
			{ error: "Upstream /api/auth/token/verify request failed." },
			{ status: 502 }
		);
	}
}
