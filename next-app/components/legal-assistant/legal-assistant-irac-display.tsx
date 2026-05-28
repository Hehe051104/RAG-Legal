"use client";

import { useState } from "react";
import { ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import { MessageResponse } from "@/components/ai-elements/message";
import { cn } from "@/lib/utils";
import type { IracSections } from "./api";

const IRAC_STAGES = [
  {
    key: "issue",
    title: "法律争点",
    subtitle: "Issue",
    icon: "一",
    color: "border-l-blue-500",
    bg: "bg-blue-50/50 dark:bg-blue-950/20",
    iconBg: "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300",
    headerBg: "hover:bg-blue-100/50 dark:hover:bg-blue-900/30",
    description: "核心法律争议点",
  },
  {
    key: "rule",
    title: "法律规则",
    subtitle: "Rule",
    icon: "二",
    color: "border-l-emerald-500",
    bg: "bg-emerald-50/50 dark:bg-emerald-950/20",
    iconBg: "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300",
    headerBg: "hover:bg-emerald-100/50 dark:hover:bg-emerald-900/30",
    description: "适用的法律条文和司法解释",
  },
  {
    key: "application",
    title: "适用分析",
    subtitle: "Application",
    icon: "三",
    color: "border-l-amber-500",
    bg: "bg-amber-50/50 dark:bg-amber-950/20",
    iconBg: "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300",
    headerBg: "hover:bg-amber-100/50 dark:hover:bg-amber-900/30",
    description: "法律规则与事实的结合分析",
  },
  {
    key: "conclusion",
    title: "结论",
    subtitle: "Conclusion",
    icon: "四",
    color: "border-l-purple-500",
    bg: "bg-purple-50/50 dark:bg-purple-950/20",
    iconBg: "bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300",
    headerBg: "hover:bg-purple-100/50 dark:hover:bg-purple-900/30",
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
            className={cn(
              "rounded-lg border border-border/50 border-l-[3px] overflow-hidden transition-all",
              stage.color,
              stage.bg,
            )}
          >
            <button
              onClick={() => toggleSection(stage.key)}
              className={cn(
                "flex w-full items-center gap-2 px-3 py-2 transition-colors",
                stage.headerBg,
              )}
            >
              <span
                className={cn(
                  "flex size-5 items-center justify-center rounded text-[11px] font-bold shrink-0",
                  stage.iconBg,
                )}
              >
                {stage.icon}
              </span>
              <div className="flex flex-col items-start flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[13px] font-semibold text-foreground/90">
                    {stage.title}
                  </span>
                  <span className="text-[10px] text-muted-foreground/50">
                    {stage.subtitle}
                  </span>
                </div>
                {!isExpanded && (
                  <span className="text-[10px] text-muted-foreground/50 truncate max-w-full">
                    {stage.description}
                  </span>
                )}
              </div>
              {isExpanded ? (
                <ChevronUpIcon className="size-3.5 text-muted-foreground/40 shrink-0" />
              ) : (
                <ChevronDownIcon className="size-3.5 text-muted-foreground/40 shrink-0" />
              )}
            </button>

            {isExpanded && (
              <div className="px-3 pb-3 pt-1">
                <div className="text-[13px] leading-[1.7] text-foreground/85">
                  <MessageResponse className="prose prose-sm max-w-none prose-p:my-1.5 prose-ul:my-1 prose-li:my-0.5 dark:prose-invert">
                    {content}
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
