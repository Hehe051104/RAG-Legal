"use client";

import { useCallback, useMemo, useState } from "react";

type FolderDialogState = {
  mode: "create" | "rename";
  folderId?: string;
};

type ConversationInfo = { id: string; title: string };
type FolderInfo = { id: string; name: string };

type UseLegalAssistantChatDialogsProps = {
  conversations: ConversationInfo[];
  folders: FolderInfo[];
  createFolder: (name: string) => void;
  renameFolder: (folderId: string, name: string) => void;
  renameConversation: (conversationId: string, name: string) => void;
};

const DEFAULT_FOLDER_NAME = "新文件夹";
const DEFAULT_CONVERSATION_NAME = "新对话";

function normalizeDraftValue(value: string, fallback: string) {
  const trimmed = value.trim();
  return trimmed || fallback;
}

export function useLegalAssistantChatDialogs({
  conversations,
  folders,
  createFolder,
  renameFolder,
  renameConversation,
}: UseLegalAssistantChatDialogsProps) {
  const [folderDialog, setFolderDialog] = useState<FolderDialogState | null>(null);
  const [folderDraft, setFolderDraft] = useState("");
  const [conversationDialog, setConversationDialog] = useState<string | null>(null);
  const [conversationDraft, setConversationDraft] = useState("");

  const folderById = useMemo(() => {
    return new Map(folders.map((folder) => [folder.id, folder]));
  }, [folders]);

  const conversationById = useMemo(() => {
    return new Map(conversations.map((conversation) => [conversation.id, conversation]));
  }, [conversations]);

  const resetFolderDialog = useCallback(() => {
    setFolderDialog(null);
    setFolderDraft("");
  }, []);

  const resetConversationDialog = useCallback(() => {
    setConversationDialog(null);
    setConversationDraft("");
  }, []);

  const openFolderCreateDialog = useCallback(() => {
    setFolderDialog({ mode: "create" });
    setFolderDraft(DEFAULT_FOLDER_NAME);
  }, []);

  const openFolderRenameDialog = useCallback((folderId: string) => {
    const folder = folderById.get(folderId);
    if (!folder) {
      return;
    }

    setFolderDialog({ mode: "rename", folderId });
    setFolderDraft(folder.name);
  }, [folderById]);

  const openConversationRenameDialog = useCallback((conversationId: string) => {
    const conversation = conversationById.get(conversationId);
    if (!conversation) {
      return;
    }

    setConversationDialog(conversationId);
    setConversationDraft(conversation.title);
  }, [conversationById]);

  const submitFolderDialog = useCallback(() => {
    if (!folderDialog) {
      return;
    }

    const value = normalizeDraftValue(folderDraft, DEFAULT_FOLDER_NAME);

    if (folderDialog.mode === "create") {
      createFolder(value);
    } else if (folderDialog.folderId) {
      renameFolder(folderDialog.folderId, value);
    }

    resetFolderDialog();
  }, [createFolder, folderDialog, folderDraft, renameFolder, resetFolderDialog]);

  const submitConversationDialog = useCallback(() => {
    if (!conversationDialog) {
      return;
    }

    renameConversation(
      conversationDialog,
      normalizeDraftValue(conversationDraft, DEFAULT_CONVERSATION_NAME),
    );

    resetConversationDialog();
  }, [conversationDialog, conversationDraft, renameConversation, resetConversationDialog]);

  return {
    folderDialog,
    folderDraft,
    conversationDialog,
    conversationDraft,
    closeConversationDialog: resetConversationDialog,
    closeFolderDialog: resetFolderDialog,
    openConversationRenameDialog,
    openFolderCreateDialog,
    openFolderRenameDialog,
    setConversationDraft,
    setFolderDraft,
    submitConversationDialog,
    submitFolderDialog,
  };
}
