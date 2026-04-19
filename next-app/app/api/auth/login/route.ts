import { createAuthProxy } from "@/lib/auth/edge-auth-proxy";

export const dynamic = "force-dynamic";

export const POST = createAuthProxy(
  "/api/auth/login",
  "Invalid JSON response from upstream login."
);
