"use client";

import { LegalAssistantChatTimeline } from "./legal-assistant-chat-timeline";

type ChatFeedMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  status?: "streaming" | "done" | "error";
  isError?: boolean;
};

type LegalAssistantChatFeedProps = {
  messages: ChatFeedMessage[];
  isSending: boolean;
  onQuickPrompt: (prompt: string) => void;
  messagesStartRef: React.Ref<HTMLDivElement>;
  messagesEndRef: React.Ref<HTMLDivElement>;
  scrollContainerRef: React.Ref<HTMLDivElement>;
  onScroll?: (event: React.UIEvent<HTMLDivElement>) => void;
};

export function LegalAssistantChatFeed({
  messages,
  isSending,
  onQuickPrompt,
  messagesStartRef,
  messagesEndRef,
  scrollContainerRef,
  onScroll,
}: LegalAssistantChatFeedProps) {
  return (
    <div className="relative flex min-h-0 flex-1 border-b bg-background">
      <div
        className="absolute inset-0 touch-pan-y overflow-y-auto"
        onScroll={onScroll}
        ref={scrollContainerRef}
      >
        <div className="mx-auto flex min-h-full w-full max-w-4xl flex-col px-2 py-6 md:px-4" ref={messagesStartRef}>
          <LegalAssistantChatTimeline
            isSending={isSending}
            messages={messages}
            onQuickPrompt={onQuickPrompt}
          />

          <div className="min-h-[24px] min-w-[24px] shrink-0" ref={messagesEndRef} />
        </div>
      </div>
    </div>
  );
}
