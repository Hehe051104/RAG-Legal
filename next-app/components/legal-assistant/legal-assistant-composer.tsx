"use client";

import { useCallback, useMemo, useState } from "react";

import { useHome } from "./home-context";
import { LegalAssistantComposerInput } from "./legal-assistant-composer-input";

export function LegalAssistantComposer() {
  const { isSending, sendMessage } = useHome();
  const [input, setInput] = useState("");

  const hasText = useMemo(() => input.trim().length > 0, [input]);
  const canSubmit = hasText && !isSending;

  const handleSubmit = useCallback(() => {
    if (!canSubmit) {
      return;
    }

    void sendMessage(input);
    setInput("");
  }, [canSubmit, input, sendMessage]);

  return (
    <form
      className="rounded-2xl border border-border/30 bg-card/70 p-3 shadow-[var(--shadow-composer)] backdrop-blur transition-shadow duration-300 focus-within:shadow-[var(--shadow-composer-focus)]"
      data-testid="legal-assistant-composer"
      onSubmit={(event) => {
        event.preventDefault();
        handleSubmit();
      }}
    >
      <LegalAssistantComposerInput
        canSubmit={canSubmit}
        isSending={isSending}
        onChange={setInput}
        onSubmit={handleSubmit}
        value={input}
      />

      <div className="mt-2 px-1 text-[11px] text-muted-foreground/80">
        {isSending ? "正在生成回复..." : "Enter 发送，Shift+Enter 换行"}
      </div>
    </form>
  );
}
