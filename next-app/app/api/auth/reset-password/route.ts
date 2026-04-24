export const dynamic = "force-dynamic";

import { createExplicitAuthProxy } from "@/lib/auth/explicit-auth-proxy";

export const POST = createExplicitAuthProxy({
  path: "/api/auth/reset-password",
  proxyName: "reset-password",
  errorLabel: "Reset-password",
});
