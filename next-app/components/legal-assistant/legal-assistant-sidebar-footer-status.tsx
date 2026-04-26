"use client";

import { MessageSquareIcon } from "lucide-react";

type LegalAssistantSidebarFooterStatusProps = {
  messageCount: number | null;
};

export function LegalAssistantSidebarFooterStatus({
  messageCount,
}: LegalAssistantSidebarFooterStatusProps) {
  const statusText = typeof messageCount === "number" ? `${messageCount} 条消息` : "等待你的提问";

  return (
    <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-sidebar-border/60 bg-sidebar-accent/20 px-2.5 py-2">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-sidebar-accent text-sidebar-accent-foreground">
        <MessageSquareIcon className="size-3.5" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="truncate text-xs font-medium uppercase tracking-[0.1em] text-sidebar-foreground/60">Session</div>
        <div className="truncate text-xs text-sidebar-foreground/80">{statusText}</div>
      </div>
    </div>
  );
}
