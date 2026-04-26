"use client";

import { SparklesIcon } from "@/components/chat/icons";

export function LegalAssistantChatSendingIndicator() {
  return (
    <div className="flex w-full items-start gap-3">
      <div className="flex h-[calc(13px*1.65)] shrink-0 items-center">
        <div className="flex size-7 items-center justify-center rounded-lg bg-muted/60 text-muted-foreground ring-1 ring-border/50">
          <SparklesIcon size={13} />
        </div>
      </div>

      <div className="flex h-[calc(13px*1.65)] items-center text-[13px] leading-[1.65]">
        <span className="text-muted-foreground">助手正在思考...</span>
      </div>
    </div>
  );
}
