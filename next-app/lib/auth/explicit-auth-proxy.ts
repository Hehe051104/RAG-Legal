import { NextResponse } from "next/server";

const AUTH_TOKEN_COOKIE = "legal_auth_token";

type AuthTokenEnvelope = {
  status?: "success" | "error";
  data?: {
    token?: {
      access_token?: string;
      expires_in?: number;
    };
  };
};

type ExplicitAuthProxyOptions = {
  path: string;
  proxyName: string;
  errorLabel: string;
  setAuthCookie?: boolean;
  logResponseStatus?: boolean;
};

function normalizePath(path: string) {
  return path.startsWith("/") ? path : `/${path}`;
}

function getApiBaseUrl() {
  const raw = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  if (!raw) {
    return null;
  }

  return raw.endsWith("/") ? raw.slice(0, -1) : raw;
}

function maybeSetAuthCookie(response: NextResponse, payload: AuthTokenEnvelope) {
  if (payload.status !== "success") {
    return;
  }

  const token = payload.data?.token?.access_token;
  const expiresIn = Number(payload.data?.token?.expires_in ?? 0);

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

export function createExplicitAuthProxy(options: ExplicitAuthProxyOptions) {
  const {
    path,
    proxyName,
    errorLabel,
    setAuthCookie = false,
    logResponseStatus = false,
  } = options;

  const normalizedPath = normalizePath(path);

  return async function POST(request: Request) {
    const apiBaseUrl = getApiBaseUrl();
    if (!apiBaseUrl) {
      console.error(`NEXT_PUBLIC_API_BASE_URL is not configured for ${normalizedPath}`);
      return NextResponse.json(
        { error: "NEXT_PUBLIC_API_BASE_URL is not configured." },
        { status: 500 }
      );
    }

    const targetUrl = `${apiBaseUrl}${normalizedPath}`;
    console.log(`Proxying ${proxyName} to:`, targetUrl);

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

      if (logResponseStatus) {
        console.log("Response Status:", response.status);
      }

      const contentType = response.headers.get("content-type") ?? "";

      if (contentType.includes("application/json")) {
        const payload = (await response.json()) as AuthTokenEnvelope | Record<string, unknown>;
        const nextResponse = NextResponse.json(payload, {
          status: response.status,
          statusText: response.statusText,
        });

        if (setAuthCookie && response.ok) {
          maybeSetAuthCookie(nextResponse, payload as AuthTokenEnvelope);
        }

        return nextResponse;
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
      console.error(`${errorLabel} proxy failed:`, error);
      return NextResponse.json({ error: String(error) }, { status: 502 });
    }
  };
}
