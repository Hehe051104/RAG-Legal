"use client";

import { CopyIcon, SearchIcon, ChevronDownIcon, ChevronUpIcon, Volume2Icon, Loader2Icon } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";

import { MessageResponse } from "@/components/ai-elements/message";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { SparklesIcon } from "@/components/chat/icons";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getApiUrl } from "@/lib/api-url";
import { LegalReferenceCard } from "./legal-reference-card";
import { synthesizeSpeech } from "./api";
import type { IracSections, LegalReference } from "./api";
import { IracDisplay } from "./legal-assistant-irac-display";
import { useHome } from "./home-context";

/**
 * 将后端返回的文本转为标准 Markdown，确保正确分段。
 */
function normalizeMarkdown(text: string): string {
  // 统一换行符
  let t = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  // 在中文标点后加段落分隔（如果后面紧跟非换行字符）
  t = t
    .replace(/(。)(?=[^\n])/g, "$1\n\n")
    .replace(/(！)(?=[^\n])/g, "$1\n\n")
    .replace(/(？)(?=[^\n])/g, "$1\n\n")
    .replace(/(：)(?=[^\n])/g, "$1\n\n");

  // 在 ## 标题前加换行（不管前面有没有 \n）
  t = t.replace(/([^\n])(##\s)/g, "$1\n\n$2");

  // 在 "一、" "二、" 等中文数字标题前加换行
  t = t.replace(/([^\n])([一二三四五六七八九十]+、)/g, "$1\n\n$2");

  // 清理多余空行
  t = t.replace(/\n{3,}/g, "\n\n");

  return t.trim();
}

function formatTimestamp(iso: string) {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? ""
    : new Intl.DateTimeFormat("zh-CN", {
        hour: "2-digit",
        minute: "2-digit",
      }).format(date);
}

function SearchProcessBadge({ references }: { references: LegalReference[] }) {
  const [expanded, setExpanded] = useState(false);

  const lawCount = references.filter((r) => r.doc_type === "law").length;
  const interpCount = references.filter((r) => r.doc_type === "interpretation").length;
  const caseCount = references.filter((r) => r.doc_type === "case").length;
  const totalCount = references.length;

  const methods = [...new Set(references.map((r) => r.method).filter(Boolean))];

  return (
    <div className="mb-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 rounded-full border border-border/30 bg-muted/20 px-2.5 py-1 text-[10px] text-muted-foreground transition-colors hover:border-border/50 hover:bg-muted/40"
      >
        <SearchIcon className="size-3" />
        <span>检索到 {totalCount} 条依据</span>
        {expanded ? (
          <ChevronUpIcon className="size-3" />
        ) : (
          <ChevronDownIcon className="size-3" />
        )}
      </button>

      {expanded && (
        <div className="mt-1.5 rounded-lg border border-border/20 bg-muted/10 p-2.5 text-[10px]">
          <div className="flex flex-wrap gap-3">
            {lawCount > 0 && (
              <span className="text-blue-600 dark:text-blue-400">
                法律条文 ×{lawCount}
              </span>
            )}
            {interpCount > 0 && (
              <span className="text-purple-600 dark:text-purple-400">
                司法解释 ×{interpCount}
              </span>
            )}
            {caseCount > 0 && (
              <span className="text-amber-600 dark:text-amber-400">
                参考案例 ×{caseCount}
              </span>
            )}
          </div>
          {methods.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {methods.map((method) => (
                <span
                  key={method}
                  className="rounded-full bg-muted/50 px-2 py-0.5 text-[9px] text-muted-foreground"
                >
                  {method}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ReferencesByType({ references }: { references: LegalReference[] }) {
  const lawRefs = references.filter((r) => r.doc_type === "law");
  const interpRefs = references.filter((r) => r.doc_type === "interpretation");
  const caseRefs = references.filter((r) => r.doc_type === "case");

  const sections = [
    { title: "法律依据", refs: lawRefs, icon: "§", color: "text-blue-600 dark:text-blue-400" },
    { title: "司法解释", refs: interpRefs, icon: "释", color: "text-purple-600 dark:text-purple-400" },
    { title: "参考案例", refs: caseRefs, icon: "案", color: "text-amber-600 dark:text-amber-400" },
  ].filter((s) => s.refs.length > 0);

  if (sections.length === 0) return null;

  return (
    <div className="mt-3 space-y-3">
      <div className="flex items-center gap-1.5">
        <span className="text-[11px] font-medium text-muted-foreground">
          引用依据
        </span>
        <span className="rounded-full bg-muted/50 px-1.5 py-0.5 text-[9px] text-muted-foreground">
          {references.length}条
        </span>
      </div>
      {sections.map((section) => (
        <div key={section.title}>
          <div className="mb-1.5 flex items-center gap-1.5">
            <span className={cn("flex size-4 items-center justify-center rounded bg-primary/10 text-[10px] font-bold", section.color)}>
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
  irac?: IracSections;
  status?: "streaming" | "done" | "error";
  isError?: boolean;
  createdAt: string;
};

export function LegalAssistantMessageBubble({
  role,
  content,
  references,
  irac,
  status,
  isError,
  createdAt,
}: LegalAssistantMessageBubbleProps) {
  const isUser = role === "user";
  const timestamp = formatTimestamp(createdAt);
  const showStreaming = !isUser && !content && status === "streaming";
  const { authToken } = useHome();
  const [isSpeaking, setIsSpeaking] = useState(false);

  const handlePlayAudio = useCallback(async () => {
    if (isSpeaking || !content) return;
    setIsSpeaking(true);
    try {
      const result = await synthesizeSpeech(content.slice(0, 2000), authToken);
      const fullUrl = getApiUrl(result.audio_url);
      const audio = new Audio(fullUrl);
      audio.onended = () => setIsSpeaking(false);
      audio.onerror = () => {
        setIsSpeaking(false);
        toast.error("语音播放失败");
      };
      await audio.play();
      toast.success(`语音播报中（${result.text_length} 字）`);
    } catch (err) {
      setIsSpeaking(false);
      toast.error(err instanceof Error ? err.message : "语音合成失败");
    }
  }, [content, authToken, isSpeaking]);

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
          <div className="absolute -top-1.5 right-0 flex items-center gap-1 opacity-0 transition-opacity duration-150 group-hover/message:opacity-100">
            {!isUser && content && (
              <Button
                aria-label="语音播报"
                className="size-8 rounded-lg text-muted-foreground hover:text-foreground"
                disabled={isSpeaking}
                onClick={() => void handlePlayAudio()}
                size="icon-sm"
                type="button"
                variant="ghost"
              >
                {isSpeaking ? (
                  <Loader2Icon className="size-4 animate-spin" />
                ) : (
                  <Volume2Icon className="size-4" />
                )}
              </Button>
            )}
            <Button
              aria-label="复制消息"
              className="size-8 rounded-lg text-muted-foreground hover:text-foreground"
              onClick={() => {
                if (typeof navigator !== "undefined" && navigator.clipboard) {
                  void navigator.clipboard.writeText(content);
                  toast.success("已复制到剪贴板");
                }
              }}
              size="icon-sm"
              type="button"
              variant="ghost"
            >
              <CopyIcon className="size-4" />
            </Button>
          </div>

          {isUser ? (
            <div className="w-fit overflow-hidden break-words rounded-2xl rounded-br-lg border border-border/30 bg-gradient-to-br from-secondary to-muted px-4 py-2.5 shadow-[var(--shadow-card)]">
              <p className="whitespace-pre-wrap text-[14px] leading-[1.65]">{content}</p>
            </div>
          ) : (
            <div className={cn("text-[14px] leading-[1.75]", isError ? "text-destructive" : "text-foreground")}>
              {/* 过滤掉 JSON 原文（流式阶段 irac 未到达时 content 可能包含 JSON） */}
              {/* 有 irac 结构化数据时，只显示 IracDisplay */}
              {content && !irac && !content.trim().startsWith('{"') ? (
                <MessageResponse className="prose prose-sm max-w-none prose-p:my-2.5 prose-p:leading-[1.8] prose-p:text-[14px] prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5 prose-li:leading-[1.65] prose-pre:my-2 prose-headings:mb-2 prose-headings:mt-5 prose-headings:font-semibold prose-strong:font-semibold prose-hr:my-4 dark:prose-invert">
                  {normalizeMarkdown(content)}
                </MessageResponse>
              ) : null}

              {irac ? <IracDisplay irac={irac} /> : null}

              {references && references.length > 0 ? (
                <>
                  <SearchProcessBadge references={references} />
                  <ReferencesByType references={references} />
                </>
              ) : null}

              {showStreaming && (
                <div className="flex items-center gap-2">
                  <Shimmer className="text-sm" duration={2.5}>
                    正在分析法律问题...
                  </Shimmer>
                </div>
              )}

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
