"use client";

import { Settings2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";

import { LegalAssistantSidebarFooterStatus } from "./legal-assistant-sidebar-footer-status";

type LegalAssistantSidebarFooterProps = {
  messageCount: number | null;
  onOpenSettings: () => void;
};

export function LegalAssistantSidebarFooter({
  messageCount,
  onOpenSettings,
}: LegalAssistantSidebarFooterProps) {
  return (
    <div className="border-t border-sidebar-border/70 px-2 pb-2 pt-2">
      <div className="flex items-center gap-2">
        <LegalAssistantSidebarFooterStatus messageCount={messageCount} />
        <Button
          aria-label="打开设置"
          className="size-8 rounded-md text-sidebar-foreground/60 hover:text-sidebar-foreground"
          onClick={onOpenSettings}
          size="icon-sm"
          type="button"
          variant="ghost"
        >
          <Settings2Icon className="size-4" />
        </Button>
      </div>
    </div>
  );
}
