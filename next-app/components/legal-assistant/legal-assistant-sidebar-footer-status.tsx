"use client";

import { MessageSquareIcon } from "lucide-react";

export function LegalAssistantSidebarFooterStatus({ messageCount }: { messageCount: number | null }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-sidebar-accent/20 px-3 py-3">
      <div className="flex size-10 items-center justify-center rounded-2xl bg-sidebar-accent text-sidebar-accent-foreground">
        <MessageSquareIcon className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">智能法律问答</div>
        <div className="truncate text-xs text-sidebar-foreground/55">{messageCount ? `${messageCount} 条消息` : "等待你的提问"}</div>
      </div>
    </div>
  );
}
