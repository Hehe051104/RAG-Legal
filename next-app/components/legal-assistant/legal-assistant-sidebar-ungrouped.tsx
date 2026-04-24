"use client";

import { getLegalAssistantConversationPreview } from "./legal-assistant-conversation-preview";
import { LegalAssistantSidebarItem } from "./legal-assistant-sidebar-item";

export function LegalAssistantSidebarUngrouped({
  conversations,
  selectedConversationId,
  onConversationRename,
  onConversationDelete,
  onSelectConversation,
}: {
  conversations: Array<{ id: string; title: string; messages: Array<{ content: string }> }>;
  selectedConversationId: string | null;
  onConversationRename: (conversationId: string) => void;
  onConversationDelete: (conversationId: string) => void;
  onSelectConversation: (conversationId: string) => void;
}) {
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between px-2 text-xs font-semibold uppercase tracking-[0.12em] text-sidebar-foreground/55">
        <span>未归类</span>
        <span>{conversations.length}</span>
      </div>
      <div className="space-y-1">
        {conversations.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-sidebar-border/70 px-3 py-4 text-sm text-sidebar-foreground/55">
            新对话会先显示在这里。
          </div>
        ) : (
          conversations.map((conversation) => (
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
    </section>
  );
}
