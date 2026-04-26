"use client";

import { PanelLeftIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

import { LegalAssistantChatHeaderActions } from "./legal-assistant-chat-header-actions";
import { LegalAssistantChatHeaderTitle } from "./legal-assistant-chat-header-title";

type LegalAssistantChatHeaderProps = {
  isSidebarOpen: boolean;
  onOpenSidebar: () => void;
  title: string;
  selectedFolderName: string | null;
  modelLabel: string;
};

function resolveHeaderTitle(title: string) {
  return title.trim() || "法律助手";
}

export function LegalAssistantChatHeader({
  isSidebarOpen,
  onOpenSidebar,
  title,
  selectedFolderName,
  modelLabel,
}: LegalAssistantChatHeaderProps) {
  return (
    <header className="sticky top-0 flex h-14 items-center gap-2 border-b border-border/50 bg-sidebar px-3">
      {!isSidebarOpen ? (
        <Button
          aria-label="打开侧栏"
          className="md:hidden"
          onClick={onOpenSidebar}
          size="icon-sm"
          type="button"
          variant="ghost"
        >
          <PanelLeftIcon className="size-4" />
        </Button>
      ) : null}

      <div className="min-w-0 flex-1">
        <LegalAssistantChatHeaderTitle
          modelLabel={modelLabel}
          selectedFolderName={selectedFolderName}
          title={resolveHeaderTitle(title)}
        />
      </div>

      <LegalAssistantChatHeaderActions />
    </header>
  );
}
