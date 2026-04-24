"use client";

import { cn } from "@/lib/utils";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useIsMobile } from "@/hooks/use-mobile";

import { useHome } from "./home-context";
import { LegalAssistantSidebarFooter } from "./legal-assistant-sidebar-footer";
import { LegalAssistantSidebarFolders } from "./legal-assistant-sidebar-folders";
import { LegalAssistantSidebarHeader } from "./legal-assistant-sidebar-header";
import { LegalAssistantSidebarTopActions } from "./legal-assistant-sidebar-top-actions";
import { LegalAssistantSidebarUngrouped } from "./legal-assistant-sidebar-ungrouped";
import { useLegalAssistantSidebarData } from "./use-legal-assistant-sidebar-data";

export function LegalAssistantSidebarContent({
  onConversationRename,
  onConversationDelete,
  onFolderEdit,
  onFolderDelete,
  onCreateFolder,
}: {
  onConversationRename: (conversationId: string) => void;
  onConversationDelete: (conversationId: string) => void;
  onFolderEdit: (folderId: string) => void;
  onFolderDelete: (folderId: string) => void;
  onCreateFolder: () => void;
}) {
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

  const { groupedFolders, ungroupedConversations } = useLegalAssistantSidebarData({ conversations, folders });

  const sidebarBody = (
    <div className="relative flex h-full min-h-0 flex-col bg-[linear-gradient(to_bottom,oklch(0.2_0.015_260),oklch(0.14_0.015_260))] text-sidebar-foreground">
      <div className="pointer-events-none absolute inset-0 border-r border-white/10" />
      <LegalAssistantSidebarHeader onClose={() => setSideBarOpen(false)} />
      <LegalAssistantSidebarTopActions modelId={modelId} onCreateConversation={createConversation} onOpenSettings={() => setSettingsOpen(true)} />

      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-4 px-3 py-4">
          <LegalAssistantSidebarFolders
            groupedFolders={groupedFolders}
            onConversationDelete={onConversationDelete}
            onConversationRename={onConversationRename}
            onCreateFolder={onCreateFolder}
            onFolderDelete={onFolderDelete}
            onFolderEdit={onFolderEdit}
            onSelectConversation={selectConversation}
            selectedConversationId={selectedConversationId}
          />

          <LegalAssistantSidebarUngrouped
            conversations={ungroupedConversations}
            onConversationDelete={onConversationDelete}
            onConversationRename={onConversationRename}
            onSelectConversation={selectConversation}
            selectedConversationId={selectedConversationId}
          />
        </div>
      </ScrollArea>

      <LegalAssistantSidebarFooter
        messageCount={selectedConversation?.messages.length ?? null}
        onOpenSettings={() => setSettingsOpen(true)}
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
    <aside className={cn("hidden border-r-2 border-border/50 bg-sidebar md:block", isSideBarOpen ? "w-[350px]" : "w-0 overflow-hidden")}>
      {sidebarBody}
    </aside>
  );
}
