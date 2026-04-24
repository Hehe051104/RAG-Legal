"use client";

export function LegalAssistantSettingsAuthCard({ authStatus }: { authStatus: string }) {
  return (
    <div className="space-y-3 rounded-3xl border border-border/60 bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-medium">JWT 会话</div>
          <div className="text-xs text-muted-foreground">已通过登录状态校验后才能发送请求。</div>
        </div>
        <div className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">{authStatus}</div>
      </div>
    </div>
  );
}
