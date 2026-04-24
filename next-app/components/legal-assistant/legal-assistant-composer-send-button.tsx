"use client";

import { ArrowDownIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

export function LegalAssistantComposerSendButton({ disabled, onSubmit }: { disabled: boolean; onSubmit: () => void }) {
  return (
    <Button className="h-12 w-12 rounded-2xl" disabled={disabled} type="button" onClick={onSubmit}>
      <ArrowDownIcon className="size-4 -rotate-90" />
    </Button>
  );
}
