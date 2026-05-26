"use client";

import { CopyIcon } from "lucide-react";

import { MessageResponse } from "@/components/ai-elements/message";
import { SparklesIcon } from "@/components/chat/icons";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LegalReferenceCard } from "./legal-reference-card";
import type { LegalReference } from "./api";

function formatTimestamp(iso: string) {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? ""
    : new Intl.DateTimeFormat("zh-CN", {
        hour: "2-digit",
        minute: "2-digit",
      }).format(date);
}

function ReferencesByType({ references }: { references: LegalReference[] }) {
  // 按文档类型分组
  const lawRefs = references.filter((r) => r.doc_type === "law");
  const interpRefs = references.filter((r) => r.doc_type === "interpretation");
  const caseRefs = references.filter((r) => r.doc_type === "case");

  const sections = [
    { title: "法律依据", refs: lawRefs, icon: "§" },
    { title: "司法解释", refs: interpRefs, icon: "释" },
    { title: "参考案例", refs: caseRefs, icon: "案" },
  ].filter((s) => s.refs.length > 0);

  return (
    <div className="mt-3 space-y-3">
      {sections.map((section) => (
        <div key={section.title}>
          <div className="mb-1.5 flex items-center gap-1.5">
            <span className="flex size-4 items-center justify-center rounded bg-primary/10 text-[10px] font-bold text-primary">
              {section.icon}
            </span>
            <span className="text-[11px] font-medium text-muted-foreground/80">
              {section.title}（{section.refs.length}条）
            </span>
          </div>
          <div className="space-y-1.5">
            {section.refs.map((ref) => (
              <LegalReferenceCard key={`${ref.source}-${ref.article}`} reference={ref} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

type LegalAssistantMessageBubbleProps = {
  role: "user" | "assistant";
  content: string;
  references?: LegalReference[];
  status?: "streaming" | "done" | "error";
  isError?: boolean;
  createdAt: string;
};

export function LegalAssistantMessageBubble({
  role,
  content,
  references,
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

              {references && references.length > 0 ? (
                <ReferencesByType references={references} />
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
