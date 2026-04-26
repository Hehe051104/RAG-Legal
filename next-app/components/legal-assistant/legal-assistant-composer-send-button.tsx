"use client";

import { ArrowUpIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type LegalAssistantComposerSendButtonProps = {
  disabled: boolean;
  onSubmit: () => void;
};

export function LegalAssistantComposerSendButton({
  disabled,
  onSubmit,
}: LegalAssistantComposerSendButtonProps) {
  return (
    <Button
      aria-label="发送消息"
      className={cn(
        "h-7 w-7 rounded-xl transition-all duration-200",
        disabled
          ? "cursor-not-allowed bg-muted text-muted-foreground/25"
          : "bg-foreground text-background hover:opacity-85 active:scale-95",
      )}
      data-testid="legal-assistant-send-button"
      disabled={disabled}
      onClick={onSubmit}
      type="button"
      variant="secondary"
    >
      <ArrowUpIcon className="size-4" />
    </Button>
  );
}
