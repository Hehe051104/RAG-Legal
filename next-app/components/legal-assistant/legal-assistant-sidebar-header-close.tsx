"use client";

import { MenuIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

export function LegalAssistantSidebarHeaderClose({ onClose }: { onClose: () => void }) {
  return (
    <Button className="size-9 rounded-full" onClick={onClose} size="icon-sm" variant="ghost" type="button">
      <MenuIcon className="size-4" />
    </Button>
  );
}
