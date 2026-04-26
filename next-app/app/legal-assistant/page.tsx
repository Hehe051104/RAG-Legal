"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { LegalAssistantShell } from "@/components/legal-assistant/legal-assistant-shell";
import { validateStoredAuthSession } from "@/lib/auth/session-client";

type AuthBootstrapState = {
  phase: "loading" | "ready";
  authToken: string | null;
};

export default function LegalAssistantPage() {
  const router = useRouter();
  const [state, setState] = useState<AuthBootstrapState>({
    phase: "loading",
    authToken: null,
  });

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      const result = await validateStoredAuthSession();
      if (cancelled) {
        return;
      }

      if (!result.ok) {
        router.replace("/login");
        return;
      }

      setState({
        phase: "ready",
        authToken: result.session?.accessToken ?? null,
      });
    };

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [router]);

  if (state.phase === "loading" || !state.authToken) {
    return (
      <div className="flex h-dvh w-full items-center justify-center bg-background text-sm text-muted-foreground">
        正在初始化工作区...
      </div>
    );
  }

  return <LegalAssistantShell authToken={state.authToken} />;
}
