"use client";

import { useState } from "react";
import { ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import { MessageResponse } from "@/components/ai-elements/message";
import { cn } from "@/lib/utils";
import type { IracSections } from "./api";

/** 将文本转为可分段的 Markdown */
function normalizeText(text: string): string {
  let t = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  t = t
    .replace(/(。)(?=[^\n])/g, "$1\n\n")
    .replace(/(！)(?=[^\n])/g, "$1\n\n")
    .replace(/(？)(?=[^\n])/g, "$1\n\n")
    .replace(/(；)(?=[^\n])/g, "$1\n\n");
  t = t.replace(/([^\n])(##\s)/g, "$1\n\n$2");
  t = t.replace(/([^\n])([一二三四五六七八九十]+、)/g, "$1\n\n$2");
  t = t.replace(/\n{3,}/g, "\n\n");
  return t.trim();
}

const IRAC_STAGES = [
  {
    key: "issue",
    title: "法律争点",
    icon: "一",
    description: "核心法律争议点",
  },
  {
    key: "rule",
    title: "法律规则",
    icon: "二",
    description: "适用的法律条文和司法解释",
  },
  {
    key: "application",
    title: "适用分析",
    icon: "三",
    description: "法律规则与事实的结合分析",
  },
  {
    key: "conclusion",
    title: "结论",
    subtitle: "Conclusion",
    icon: "四",
    description: "法律意见和行动建议",
  },
] as const;

type IracDisplayProps = {
  irac: IracSections;
  className?: string;
};

export function IracDisplay({ irac, className }: IracDisplayProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    issue: true,
    rule: true,
    application: true,
    conclusion: true,
  });

  const toggleSection = (key: string) => {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const expandAll = () => {
    setExpanded({ issue: true, rule: true, application: true, conclusion: true });
  };

  const collapseAll = () => {
    setExpanded({ issue: false, rule: false, application: false, conclusion: false });
  };

  const hasContent = IRAC_STAGES.some(
    (stage) => irac[stage.key as keyof IracSections]?.trim()
  );

  if (!hasContent) return null;

  return (
    <div className={cn("mt-3 space-y-2", className)}>
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium text-muted-foreground">
          IRAC 分析框架
        </span>
        <button
          onClick={expandAll}
          className="text-[10px] text-muted-foreground/60 hover:text-muted-foreground transition-colors"
        >
          全部展开
        </button>
      </div>

      {IRAC_STAGES.map((stage, index) => {
        const content = irac[stage.key as keyof IracSections];
        if (!content || !content.trim()) {
          return null;
        }

        const isExpanded = expanded[stage.key];
        const isLast = index === IRAC_STAGES.length - 1;

        return (
          <div
            key={stage.key}
            className="rounded-lg border border-border/40 overflow-hidden transition-all bg-card/50"
          >
            <button
              onClick={() => toggleSection(stage.key)}
              className="flex w-full items-center gap-2.5 px-3 py-2.5 transition-colors hover:bg-muted/30"
            >
              <span className="flex size-6 items-center justify-center rounded-md bg-primary/10 text-[11px] font-bold text-primary shrink-0">
                {stage.icon}
              </span>
              <div className="flex flex-col items-start flex-1 min-w-0">
                <span className="text-[14px] font-semibold text-foreground">
                  {stage.title}
                </span>
                {!isExpanded && (
                  <span className="text-[11px] text-muted-foreground/50 truncate max-w-full">
                    {stage.description}
                  </span>
                )}
              </div>
              {isExpanded ? (
                <ChevronUpIcon className="size-4 text-muted-foreground/40 shrink-0" />
              ) : (
                <ChevronDownIcon className="size-4 text-muted-foreground/40 shrink-0" />
              )}
            </button>

            {isExpanded && (
              <div className="px-3 pb-3 pt-1 border-t border-border/20">
                <div className="text-[14px] leading-[1.8] text-foreground/85">
                  <MessageResponse className="prose prose-sm max-w-none prose-p:my-2.5 prose-p:leading-[1.8] prose-p:text-[14px] prose-ul:my-1.5 prose-li:my-0.5 prose-li:leading-[1.65] prose-strong:font-semibold dark:prose-invert">
                    {normalizeText(content)}
                  </MessageResponse>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
