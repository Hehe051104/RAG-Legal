"use client";

import { Edit2Icon, FolderIcon, PlusIcon, Trash2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";

import { getLegalAssistantConversationPreview } from "./legal-assistant-conversation-preview";
import { LegalAssistantSidebarItem } from "./legal-assistant-sidebar-item";

type FolderConversation = {
  id: string;
  title: string;
  messages: Array<{ content: string }>;
};

type GroupedFolder = {
  id: string;
  name: string;
  conversationIds: string[];
  conversations: FolderConversation[];
};

type LegalAssistantSidebarFoldersProps = {
  groupedFolders: GroupedFolder[];
  selectedConversationId: string | null;
  onConversationRename: (conversationId: string) => void;
  onConversationDelete: (conversationId: string) => void;
  onFolderEdit: (folderId: string) => void;
  onFolderDelete: (folderId: string) => void;
  onCreateFolder: () => void;
  onSelectConversation: (conversationId: string) => void;
};

export function LegalAssistantSidebarFolders({
  groupedFolders,
  selectedConversationId,
  onConversationRename,
  onConversationDelete,
  onFolderEdit,
  onFolderDelete,
  onCreateFolder,
  onSelectConversation,
}: LegalAssistantSidebarFoldersProps) {
  const hasFolders = groupedFolders.length > 0;

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between px-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-sidebar-foreground/60">
        <span>文件夹</span>
        <Button
          aria-label="新建文件夹"
          className="size-7 rounded-md"
          onClick={onCreateFolder}
          size="icon-sm"
          type="button"
          variant="ghost"
        >
          <PlusIcon className="size-3.5" />
        </Button>
      </div>

      <div className="space-y-2">
        {!hasFolders ? (
          <div className="rounded-lg border border-dashed border-sidebar-border/70 px-3 py-3 text-xs text-sidebar-foreground/55">
            暂无文件夹，点击右上角加号创建。
          </div>
        ) : (
          groupedFolders.map((folder) => (
            <div
              className="space-y-1.5 rounded-lg border border-sidebar-border/60 bg-sidebar-accent/20 p-2"
              key={folder.id}
            >
              <div className="group/folder flex items-center gap-2 px-1">
                <FolderIcon className="size-4 text-sidebar-foreground/60" />
                <button
                  className="min-w-0 flex-1 text-left"
                  onClick={() => onFolderEdit(folder.id)}
                  type="button"
                >
                  <div className="truncate text-[13px] font-medium leading-5">{folder.name}</div>
                  <div className="text-[11px] text-sidebar-foreground/55 leading-5">
                    {folder.conversationIds.length} 个会话
                  </div>
                </button>

                <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover/folder:opacity-100">
                  <Button
                    aria-label="重命名文件夹"
                    className="size-7 rounded-md"
                    onClick={() => onFolderEdit(folder.id)}
                    size="icon-sm"
                    type="button"
                    variant="ghost"
                  >
                    <Edit2Icon className="size-3.5" />
                  </Button>
                  <Button
                    aria-label="删除文件夹"
                    className="size-7 rounded-md text-destructive hover:text-destructive"
                    onClick={() => onFolderDelete(folder.id)}
                    size="icon-sm"
                    type="button"
                    variant="ghost"
                  >
                    <Trash2Icon className="size-3.5" />
                  </Button>
                </div>
              </div>

              <div className="space-y-1">
                {folder.conversations.length === 0 ? (
                  <div className="px-2 py-1 text-[11px] text-sidebar-foreground/50">文件夹为空</div>
                ) : (
                  folder.conversations.map((conversation) => (
                    <LegalAssistantSidebarItem
                      conversationId={conversation.id}
                      isActive={selectedConversationId === conversation.id}
                      key={conversation.id}
                      onDelete={onConversationDelete}
                      onRename={onConversationRename}
                      onSelect={onSelectConversation}
                      preview={getLegalAssistantConversationPreview(conversation.messages.at(-1)?.content ?? "")}
                      title={conversation.title}
                    />
                  ))
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
