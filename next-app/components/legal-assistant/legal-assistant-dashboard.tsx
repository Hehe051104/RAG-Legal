"use client";

import { LegalAssistantMainPane } from "./legal-assistant-main-pane";
import { LegalAssistantSidebar } from "./legal-assistant-sidebar";

export function LegalAssistantDashboard({
  isSidebarOpen,
  modelLabel,
  selectedFolderName,
  title,
  messages,
  isSending,
  onOpenSidebar,
  onQuickPrompt,
  conversationDialogOpen,
  conversationDraft,
  folderDialogMode,
  folderDialogOpen,
  folderDraft,
  onConversationDialogClose,
  onConversationDialogSubmit,
  onFolderDialogClose,
  onFolderDialogSubmit,
  setConversationDraft,
  setFolderDraft,
  onConversationDelete,
  onConversationRename,
  onCreateFolder,
  onFolderDelete,
  onFolderEdit,
}: {
  isSidebarOpen: boolean;
  modelLabel: string;
  selectedFolderName: string | null;
  title: string;
  messages: Array<{
    id: string;
    role: "user" | "assistant";
    content: string;
    createdAt: string;
    status?: "streaming" | "done" | "error";
    isError?: boolean;
  }>;
  isSending: boolean;
  onOpenSidebar: () => void;
  onQuickPrompt: (prompt: string) => void;
  conversationDialogOpen: boolean;
  conversationDraft: string;
  folderDialogMode: "create" | "rename";
  folderDialogOpen: boolean;
  folderDraft: string;
  onConversationDialogClose: () => void;
  onConversationDialogSubmit: () => void;
  onFolderDialogClose: () => void;
  onFolderDialogSubmit: () => void;
  setConversationDraft: (value: string) => void;
  setFolderDraft: (value: string) => void;
  onConversationDelete: (conversationId: string) => void;
  onConversationRename: (conversationId: string) => void;
  onCreateFolder: () => void;
  onFolderDelete: (folderId: string) => void;
  onFolderEdit: (folderId: string) => void;
}) {
  return (
    <div className="flex h-dvh w-full overflow-hidden bg-background">
      <LegalAssistantSidebar
        onConversationDelete={onConversationDelete}
        onConversationRename={onConversationRename}
        onCreateFolder={onCreateFolder}
        onFolderDelete={onFolderDelete}
        onFolderEdit={onFolderEdit}
      />

      <LegalAssistantMainPane
        conversationDialogOpen={conversationDialogOpen}
        conversationDraft={conversationDraft}
        folderDialogMode={folderDialogMode}
        folderDialogOpen={folderDialogOpen}
        folderDraft={folderDraft}
        isSending={isSending}
        isSidebarOpen={isSidebarOpen}
        messages={messages}
        modelLabel={modelLabel}
        onConversationDialogClose={onConversationDialogClose}
        onConversationDialogSubmit={onConversationDialogSubmit}
        onFolderDialogClose={onFolderDialogClose}
        onFolderDialogSubmit={onFolderDialogSubmit}
        onOpenSidebar={onOpenSidebar}
        onQuickPrompt={onQuickPrompt}
        selectedFolderName={selectedFolderName}
        setConversationDraft={setConversationDraft}
        setFolderDraft={setFolderDraft}
        title={title}
      />
    </div>
  );
}
