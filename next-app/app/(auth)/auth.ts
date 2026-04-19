import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export type UserType = "regular";

export type AuthSession = {
  user: {
    id: string;
    email?: string | null;
    type: UserType;
    role?: "user" | "admin";
  };
};

type VerifyTokenEnvelope = {
  status: "success" | "error";
  data?: {
    payload?: Record<string, unknown>;
  };
  msg?: string;
};

type LoginEnvelope = {
  status: "success" | "error";
  data?: {
    token?: {
      access_token?: string;
      expires_in?: number;
    };
  };
  msg?: string;
};

type SignInOptions = {
  email?: string;
  password?: string;
  redirect?: boolean;
  redirectTo?: string;
};

type SignOutOptions = {
  redirectTo?: string;
};

const AUTH_TOKEN_COOKIE = "legal_auth_token";

function getApiBaseUrl() {
  const raw = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  if (!raw) {
    return null;
  }

  return raw.endsWith("/") ? raw.slice(0, -1) : raw;
}

function parseTokenPayload(payload: Record<string, unknown>): {
  id: string;
  email: string | null;
  role?: "user" | "admin";
} | null {
  const candidateId =
    payload.user_id ?? payload.sub ?? payload.id ?? payload.uid ?? payload.userId;
  const id = typeof candidateId === "string" ? candidateId : null;

  if (!id) {
    return null;
  }

  const email = typeof payload.email === "string" ? payload.email : null;
  const role =
    payload.role === "admin" || payload.role === "user"
      ? (payload.role as "user" | "admin")
      : undefined;

  return {
    id,
    email,
    role,
  };
}

async function verifyToken(token: string) {
  const apiBaseUrl = getApiBaseUrl();

  if (!apiBaseUrl) {
    return null;
  }

  try {
    const response = await fetch(`${apiBaseUrl}/api/auth/token/verify`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      cache: "no-store",
      body: JSON.stringify({ token }),
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as VerifyTokenEnvelope;
    if (payload.status !== "success" || !payload.data?.payload) {
      return null;
    }

    return parseTokenPayload(payload.data.payload);
  } catch {
    return null;
  }
}

export async function auth(): Promise<AuthSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_TOKEN_COOKIE)?.value?.trim();

  if (!token) {
    return null;
  }

  const parsed = await verifyToken(token);
  if (!parsed) {
    return null;
  }

  return {
    user: {
      id: parsed.id,
      email: parsed.email,
      role: parsed.role,
      type: "regular",
    },
  };
}

export async function signIn(_provider: string, options: SignInOptions = {}) {
  const apiBaseUrl = getApiBaseUrl();
  if (!apiBaseUrl) {
    throw new Error("NEXT_PUBLIC_API_BASE_URL is not configured.");
  }

  const response = await fetch(`${apiBaseUrl}/api/auth/login`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    cache: "no-store",
    body: JSON.stringify({
      email: String(options.email ?? "").trim(),
      password: String(options.password ?? ""),
    }),
  });

  const payload = (await response.json()) as LoginEnvelope;

  if (!response.ok || payload.status !== "success") {
    throw new Error(payload.msg ?? "Sign in failed");
  }

  const token = payload.data?.token?.access_token;
  if (typeof token !== "string" || token.length === 0) {
    throw new Error("Sign in succeeded but no access token was returned.");
  }

  const cookieStore = await cookies();
  cookieStore.set(AUTH_TOKEN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: Math.max(0, Number(payload.data?.token?.expires_in ?? 0) || 0),
  });

  if (options.redirect !== false && options.redirectTo) {
    redirect(options.redirectTo);
  }

  return payload;
}

export async function signOut(options: SignOutOptions = {}) {
  const cookieStore = await cookies();
  cookieStore.set(AUTH_TOKEN_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  if (options.redirectTo) {
    redirect(options.redirectTo);
  }
}
