export const dynamic = "force-dynamic";

import { createExplicitAuthProxy } from "@/lib/auth/explicit-auth-proxy";

export const POST = createExplicitAuthProxy({
  path: "/api/auth/send-code",
  proxyName: "send-code",
  errorLabel: "Send code",
});
