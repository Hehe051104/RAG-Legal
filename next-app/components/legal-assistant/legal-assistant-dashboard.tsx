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
    <div className="relative flex h-dvh w-full overflow-hidden bg-[radial-gradient(circle_at_8%_8%,oklch(0.78_0.07_85_/0.22),transparent_38%),radial-gradient(circle_at_92%_6%,oklch(0.65_0.09_265_/0.16),transparent_34%),radial-gradient(circle_at_50%_100%,oklch(0.84_0.03_95_/0.18),transparent_48%),oklch(0.17_0.01_260)]">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,oklch(1_0_0_/0.06),transparent_26%,oklch(0_0_0_/0.15))]" />

      <div className="relative flex h-full w-full overflow-hidden p-0 md:p-3">
        <div className="flex h-full w-full overflow-hidden border-white/10 bg-background/94 shadow-2xl backdrop-blur md:rounded-3xl md:border">
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
      </div>
    </div>
  );
}
