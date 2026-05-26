"use client";

import { ChevronDownIcon, ChevronUpIcon, ScaleIcon, BookOpenIcon, BriefcaseIcon, FileTextIcon } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import type { LegalReference } from "./api";

function ScoreBadge({ score }: { score: number }) {
  const percent = Math.min(100, Math.max(0, Math.round((score / 10) * 100)));
  const label = score >= 999 ? "精准匹配" : `${percent}%`;
  const color =
    score >= 999
      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
      : score >= 2
        ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
        : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300";

  return (
    <span className={cn("inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium", color)}>
      {label}
    </span>
  );
}

function DocTypeBadge({ docType }: { docType?: string }) {
  const config = {
    law: {
      label: "法律条文",
      icon: BookOpenIcon,
      color: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800",
    },
    interpretation: {
      label: "司法解释",
      icon: FileTextIcon,
      color: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800",
    },
    case: {
      label: "参考案例",
      icon: BriefcaseIcon,
      color: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800",
    },
  };

  const { label, icon: Icon, color } = config[docType as keyof typeof config] || config.law;

  return (
    <span className={cn("inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium", color)}>
      <Icon className="size-3" />
      {label}
    </span>
  );
}

export function LegalReferenceCard({ reference }: { reference: LegalReference }) {
  const [expanded, setExpanded] = useState(false);
  const contentPreview = reference.content.length > 120 && !expanded
    ? `${reference.content.slice(0, 120)}...`
    : reference.content;

  const hierarchy = reference.hierarchy;
  const pathParts = [hierarchy?.book, hierarchy?.chapter, hierarchy?.section].filter(Boolean);
  const pathStr = pathParts.length > 0 ? ` > ${pathParts.join(" > ")}` : "";

  // 根据文档类型设置不同的左边框颜色
  const borderColor = {
    law: "border-l-blue-500",
    interpretation: "border-l-purple-500",
    case: "border-l-amber-500",
  }[reference.doc_type || "law"] || "border-l-gray-300";

  return (
    <div className={cn(
      "rounded-lg border border-border/30 bg-card/70 shadow-[var(--shadow-card)] transition-colors hover:border-border/50 border-l-2",
      borderColor
    )}>
      <button
        className="flex w-full items-start gap-2.5 px-3 py-2.5 text-left"
        onClick={() => setExpanded(!expanded)}
        type="button"
      >
        <div className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded bg-primary/10 text-primary">
          <ScaleIcon className="size-3" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <DocTypeBadge docType={reference.doc_type} />
            <span className="truncate text-[12px] font-medium text-foreground">
              《{reference.source}》
            </span>
            <span className="shrink-0 text-[11px] text-muted-foreground">
              {reference.article}
            </span>
            <ScoreBadge score={reference.score} />
          </div>

          {pathStr ? (
            <p className="mt-0.5 truncate text-[10px] text-muted-foreground/70">
              路径：{reference.source}{pathStr}
            </p>
          ) : null}

          {!expanded ? (
            <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">
              {contentPreview}
            </p>
          ) : null}
        </div>

        <div className="mt-0.5 shrink-0 text-muted-foreground/60">
          {expanded ? <ChevronUpIcon className="size-3.5" /> : <ChevronDownIcon className="size-3.5" />}
        </div>
      </button>

      {expanded ? (
        <div className="border-t border-border/20 px-3 py-2.5">
          <p className="whitespace-pre-wrap text-[12px] leading-relaxed text-foreground/90">
            {reference.content}
          </p>
          {reference.method ? (
            <p className="mt-2 text-[10px] text-muted-foreground/60">
              召回方式：{reference.method}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
