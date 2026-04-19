import { createAuthProxy } from "@/lib/auth/edge-auth-proxy";

export const dynamic = "force-dynamic";

export const POST = createAuthProxy(
  "/api/auth/google",
  "Invalid JSON response from upstream Google login."
);
