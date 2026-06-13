"use client";

import { ArrowDownIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "../ui/button";
import { LegalAssistantChatTimeline } from "./legal-assistant-chat-timeline";
import type { IracSections, LegalReference } from "./api";

type ChatFeedMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  references?: LegalReference[];
  irac?: IracSections;
  createdAt: string;
  status?: "streaming" | "done" | "error";
  isError?: boolean;
};

type LegalAssistantChatFeedProps = {
  messages: ChatFeedMessage[];
  isSending: boolean;
  onQuickPrompt: (prompt: string) => void;
  messagesStartRef?: React.Ref<HTMLDivElement>;
  messagesEndRef: React.Ref<HTMLDivElement>;
  scrollContainerRef: React.Ref<HTMLDivElement>;
  onScroll?: (event: React.UIEvent<HTMLDivElement>) => void;
  isAtBottom?: boolean;
  scrollToBottom?: (behavior?: ScrollBehavior) => void;
};

export function LegalAssistantChatFeed({
  messages,
  isSending,
  onQuickPrompt,
  messagesStartRef,
  messagesEndRef,
  scrollContainerRef,
  onScroll,
  isAtBottom = true,
  scrollToBottom,
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

      <AnimatePresence>
        {!isAtBottom && scrollToBottom && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2"
          >
            <Button
              size="icon"
              variant="outline"
              className="rounded-full shadow-md"
              onClick={() => scrollToBottom("smooth")}
            >
              <ArrowDownIcon size={16} />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
