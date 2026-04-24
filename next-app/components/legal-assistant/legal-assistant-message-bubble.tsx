"use client";

import { MessageResponse } from "@/components/ai-elements/message";
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

export function LegalAssistantMessageBubble({
  role,
  content,
  status,
  isError,
  createdAt,
}: {
  role: "user" | "assistant";
  content: string;
  status?: "streaming" | "done" | "error";
  isError?: boolean;
  createdAt: string;
}) {
  const isUser = role === "user";

  return (
    <div className={cn("flex w-full justify-center", isUser ? "" : "bg-secondary")}> 
      <div className="relative flex w-full flex-col p-6 sm:w-[550px] sm:px-0 md:w-[650px] lg:w-[650px] xl:w-[700px]">
        <div className="space-y-3">
          <div className="flex items-center space-x-3">
            <div
              className={cn(
                "size-8 rounded-full border p-1",
                isUser ? "border-border bg-background text-foreground" : "border-primary bg-primary text-primary-foreground",
                isError && !isUser ? "border-destructive bg-destructive text-destructive-foreground" : "",
              )}
            >
              <span className="flex h-full w-full items-center justify-center text-[10px] font-semibold">
                {isUser ? "你" : "AI"}
              </span>
            </div>

            <div className="font-semibold">{isUser ? "你" : "助手"}</div>

            <div className="ml-auto text-[11px] uppercase tracking-[0.12em] text-muted-foreground/70">
              {formatTimestamp(createdAt)}
            </div>
          </div>

          <div
            className={cn(
              "rounded-3xl border px-4 py-3 text-sm leading-7 shadow-sm",
              isUser
                ? "border-transparent bg-foreground text-background"
                : isError
                  ? "border-destructive/25 bg-destructive/10 text-destructive"
                  : "border-border/60 bg-card text-card-foreground",
            )}
          >
            {isUser ? (
              <p className="whitespace-pre-wrap">{content}</p>
            ) : content ? (
              <MessageResponse className="prose prose-sm max-w-none prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-pre:my-2 dark:prose-invert">
                {content}
              </MessageResponse>
            ) : status === "streaming" ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <span className="size-2 rounded-full bg-current animate-pulse" />
                <span className="size-2 rounded-full bg-current animate-pulse [animation-delay:150ms]" />
                <span className="size-2 rounded-full bg-current animate-pulse [animation-delay:300ms]" />
                <span className="text-xs">正在生成回复…</span>
              </div>
            ) : (
              <p className="whitespace-pre-wrap">{content}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
