"use client";

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
  },
  {
    key: "rule",
    title: "法律规则",
    subtitle: "Rule",
    icon: "二",
    color: "border-l-emerald-500",
    bg: "bg-emerald-50/50 dark:bg-emerald-950/20",
    iconBg: "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300",
  },
  {
    key: "application",
    title: "适用分析",
    subtitle: "Application",
    icon: "三",
    color: "border-l-amber-500",
    bg: "bg-amber-50/50 dark:bg-amber-950/20",
    iconBg: "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300",
  },
  {
    key: "conclusion",
    title: "结论",
    subtitle: "Conclusion",
    icon: "四",
    color: "border-l-purple-500",
    bg: "bg-purple-50/50 dark:bg-purple-950/20",
    iconBg: "bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300",
  },
] as const;

type IracDisplayProps = {
  irac: IracSections;
  className?: string;
};

export function IracDisplay({ irac, className }: IracDisplayProps) {
  return (
    <div className={cn("mt-3 space-y-3", className)}>
      {IRAC_STAGES.map((stage) => {
        const content = irac[stage.key as keyof IracSections];
        if (!content || !content.trim()) {
          return null;
        }

        return (
          <div
            key={stage.key}
            className={cn(
              "rounded-lg border border-border/60 border-l-[3px] p-3",
              stage.color,
              stage.bg,
            )}
          >
            <div className="mb-2 flex items-center gap-2">
              <span
                className={cn(
                  "flex size-5 items-center justify-center rounded text-[11px] font-bold",
                  stage.iconBg,
                )}
              >
                {stage.icon}
              </span>
              <span className="text-[13px] font-semibold text-foreground/90">
                {stage.title}
              </span>
              <span className="text-[10px] text-muted-foreground/60">
                {stage.subtitle}
              </span>
            </div>
            <div className="text-[13px] leading-[1.7] text-foreground/85">
              <MessageResponse className="prose prose-sm max-w-none prose-p:my-1.5 prose-ul:my-1 prose-li:my-0.5 dark:prose-invert">
                {content}
              </MessageResponse>
            </div>
          </div>
        );
      })}
    </div>
  );
}
