"use client";

import { CopyIcon } from "lucide-react";

import { MessageResponse } from "@/components/ai-elements/message";
import { SparklesIcon } from "@/components/chat/icons";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function formatTimestamp(iso: string) {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? ""
    : new Intl.DateTimeFormat("zh-CN", {
        hour: "2-digit",
        minute: "2-digit",
      }).format(date);
}

type LegalAssistantMessageBubbleProps = {
  role: "user" | "assistant";
  content: string;
  status?: "streaming" | "done" | "error";
  isError?: boolean;
  createdAt: string;
};

export function LegalAssistantMessageBubble({
  role,
  content,
  status,
  isError,
  createdAt,
}: LegalAssistantMessageBubbleProps) {
  const isUser = role === "user";
  const timestamp = formatTimestamp(createdAt);
  const showStreaming = !isUser && !content && status === "streaming";

  return (
    <div className="group/message w-full">
      <div className={cn(isUser ? "flex flex-col items-end gap-2" : "flex items-start gap-3")}>
        {!isUser ? (
          <div className="flex h-[calc(13px*1.65)] shrink-0 items-center">
            <div className="flex size-7 items-center justify-center rounded-lg bg-muted/60 text-muted-foreground ring-1 ring-border/50">
              <SparklesIcon size={13} />
            </div>
          </div>
        ) : null}

        <div className={cn("relative min-w-0", isUser ? "max-w-[min(80%,56ch)]" : "flex-1")}>
          <div className="absolute -top-1 right-0 opacity-0 transition-opacity group-hover/message:opacity-100">
            <Button
              aria-label="复制消息"
              className="size-7 rounded-md text-muted-foreground hover:text-foreground"
              onClick={() => {
                if (typeof navigator !== "undefined" && navigator.clipboard) {
                  void navigator.clipboard.writeText(content);
                }
              }}
              size="icon-sm"
              type="button"
              variant="ghost"
            >
              <CopyIcon className="size-3.5" />
            </Button>
          </div>

          {isUser ? (
            <div className="w-fit overflow-hidden break-words rounded-2xl rounded-br-lg border border-border/30 bg-gradient-to-br from-secondary to-muted px-3.5 py-2 shadow-[var(--shadow-card)]">
              <p className="whitespace-pre-wrap text-[13px] leading-[1.65]">{content}</p>
            </div>
          ) : (
            <div className={cn("text-[13px] leading-[1.65]", isError ? "text-destructive" : "text-foreground")}>
              {content ? (
                <MessageResponse className="prose prose-sm max-w-none prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-pre:my-2 dark:prose-invert">
                  {content}
                </MessageResponse>
              ) : null}

              {showStreaming ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span className="size-2 rounded-full bg-current animate-pulse" />
                  <span className="size-2 rounded-full bg-current animate-pulse [animation-delay:150ms]" />
                  <span className="size-2 rounded-full bg-current animate-pulse [animation-delay:300ms]" />
                  <span className="text-xs">正在生成回复...</span>
                </div>
              ) : null}

              {!content && !showStreaming ? <p className="whitespace-pre-wrap">{content}</p> : null}
            </div>
          )}

          {timestamp ? (
            <div className={cn("mt-1 text-[10px] text-muted-foreground/70", isUser ? "text-right" : "text-left")}>
              {timestamp}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
