"use client";

type LegalAssistantSettingsAuthCardProps = {
  authStatus: string;
};

export function LegalAssistantSettingsAuthCard({ authStatus }: LegalAssistantSettingsAuthCardProps) {
  const isVerified = authStatus === "已验证";

  return (
    <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs text-muted-foreground">JWT 会话状态</div>
        <div
          className={
            isVerified
              ? "rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-600"
              : "rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-600"
          }
        >
          {authStatus}
        </div>
      </div>
    </div>
  );
}
