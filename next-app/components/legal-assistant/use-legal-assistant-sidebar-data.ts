"use client";

import { useMemo } from "react";

import type { LegalAssistantConversation, LegalAssistantFolder } from "./api";

export type GroupedFolder = LegalAssistantFolder & {
  conversations: LegalAssistantConversation[];
};

type UseLegalAssistantSidebarDataParams = {
  conversations: LegalAssistantConversation[];
  folders: LegalAssistantFolder[];
};

type UseLegalAssistantSidebarDataResult = {
  groupedFolders: GroupedFolder[];
  sortedConversations: LegalAssistantConversation[];
  ungroupedConversations: LegalAssistantConversation[];
};

function resolveConversationSortKey(conversation: LegalAssistantConversation) {
  return conversation.updatedAt || conversation.createdAt || "";
}

function resolveFolderSortKey(folder: LegalAssistantFolder) {
  return folder.updatedAt || folder.createdAt || "";
}

function sortConversationsByUpdatedAt(conversations: LegalAssistantConversation[]) {
  return [...conversations].sort((left, right) => {
    return resolveConversationSortKey(right).localeCompare(resolveConversationSortKey(left));
  });
}

function sortFoldersByUpdatedAt(folders: LegalAssistantFolder[]) {
  return [...folders].sort((left, right) => {
    return resolveFolderSortKey(right).localeCompare(resolveFolderSortKey(left));
  });
}

function groupConversationsByFolderId(
  conversations: LegalAssistantConversation[],
  folderIds: Set<string>,
) {
  const grouped = new Map<string, LegalAssistantConversation[]>();

  for (const conversation of conversations) {
    const folderId = conversation.folderId;
    if (!folderId || !folderIds.has(folderId)) {
      continue;
    }

    const folderConversations = grouped.get(folderId);
    if (folderConversations) {
      folderConversations.push(conversation);
      continue;
    }

    grouped.set(folderId, [conversation]);
  }

  return grouped;
}

export function useLegalAssistantSidebarData({
  conversations,
  folders,
}: UseLegalAssistantSidebarDataParams): UseLegalAssistantSidebarDataResult {
  const sortedConversations = useMemo(() => {
    return sortConversationsByUpdatedAt(conversations);
  }, [conversations]);

  const sortedFolders = useMemo(() => {
    return sortFoldersByUpdatedAt(folders);
  }, [folders]);

  const folderIds = useMemo(() => {
    return new Set(sortedFolders.map((folder) => folder.id));
  }, [sortedFolders]);

  const conversationsByFolderId = useMemo(() => {
    return groupConversationsByFolderId(sortedConversations, folderIds);
  }, [sortedConversations, folderIds]);

  const groupedFolders = useMemo(() => {
    return sortedFolders.map((folder) => ({
        ...folder,
        conversations: conversationsByFolderId.get(folder.id) ?? [],
      }));
  }, [sortedFolders, conversationsByFolderId]);

  const ungroupedConversations = useMemo(() => {
    return sortedConversations.filter((conversation) => !conversation.folderId);
  }, [sortedConversations]);

  return {
    groupedFolders,
    sortedConversations,
    ungroupedConversations,
  };
}
