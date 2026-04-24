"use client";

import { useMemo } from "react";

import type { LegalAssistantConversation, LegalAssistantFolder } from "./api";

export function useLegalAssistantSidebarData({
  conversations,
  folders,
}: {
  conversations: LegalAssistantConversation[];
  folders: LegalAssistantFolder[];
}) {
  const sortedConversations = useMemo(
    () => [...conversations].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)),
    [conversations],
  );

  const groupedFolders = useMemo<
    Array<LegalAssistantFolder & { conversations: LegalAssistantConversation[] }>
  >(
    () =>
      folders.map((folder) => ({
        ...folder,
        conversations: sortedConversations.filter((conversation) => conversation.folderId === folder.id),
      })),
    [folders, sortedConversations],
  );

  const ungroupedConversations = useMemo(
    () => sortedConversations.filter((conversation) => !conversation.folderId),
    [sortedConversations],
  );

  return {
    groupedFolders,
    sortedConversations,
    ungroupedConversations,
  };
}
