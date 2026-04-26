"use client";

import { getLegalAssistantConversationPreview } from "./legal-assistant-conversation-preview";
import { LegalAssistantSidebarItem } from "./legal-assistant-sidebar-item";

type UngroupedConversation = {
  id: string;
  title: string;
  messages: Array<{ content: string }>;
};

type LegalAssistantSidebarUngroupedProps = {
  conversations: UngroupedConversation[];
  selectedConversationId: string | null;
  onConversationRename: (conversationId: string) => void;
  onConversationDelete: (conversationId: string) => void;
  onSelectConversation: (conversationId: string) => void;
};

export function LegalAssistantSidebarUngrouped({
  conversations,
  selectedConversationId,
  onConversationRename,
  onConversationDelete,
  onSelectConversation,
}: LegalAssistantSidebarUngroupedProps) {
  const hasConversations = conversations.length > 0;

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between px-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-sidebar-foreground/60">
        <span>未归类会话</span>
        <span className="rounded-full border border-sidebar-border/60 bg-sidebar-accent px-2 py-0.5 text-[10px]">
          {conversations.length}
        </span>
      </div>

      <div className="space-y-1">
        {!hasConversations ? (
          <div className="rounded-lg border border-dashed border-sidebar-border/70 px-3 py-3 text-xs text-sidebar-foreground/55">
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
