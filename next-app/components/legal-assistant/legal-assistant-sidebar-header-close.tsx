"use client";

import { PanelLeftCloseIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

type LegalAssistantSidebarHeaderCloseProps = {
  onClose: () => void;
};

export function LegalAssistantSidebarHeaderClose({ onClose }: LegalAssistantSidebarHeaderCloseProps) {
  return (
    <Button
      aria-label="关闭侧栏"
      className="ml-auto size-8 rounded-md text-sidebar-foreground/70 hover:text-sidebar-foreground"
      onClick={onClose}
      size="icon-sm"
      type="button"
      variant="ghost"
    >
      <PanelLeftCloseIcon className="size-4" />
    </Button>
  );
}
