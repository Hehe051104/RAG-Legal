"use client";

import { useCallback, useMemo } from "react";

import { LegalAssistantDashboard } from "./legal-assistant-dashboard";
import { useHome } from "./home-context";
import { useLegalAssistantChatDialogs } from "./use-legal-assistant-chat-dialogs";

function resolveConversationTitle(title: string | undefined) {
  return title?.trim() || "法律助手";
}

export function LegalAssistantChat() {
  const {
    createFolder,
    deleteFolder,
    conversations,
    folders,
    isSending,
    isSideBarOpen,
    modelId,
    renameConversation,
    renameFolder,
    selectedConversation,
    selectedFolder,
    sendMessage,
    setSideBarOpen,
    deleteConversation,
  } = useHome();

  const selectedMessages = useMemo(
    () => selectedConversation?.messages ?? [],
    [selectedConversation?.messages],
  );

  const selectedFolderName = useMemo(
    () => selectedFolder?.name ?? null,
    [selectedFolder?.name],
  );

  const conversationTitle = useMemo(
    () => resolveConversationTitle(selectedConversation?.title),
    [selectedConversation?.title],
  );

  const handleQuickPrompt = useCallback(
    (prompt: string) => {
      void sendMessage(prompt);
    },
    [sendMessage],
  );

  const handleOpenSidebar = useCallback(() => {
    setSideBarOpen(true);
  }, [setSideBarOpen]);

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
      messages={selectedMessages}
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
      onOpenSidebar={handleOpenSidebar}
      onQuickPrompt={handleQuickPrompt}
      selectedFolderName={selectedFolderName}
      setConversationDraft={setConversationDraft}
      setFolderDraft={setFolderDraft}
      title={conversationTitle}
    />
  );
}
