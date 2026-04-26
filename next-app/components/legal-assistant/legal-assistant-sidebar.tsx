"use client";

import { LegalAssistantSidebarContent } from "./legal-assistant-sidebar-content";

type LegalAssistantSidebarProps = {
  onConversationRename: (conversationId: string) => void;
  onConversationDelete: (conversationId: string) => void;
  onFolderEdit: (folderId: string) => void;
  onFolderDelete: (folderId: string) => void;
  onCreateFolder: () => void;
};

export function LegalAssistantSidebar({
  onConversationRename,
  onConversationDelete,
  onFolderEdit,
  onFolderDelete,
  onCreateFolder,
}: LegalAssistantSidebarProps) {
  return (
    <LegalAssistantSidebarContent
      onConversationDelete={onConversationDelete}
      onConversationRename={onConversationRename}
      onCreateFolder={onCreateFolder}
      onFolderDelete={onFolderDelete}
      onFolderEdit={onFolderEdit}
    />
  );
}
