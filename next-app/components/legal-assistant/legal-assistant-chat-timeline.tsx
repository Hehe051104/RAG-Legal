"use client";

import { LegalAssistantChatEmptyState } from "./legal-assistant-chat-empty-state";
import { LegalAssistantChatQuickPrompts } from "./legal-assistant-chat-quick-prompts";
import { LegalAssistantChatSendingIndicator } from "./legal-assistant-chat-sending-indicator";
import { LegalAssistantMessageBubble } from "./legal-assistant-message-bubble";
import type { LegalReference } from "./api";

const quickPrompts = [
  "公司以末位淘汰为由辞退员工，是否合法？",
  "网购商品与描述不符，如何维权并要求赔偿？",
  "交通事故中对方全责，可以主张哪些赔偿项目？",
  "婚前房产婚后共同还贷，离婚时如何分割？",
];

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  references?: LegalReference[];
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
            references={message.references}
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
