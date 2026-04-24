"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { LegalAssistantShell } from "@/components/legal-assistant/legal-assistant-shell";
import { validateStoredAuthSession } from "@/lib/auth/session-client";

export default function LegalAssistantPage() {
  const router = useRouter();
  const [authToken, setAuthToken] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const checkAuth = async () => {
      const result = await validateStoredAuthSession();
      if (cancelled) {
        return;
      }

      if (!result.ok) {
        router.replace("/login");
        return;
      }

      setAuthToken(result.session?.accessToken ?? null);
    };

    void checkAuth();

    return () => {
      cancelled = true;
    };
  }, [router]);

  if (!authToken) {
    return (
      <div className="flex h-dvh w-full items-center justify-center bg-background text-sm text-muted-foreground">
        正在校验登录状态...
      </div>
    );
  }

  return <LegalAssistantShell authToken={authToken} />;
}
