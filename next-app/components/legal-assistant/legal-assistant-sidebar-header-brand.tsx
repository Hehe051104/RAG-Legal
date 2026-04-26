"use client";

import { ScaleIcon } from "lucide-react";

export function LegalAssistantSidebarHeaderBrand() {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <div className="flex size-9 items-center justify-center rounded-lg border border-sidebar-border/70 bg-sidebar-accent/40 text-sidebar-accent-foreground">
        <ScaleIcon className="size-4.5" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold leading-5">法律助手</div>
        <div className="truncate text-xs text-sidebar-foreground/55 leading-5">ChatUI compatible shell</div>
      </div>
    </div>
  );
}
