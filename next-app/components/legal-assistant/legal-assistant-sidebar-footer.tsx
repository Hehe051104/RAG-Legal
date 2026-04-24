"use client";

import { WrenchIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

import { LegalAssistantSidebarFooterStatus } from "./legal-assistant-sidebar-footer-status";

export function LegalAssistantSidebarFooter({
  messageCount,
  onOpenSettings,
}: {
  messageCount: number | null;
  onOpenSettings: () => void;
}) {
  return (
    <div className="border-t-2 border-sidebar-border/70 p-3">
      <div className="flex items-center gap-3">
        <LegalAssistantSidebarFooterStatus messageCount={messageCount} />
        <Button className="size-9 rounded-full" onClick={onOpenSettings} size="icon-sm" variant="ghost" type="button">
          <WrenchIcon className="size-4" />
        </Button>
      </div>
    </div>
  );
}
