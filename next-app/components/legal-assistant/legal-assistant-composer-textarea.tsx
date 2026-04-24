"use client";

import { Textarea } from "@/components/ui/textarea";

export function LegalAssistantComposerTextarea({
  value,
  disabled,
  onChange,
  onSubmit,
}: {
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
  onSubmit: () => void;
}) {
  return (
    <Textarea
      className="min-h-[70px] max-h-44 flex-1 resize-none rounded-[22px] border-border/60 bg-background px-4 py-3 text-sm shadow-none focus-visible:ring-0"
      onChange={(event) => onChange(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === "Enter" && !event.shiftKey) {
          event.preventDefault();
          if (!disabled) {
            onSubmit();
          }
        }
      }}
      placeholder="输入你的法律问题，Enter 发送，Shift+Enter 换行"
      value={value}
    />
  );
}
