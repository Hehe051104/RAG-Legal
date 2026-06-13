"use client";

import { SessionProvider } from "next-auth/react";
import { useEffect } from "react";

/**
 * 包装 SessionProvider 并静默处理 session 获取失败。
 * 应用使用自定义 auth（lib/auth/session-client），不依赖 next-auth session。
 * 后端未启动时 SessionProvider 会报错，这里用全局错误处理器静默它。
 */
export function AuthSessionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    const handler = (event: ErrorEvent) => {
      if (event.message?.includes("authjs") || event.message?.includes("auth")) {
        event.preventDefault();
      }
    };
    window.addEventListener("error", handler);
    return () => window.removeEventListener("error", handler);
  }, []);

  return <SessionProvider>{children}</SessionProvider>;
}
