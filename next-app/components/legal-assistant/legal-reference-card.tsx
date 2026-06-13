"use client";

import { ChevronDownIcon, ChevronUpIcon, ScaleIcon, BookOpenIcon, BriefcaseIcon, FileTextIcon, CopyIcon, CheckIcon } from "lucide-react";
import { useState } from "react";
import type { LegalReference } from "./api";

function ScoreBadge({ score }: { score: number }) {
  const percent = Math.min(100, Math.max(0, Math.round((score / 10) * 100)));
  const label = score >= 999 ? "精准匹配" : `${percent}%`;

  return (
    <span className="inline-flex items-center rounded-md bg-muted/60 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
      {label}
    </span>
  );
}

function DocTypeBadge({ docType }: { docType?: string }) {
  const config = {
    law: { label: "法律条文", icon: BookOpenIcon },
    interpretation: { label: "司法解释", icon: FileTextIcon },
    case: { label: "参考案例", icon: BriefcaseIcon },
  };

  const { label, icon: Icon } = config[docType as keyof typeof config] || config.law;

  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-border/40 bg-muted/30 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
      <Icon className="size-3" />
      {label}
    </span>
  );
}

export function LegalReferenceCard({ reference }: { reference: LegalReference }) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const contentPreview = reference.content.length > 120 && !expanded
    ? `${reference.content.slice(0, 120)}...`
    : reference.content;

  const hierarchy = reference.hierarchy;
  const pathParts = [hierarchy?.book, hierarchy?.chapter, hierarchy?.section].filter(Boolean);
  const pathStr = pathParts.length > 0 ? pathParts.join(" > ") : "";

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const text = `《${reference.source}》${reference.article}\n${reference.content}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  return (
    <div className="rounded-lg border border-border/30 bg-card/50 shadow-sm transition-all hover:border-border/50 hover:shadow-md">
      <div
        className="flex w-full cursor-pointer items-start gap-2.5 px-3 py-2.5 text-left"
        onClick={() => setExpanded(!expanded)}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setExpanded(!expanded); } }}
        role="button"
        tabIndex={0}
      >
        <div className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded bg-primary/10 text-primary">
          <ScaleIcon className="size-3" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <DocTypeBadge docType={reference.doc_type} />
            <span className="truncate text-[13px] font-medium text-foreground">
              《{reference.source}》
            </span>
            <span className="shrink-0 text-[11px] text-muted-foreground">
              {reference.article}
            </span>
            <ScoreBadge score={reference.score} />
          </div>

          {pathStr && (
            <p className="mt-0.5 truncate text-[10px] text-muted-foreground/70">
              {reference.source} &gt; {pathStr}
            </p>
          )}

          {!expanded && (
            <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">
              {contentPreview}
            </p>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {expanded && (
            <button
              onClick={handleCopy}
              className="rounded p-1 text-muted-foreground/40 hover:text-muted-foreground hover:bg-muted/50 transition-colors"
              title="复制引用"
            >
              {copied ? (
                <CheckIcon className="size-3 text-emerald-500" />
              ) : (
                <CopyIcon className="size-3" />
              )}
            </button>
          )}
          <div className="text-muted-foreground/60">
            {expanded ? <ChevronUpIcon className="size-3.5" /> : <ChevronDownIcon className="size-3.5" />}
          </div>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-border/20 px-3 py-2.5">
          <div className="whitespace-pre-wrap text-[13px] leading-[1.75] text-foreground/90">
            {reference.content}
          </div>
          <div className="mt-2.5 flex items-center justify-between text-[10px] text-muted-foreground/50">
            <span>召回方式：{reference.method || "未知"}</span>
            {reference.doc_type === "case" && (
              <span className="flex items-center gap-1">
                <BriefcaseIcon className="size-3" />
                案例参考
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
