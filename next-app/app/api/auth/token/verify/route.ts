export const dynamic = "force-dynamic";

import { createExplicitAuthProxy } from "@/lib/auth/explicit-auth-proxy";

export const POST = createExplicitAuthProxy({
  path: "/api/auth/token/verify",
  proxyName: "token/verify",
  errorLabel: "Token verify",
  logResponseStatus: true,
});
