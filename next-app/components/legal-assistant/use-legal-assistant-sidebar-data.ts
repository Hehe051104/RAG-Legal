"use client";

import { useMemo } from "react";

export function useLegalAssistantSidebarData({
  conversations,
  folders,
}: {
  conversations: Array<{ id: string; folderId: string | null; updatedAt: string }>;
  folders: Array<{ id: string }>;
}) {
  const sortedConversations = useMemo(
    () => [...conversations].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)),
    [conversations],
  );

  const groupedFolders = useMemo(
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
