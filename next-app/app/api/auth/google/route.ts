import { createExplicitAuthProxy } from "@/lib/auth/explicit-auth-proxy";

export const dynamic = "force-dynamic";

export const POST = createExplicitAuthProxy({
  path: "/api/auth/google",
  proxyName: "google",
  errorLabel: "Google",
  setAuthCookie: true,
});
