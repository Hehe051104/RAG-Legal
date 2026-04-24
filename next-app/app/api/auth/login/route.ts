export const dynamic = "force-dynamic";

import { createExplicitAuthProxy } from "@/lib/auth/explicit-auth-proxy";

export const POST = createExplicitAuthProxy({
  path: "/api/auth/login",
  proxyName: "login",
  errorLabel: "Login",
  setAuthCookie: true,
});
