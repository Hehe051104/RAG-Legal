"use client";

import { PanelLeftOpenIcon, PlusIcon, Settings2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";

import { useHome } from "./home-context";

type LegalAssistantSidebarTopActionsProps = {
  modelId: string;
  onCreateConversation: () => void;
  onOpenSettings: () => void;
};

export function LegalAssistantSidebarTopActions({
  modelId,
  onCreateConversation,
  onOpenSettings,
}: LegalAssistantSidebarTopActionsProps) {
  const { isSideBarOpen, setSideBarOpen } = useHome();

  return (
    <div className="border-b border-sidebar-border/70 px-2 py-2">
      <div className="flex items-center gap-1.5">
        <Button
          className="h-9 flex-1 justify-start rounded-md border border-sidebar-border bg-transparent text-[13px] text-sidebar-foreground/70 transition-colors duration-150 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
          onClick={onCreateConversation}
          type="button"
          variant="ghost"
        >
          <PlusIcon className="size-4" />
          新建会话
        </Button>

        <Button
          aria-label="打开设置"
          className="size-9 rounded-md text-sidebar-foreground/60 hover:text-sidebar-foreground"
          onClick={onOpenSettings}
          size="icon-sm"
          type="button"
          variant="ghost"
        >
          <Settings2Icon className="size-4" />
        </Button>

        {!isSideBarOpen ? (
          <Button
            aria-label="打开侧栏"
            className="size-9 rounded-md text-sidebar-foreground/60 hover:text-sidebar-foreground"
            onClick={() => setSideBarOpen(true)}
            size="icon-sm"
            type="button"
            variant="ghost"
          >
            <PanelLeftOpenIcon className="size-4" />
          </Button>
        ) : null}
      </div>

      <div className="mt-2 rounded-md border border-sidebar-border/60 bg-sidebar-accent/20 px-2 py-1.5 text-[11px] text-sidebar-foreground/65">
        模型: {modelId || "legal-default"}
      </div>
    </div>
  );
}
