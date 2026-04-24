"use client";

import { ScrollArea } from "@/components/ui/scroll-area";

import { LegalAssistantChatComposerShell } from "./legal-assistant-chat-composer-shell";
import { LegalAssistantChatTimeline } from "./legal-assistant-chat-timeline";

export function LegalAssistantChatFeed({
  messages,
  isSending,
  onQuickPrompt,
  messagesEndRef,
}: {
  messages: Array<{
    id: string;
    role: "user" | "assistant";
    content: string;
    createdAt: string;
    status?: "streaming" | "done" | "error";
    isError?: boolean;
  }>;
  isSending: boolean;
  onQuickPrompt: (prompt: string) => void;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <>
      <ScrollArea className="min-h-0 flex-1">
        <LegalAssistantChatTimeline
          isSending={isSending}
          messages={messages}
          messagesEndRef={messagesEndRef}
          onQuickPrompt={onQuickPrompt}
        />
      </ScrollArea>

      <LegalAssistantChatComposerShell />
    </>
  );
}
