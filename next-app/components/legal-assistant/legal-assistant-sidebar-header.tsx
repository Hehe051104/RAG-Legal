"use client";

import { LegalAssistantSidebarHeaderBrand } from "./legal-assistant-sidebar-header-brand";
import { LegalAssistantSidebarHeaderClose } from "./legal-assistant-sidebar-header-close";

export function LegalAssistantSidebarHeader({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex items-center gap-3 border-b-2 border-sidebar-border/70 px-3 py-3">
      <LegalAssistantSidebarHeaderBrand />
      <LegalAssistantSidebarHeaderClose onClose={onClose} />
    </div>
  );
}
