"use client";

import { LegalAssistantSidebarHeaderBrand } from "./legal-assistant-sidebar-header-brand";
import { LegalAssistantSidebarHeaderClose } from "./legal-assistant-sidebar-header-close";

type LegalAssistantSidebarHeaderProps = {
  onClose: () => void;
};

export function LegalAssistantSidebarHeader({ onClose }: LegalAssistantSidebarHeaderProps) {
  return (
    <div className="flex items-center gap-2 border-b border-sidebar-border/70 px-3 py-2.5">
      <LegalAssistantSidebarHeaderBrand />
      <LegalAssistantSidebarHeaderClose onClose={onClose} />
    </div>
  );
}
