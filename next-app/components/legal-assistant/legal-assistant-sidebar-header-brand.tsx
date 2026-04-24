"use client";

import { LayoutGridIcon } from "lucide-react";

export function LegalAssistantSidebarHeaderBrand() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex size-10 items-center justify-center rounded-2xl bg-sidebar-accent text-sidebar-accent-foreground shadow-sm">
        <LayoutGridIcon className="size-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold">法律顾问</div>
        <div className="truncate text-xs text-sidebar-foreground/55">chatbot-ui 风格重建</div>
      </div>
    </div>
  );
}
