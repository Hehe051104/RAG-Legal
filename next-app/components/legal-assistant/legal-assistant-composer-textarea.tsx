"use client";

import { Textarea } from "@/components/ui/textarea";

type LegalAssistantComposerTextareaProps = {
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onKeyDown?: (event: React.KeyboardEvent) => void;
};

export function LegalAssistantComposerTextarea({
  value,
  disabled,
  onChange,
  onSubmit,
  onKeyDown,
}: LegalAssistantComposerTextareaProps) {
  return (
    <Textarea
      aria-label="法律助手输入框"
      className="min-h-[56px] max-h-44 flex-1 resize-none border-0 bg-transparent px-1 py-2 text-[14px] leading-relaxed shadow-none placeholder:text-muted-foreground/35 focus-visible:ring-0"
      data-testid="legal-assistant-composer-textarea"
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
      onKeyDown={(event) => {
        onKeyDown?.(event);
        if (event.defaultPrevented) {
          return;
        }

        if (
          event.key === "Enter" &&
          !event.shiftKey &&
          !event.nativeEvent.isComposing
        ) {
          event.preventDefault();

          if (!disabled) {
            onSubmit();
          }
        }
      }}
      placeholder="输入你的法律问题..."
      value={value}
    />
  );
}
