"use client";

import { SearchIcon } from "lucide-react";
import { useCallback, useMemo, useState } from "react";

import { Input } from "@/components/ui/input";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

import type { LegalAssistantConversation } from "./api";
import { useHome } from "./home-context";
import { LegalAssistantSidebarFooter } from "./legal-assistant-sidebar-footer";
import { LegalAssistantSidebarFolders } from "./legal-assistant-sidebar-folders";
import { LegalAssistantSidebarHeader } from "./legal-assistant-sidebar-header";
import { LegalAssistantSidebarTopActions } from "./legal-assistant-sidebar-top-actions";
import { LegalAssistantSidebarUngrouped } from "./legal-assistant-sidebar-ungrouped";
import { useLegalAssistantSidebarData } from "./use-legal-assistant-sidebar-data";

type LegalAssistantSidebarContentProps = {
  onConversationRename: (conversationId: string) => void;
  onConversationDelete: (conversationId: string) => void;
  onFolderEdit: (folderId: string) => void;
  onFolderDelete: (folderId: string) => void;
  onCreateFolder: () => void;
};

function matchesConversation(conversation: LegalAssistantConversation, term: string) {
  const content = `${conversation.title} ${conversation.messages.at(-1)?.content ?? ""}`.toLowerCase();
  return content.includes(term);
}

export function LegalAssistantSidebarContent({
  onConversationRename,
  onConversationDelete,
  onFolderEdit,
  onFolderDelete,
  onCreateFolder,
}: LegalAssistantSidebarContentProps) {
  const {
    conversations,
    folders,
    selectedConversationId,
    selectedConversation,
    isSideBarOpen,
    setSideBarOpen,
    createConversation,
    selectConversation,
    setSettingsOpen,
    modelId,
  } = useHome();

  const isMobile = useIsMobile();
  const [searchTerm, setSearchTerm] = useState("");

  const { groupedFolders, ungroupedConversations } = useLegalAssistantSidebarData({ conversations, folders });

  const normalizedTerm = searchTerm.trim().toLowerCase();
  const handleCloseSidebar = useCallback(() => {
    setSideBarOpen(false);
  }, [setSideBarOpen]);

  const handleOpenSettings = useCallback(() => {
    setSettingsOpen(true);
  }, [setSettingsOpen]);

  const handleSearchTermChange = useCallback((value: string) => {
    setSearchTerm(value);
  }, []);

  const handleSelectConversation = useCallback(
    (conversationId: string) => {
      selectConversation(conversationId);
      if (isMobile) {
        setSideBarOpen(false);
      }
    },
    [isMobile, selectConversation, setSideBarOpen],
  );

  const filteredGroupedFolders = useMemo(() => {
    if (!normalizedTerm) {
      return groupedFolders;
    }

    return groupedFolders
      .map((folder) => ({
        ...folder,
        conversations: folder.conversations.filter((conversation) => matchesConversation(conversation, normalizedTerm)),
      }))
      .filter((folder) => folder.name.toLowerCase().includes(normalizedTerm) || folder.conversations.length > 0);
  }, [groupedFolders, normalizedTerm]);

  const filteredUngroupedConversations = useMemo(() => {
    if (!normalizedTerm) {
      return ungroupedConversations;
    }

    return ungroupedConversations.filter((conversation) => matchesConversation(conversation, normalizedTerm));
  }, [normalizedTerm, ungroupedConversations]);

  const sidebarBody = (
    <div className="flex h-full min-h-0 flex-col bg-sidebar text-sidebar-foreground">
      <div className="border-r border-sidebar-border/60">
        <LegalAssistantSidebarHeader onClose={handleCloseSidebar} />
      </div>

      <LegalAssistantSidebarTopActions
        modelId={modelId}
        onCreateConversation={createConversation}
        onOpenSettings={handleOpenSettings}
      />

      <div className="px-3 pb-2 pt-2">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-3 top-2.5 size-4 text-sidebar-foreground/50" />
          <Input
            className="h-9 rounded-lg border-sidebar-border/60 bg-sidebar-accent/30 pl-9"
            onChange={(event) => handleSearchTermChange(event.target.value)}
            placeholder="搜索对话或文件夹..."
            value={searchTerm}
          />
        </div>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-4 px-2 py-3">
          <div className="space-y-3 rounded-lg border border-sidebar-border/60 bg-sidebar-accent/15 p-2">
            <div className="px-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-sidebar-foreground/60">
              Folders
            </div>
            <LegalAssistantSidebarFolders
              groupedFolders={filteredGroupedFolders}
              onConversationDelete={onConversationDelete}
              onConversationRename={onConversationRename}
              onCreateFolder={onCreateFolder}
              onFolderDelete={onFolderDelete}
              onFolderEdit={onFolderEdit}
              onSelectConversation={handleSelectConversation}
              selectedConversationId={selectedConversationId}
            />
          </div>

          <div className="space-y-3 rounded-lg border border-sidebar-border/60 bg-sidebar-accent/15 p-2">
            <div className="px-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-sidebar-foreground/60">
              Conversations
            </div>
            <LegalAssistantSidebarUngrouped
              conversations={filteredUngroupedConversations}
              onConversationDelete={onConversationDelete}
              onConversationRename={onConversationRename}
              onSelectConversation={handleSelectConversation}
              selectedConversationId={selectedConversationId}
            />
          </div>
        </div>
      </ScrollArea>

      <LegalAssistantSidebarFooter
        messageCount={selectedConversation?.messages.length ?? null}
        onOpenSettings={handleOpenSettings}
      />
    </div>
  );

  if (isMobile) {
    return (
      <Sheet onOpenChange={setSideBarOpen} open={isSideBarOpen}>
        <SheetContent className="w-[88vw] max-w-sm border-r border-border/40 p-0" side="left" showCloseButton={false}>
          {sidebarBody}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <aside
      className={cn(
        "hidden min-h-0 flex-col bg-sidebar transition-[width] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] md:flex",
        isSideBarOpen
          ? "w-[340px] border-r border-sidebar-border/70"
          : "w-0 overflow-hidden border-r-0",
      )}
    >
      {sidebarBody}
    </aside>
  );
}
