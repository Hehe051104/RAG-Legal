"use client";

import { Edit2Icon, FolderIcon, PlusIcon, Trash2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";

import { getLegalAssistantConversationPreview } from "./legal-assistant-conversation-preview";
import { LegalAssistantSidebarItem } from "./legal-assistant-sidebar-item";

export function LegalAssistantSidebarFolders({
  groupedFolders,
  selectedConversationId,
  onConversationRename,
  onConversationDelete,
  onFolderEdit,
  onFolderDelete,
  onCreateFolder,
  onSelectConversation,
}: {
  groupedFolders: Array<{
    id: string;
    name: string;
    conversationIds: string[];
    conversations: Array<{ id: string; title: string; messages: Array<{ content: string }> }>;
  }>;
  selectedConversationId: string | null;
  onConversationRename: (conversationId: string) => void;
  onConversationDelete: (conversationId: string) => void;
  onFolderEdit: (folderId: string) => void;
  onFolderDelete: (folderId: string) => void;
  onCreateFolder: () => void;
  onSelectConversation: (conversationId: string) => void;
}) {
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between px-2 text-xs font-semibold uppercase tracking-[0.12em] text-sidebar-foreground/55">
        <span>文件夹</span>
        <Button className="size-7 rounded-full" onClick={onCreateFolder} size="icon-sm" variant="ghost" type="button">
          <PlusIcon className="size-3.5" />
        </Button>
      </div>
      <div className="space-y-1.5">
        {groupedFolders.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-sidebar-border/70 px-3 py-4 text-sm text-sidebar-foreground/55">
            还没有文件夹，先创建一个吧。
          </div>
        ) : (
          groupedFolders.map((folder) => (
            <div className="space-y-1.5 rounded-2xl border border-sidebar-border/60 bg-sidebar-accent/20 p-2" key={folder.id}>
              <div className="flex items-center gap-2 px-1">
                <FolderIcon className="size-4 text-sidebar-foreground/55" />
                <button className="min-w-0 flex-1 text-left" onClick={() => onFolderEdit(folder.id)} type="button">
                  <div className="truncate text-sm font-medium">{folder.name}</div>
                  <div className="text-xs text-sidebar-foreground/55">{folder.conversationIds.length} 个对话</div>
                </button>
                <Button className="size-7 rounded-full" onClick={() => onFolderEdit(folder.id)} size="icon-sm" variant="ghost" type="button">
                  <Edit2Icon className="size-3.5" />
                </Button>
                <Button className="size-7 rounded-full text-destructive hover:text-destructive" onClick={() => onFolderDelete(folder.id)} size="icon-sm" variant="ghost" type="button">
                  <Trash2Icon className="size-3.5" />
                </Button>
              </div>

              <div className="space-y-1">
                {folder.conversations.length === 0 ? (
                  <div className="px-2 py-1 text-xs text-sidebar-foreground/50">文件夹为空</div>
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
