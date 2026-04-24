"use client";

import { LegalAssistantDashboard } from "./legal-assistant-dashboard";
import { useHome } from "./home-context";
import { useLegalAssistantChatDialogs } from "./use-legal-assistant-chat-dialogs";

export function LegalAssistantChat() {
  const {
    conversations,
    selectedConversation,
    isSending,
    isSideBarOpen,
    setSideBarOpen,
    selectedFolder,
    renameConversation,
    deleteConversation,
    createFolder,
    renameFolder,
    deleteFolder,
    modelId,
    folders,
    sendMessage,
  } = useHome();

  const {
    conversationDialog,
    conversationDraft,
    closeConversationDialog,
    closeFolderDialog,
    folderDialog,
    folderDraft,
    openConversationRenameDialog,
    openFolderCreateDialog,
    openFolderRenameDialog,
    setConversationDraft,
    setFolderDraft,
    submitConversationDialog,
    submitFolderDialog,
  } = useLegalAssistantChatDialogs({
    conversations,
    createFolder,
    folders,
    renameConversation,
    renameFolder,
  });

  return (
    <LegalAssistantDashboard
      conversationDialogOpen={Boolean(conversationDialog)}
      conversationDraft={conversationDraft}
      folderDialogMode={folderDialog?.mode ?? "create"}
      folderDialogOpen={Boolean(folderDialog)}
      folderDraft={folderDraft}
      isSending={isSending}
      isSidebarOpen={isSideBarOpen}
      messages={selectedConversation?.messages ?? []}
      modelLabel={modelId}
      onConversationDelete={deleteConversation}
      onConversationDialogClose={closeConversationDialog}
      onConversationDialogSubmit={submitConversationDialog}
      onConversationRename={openConversationRenameDialog}
      onCreateFolder={openFolderCreateDialog}
      onFolderDelete={deleteFolder}
      onFolderDialogClose={closeFolderDialog}
      onFolderDialogSubmit={submitFolderDialog}
      onFolderEdit={openFolderRenameDialog}
      onOpenSidebar={() => setSideBarOpen(true)}
      onQuickPrompt={(prompt) => {
        void sendMessage(prompt);
      }}
      selectedFolderName={selectedFolder?.name ?? null}
      setConversationDraft={setConversationDraft}
      setFolderDraft={setFolderDraft}
      title={selectedConversation?.title ?? "法律助手"}
    />
  );
}
