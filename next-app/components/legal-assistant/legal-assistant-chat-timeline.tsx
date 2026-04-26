"use client";

import { LegalAssistantChatEmptyState } from "./legal-assistant-chat-empty-state";
import { LegalAssistantChatQuickPrompts } from "./legal-assistant-chat-quick-prompts";
import { LegalAssistantChatSendingIndicator } from "./legal-assistant-chat-sending-indicator";
import { LegalAssistantMessageBubble } from "./legal-assistant-message-bubble";

const quickPrompts = [
  "请总结《民法典》中合同无效的核心判断要点。",
  "请给出侵权责任纠纷的法律分析提纲。",
  "请比较保证责任与抵押担保的关键差异。",
  "请列出探望权纠纷中常见的裁判思路。",
];

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  status?: "streaming" | "done" | "error";
  isError?: boolean;
};

type LegalAssistantChatTimelineProps = {
  messages: ChatMessage[];
  isSending: boolean;
  onQuickPrompt: (prompt: string) => void;
};

export function LegalAssistantChatTimeline({
  messages,
  isSending,
  onQuickPrompt,
}: LegalAssistantChatTimelineProps) {
  const hasMessages = messages.length > 0;

  return (
    <div className="flex min-h-full w-full flex-col gap-5 md:gap-7">
      {hasMessages ? (
        messages.map((message) => (
          <LegalAssistantMessageBubble
            content={message.content}
            createdAt={message.createdAt}
            isError={message.isError}
            key={message.id}
            role={message.role}
            status={message.status}
          />
        ))
      ) : (
        <div className="flex w-full flex-col gap-6 py-2 md:gap-7">
          <LegalAssistantChatEmptyState />
          <LegalAssistantChatQuickPrompts onQuickPrompt={onQuickPrompt} prompts={quickPrompts} />
        </div>
      )}

      {isSending ? <LegalAssistantChatSendingIndicator /> : null}
    </div>
  );
}
