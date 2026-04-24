"use client";

import { MenuIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

import { LegalAssistantChatHeaderActions } from "./legal-assistant-chat-header-actions";
import { LegalAssistantChatHeaderTitle } from "./legal-assistant-chat-header-title";

export function LegalAssistantChatHeader({
  isSidebarOpen,
  onOpenSidebar,
  title,
  selectedFolderName,
  modelLabel,
}: {
  isSidebarOpen: boolean;
  onOpenSidebar: () => void;
  title: string;
  selectedFolderName: string | null;
  modelLabel: string;
}) {
  return (
    <header className="relative flex min-h-[50px] items-center justify-center border-b-2 border-border/60 bg-secondary px-2 font-bold md:px-4">
      {!isSidebarOpen ? (
        <Button className="absolute left-2 top-1 size-9 rounded-full md:hidden" onClick={onOpenSidebar} size="icon-sm" variant="ghost" type="button">
          <MenuIcon className="size-4" />
        </Button>
      ) : null}

      <div className="flex w-full items-center justify-center">
        <LegalAssistantChatHeaderTitle modelLabel={modelLabel} selectedFolderName={selectedFolderName} title={title} />
      </div>
      <LegalAssistantChatHeaderActions />
    </header>
  );
}
