import { createExplicitAuthProxy } from "@/lib/auth/explicit-auth-proxy";

/**
 * @deprecated 请改用 createExplicitAuthProxy。
 * 保留该兼容层仅用于避免历史引用在迁移期中断。
 */
export function createAuthProxy(targetPath: string, _invalidJsonError: string) {
  const normalizedPath = targetPath.startsWith("/") ? targetPath : `/${targetPath}`;
  const proxyName = normalizedPath.replace(/^\/api\/auth\//, "") || "auth";

  return createExplicitAuthProxy({
    path: normalizedPath,
    proxyName,
    errorLabel: proxyName,
    setAuthCookie: proxyName === "login" || proxyName === "google",
    logResponseStatus: proxyName === "token/verify",
  });
}