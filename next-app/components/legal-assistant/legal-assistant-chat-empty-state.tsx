"use client";

import { WrenchIcon } from "lucide-react";

export function LegalAssistantChatEmptyState() {
  return (
    <div className="flex min-h-[58vh] flex-col items-center justify-center gap-6 text-center">
      <div className="max-w-2xl space-y-4">
        <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card px-3 py-1 text-xs text-muted-foreground shadow-sm">
          <WrenchIcon className="size-3.5" />
          最大程度重建的法律问答工作台
        </div>
        <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">你可以直接开始提问</h2>
        <p className="text-sm text-muted-foreground md:text-base">状态、历史、本地存储、文件夹、设置和流式响应已经统一到了这个页面里。</p>
      </div>
    </div>
  );
}
