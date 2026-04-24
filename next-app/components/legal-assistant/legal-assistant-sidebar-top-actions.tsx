"use client";

import { Button } from "@/components/ui/button";

export function LegalAssistantSidebarTopActions({
  modelId,
  onCreateConversation,
  onOpenSettings,
}: {
  modelId: string;
  onCreateConversation: () => void;
  onOpenSettings: () => void;
}) {
  return (
    <div className="border-b-2 border-sidebar-border/70 px-3 py-3">
      <Button className="h-11 w-full justify-start rounded-2xl" onClick={onCreateConversation} type="button" variant="secondary">
        新建对话
      </Button>
      <div className="mt-2 flex items-center gap-2">
        <div className="min-w-0 flex-1 rounded-2xl border border-sidebar-border/70 bg-sidebar-accent/20 px-3 py-2 text-xs text-sidebar-foreground/70">
          当前模型：{modelId}
        </div>
        <Button className="size-9 rounded-full" onClick={onOpenSettings} size="icon-sm" type="button" variant="ghost">
          设置
        </Button>
      </div>
    </div>
  );
}
