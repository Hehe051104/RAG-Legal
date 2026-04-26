"use client";

import { ScaleIcon } from "lucide-react";

export function LegalAssistantChatEmptyState() {
  return (
    <div className="flex w-full flex-col items-center px-4 text-center">
      <div className="space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/60 px-3 py-1 text-[11px] text-muted-foreground shadow-[var(--shadow-card)]">
          <ScaleIcon className="size-3.5" />
          Legal Assistant Workspace
        </div>

        <h2 className="font-semibold text-2xl tracking-tight text-foreground md:text-3xl">
          直接开始法律问答
        </h2>

        <p className="mx-auto max-w-2xl text-muted-foreground/80 text-sm">
          可以询问法条解释、裁判思路、争议要点和案件分析提纲。
        </p>
      </div>
    </div>
  );
}
