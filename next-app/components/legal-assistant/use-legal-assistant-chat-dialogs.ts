"use client";

import { useState } from "react";

export function useLegalAssistantChatDialogs({
  conversations,
  folders,
  createFolder,
  renameFolder,
  renameConversation,
}: {
  conversations: Array<{ id: string; title: string }>;
  folders: Array<{ id: string; name: string }>;
  createFolder: (name: string) => void;
  renameFolder: (folderId: string, name: string) => void;
  renameConversation: (conversationId: string, name: string) => void;
}) {
  const [folderDialog, setFolderDialog] = useState<{ mode: "create" | "rename"; folderId?: string } | null>(null);
  const [folderDraft, setFolderDraft] = useState("");
  const [conversationDialog, setConversationDialog] = useState<string | null>(null);
  const [conversationDraft, setConversationDraft] = useState("");

  const openFolderCreateDialog = () => {
    setFolderDialog({ mode: "create" });
    setFolderDraft("");
  };

  const openFolderRenameDialog = (folderId: string) => {
    const folder = folders.find((item) => item.id === folderId);
    if (!folder) {
      return;
    }

    setFolderDialog({ mode: "rename", folderId });
    setFolderDraft(folder.name);
  };

  const openConversationRenameDialog = (conversationId: string) => {
    const conversation = conversations.find((item) => item.id === conversationId);
    if (!conversation) {
      return;
    }

    setConversationDialog(conversationId);
    setConversationDraft(conversation.title);
  };

  const submitFolderDialog = () => {
    if (!folderDialog) {
      return;
    }

    const value = folderDraft.trim();
    if (folderDialog.mode === "create") {
      createFolder(value || "新文件夹");
    } else if (folderDialog.folderId) {
      renameFolder(folderDialog.folderId, value || "新文件夹");
    }

    setFolderDialog(null);
    setFolderDraft("");
  };

  const submitConversationDialog = () => {
    if (!conversationDialog) {
      return;
    }

    renameConversation(conversationDialog, conversationDraft.trim() || "新对话");
    setConversationDialog(null);
    setConversationDraft("");
  };

  const closeFolderDialog = () => {
    setFolderDialog(null);
    setFolderDraft("");
  };

  const closeConversationDialog = () => {
    setConversationDialog(null);
    setConversationDraft("");
  };

  return {
    conversationDialog,
    conversationDraft,
    closeConversationDialog,
    folderDialog,
    folderDraft,
    closeFolderDialog,
    openConversationRenameDialog,
    openFolderCreateDialog,
    openFolderRenameDialog,
    setConversationDraft,
    setFolderDraft,
    submitConversationDialog,
    submitFolderDialog,
  };
}
