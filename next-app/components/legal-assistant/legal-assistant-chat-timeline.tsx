"use client";

import { LegalAssistantMessageBubble } from "./legal-assistant-message-bubble";
import { LegalAssistantChatEmptyState } from "./legal-assistant-chat-empty-state";
import { LegalAssistantChatQuickPrompts } from "./legal-assistant-chat-quick-prompts";
import { LegalAssistantChatSendingIndicator } from "./legal-assistant-chat-sending-indicator";

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

export function LegalAssistantChatTimeline({
  messages,
  isSending,
  onQuickPrompt,
  messagesEndRef,
}: {
  messages: ChatMessage[];
  isSending: boolean;
  onQuickPrompt: (prompt: string) => void;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <div className="mx-auto flex min-h-full w-full max-w-4xl flex-col gap-6 px-4 py-6 md:gap-7 md:px-6">
      {messages.length ? (
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
        <>
          <LegalAssistantChatEmptyState />
          <LegalAssistantChatQuickPrompts onQuickPrompt={onQuickPrompt} prompts={quickPrompts} />
        </>
      )}

      {isSending ? (
        <LegalAssistantChatSendingIndicator />
      ) : null}

      <div ref={messagesEndRef} />
    </div>
  );
}
