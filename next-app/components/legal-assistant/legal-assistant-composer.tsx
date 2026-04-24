import { useState } from "react";

import { useHome } from "./home-context";
import { LegalAssistantComposerInput } from "./legal-assistant-composer-input";

export function LegalAssistantComposer() {
  const { isSending, sendMessage } = useHome();
  const [input, setInput] = useState("");

  const canSend = input.trim().length > 0 && !isSending;

  return (
    <form
      className="rounded-[28px] border border-border/60 bg-card/95 p-3 shadow-[var(--shadow-composer)] backdrop-blur"
      onSubmit={(event) => {
        event.preventDefault();
        if (!canSend) {
          return;
        }

        void sendMessage(input);
        setInput("");
      }}
    >
      <LegalAssistantComposerInput
        disabled={!canSend}
        onChange={setInput}
        onSubmit={() => {
          void sendMessage(input);
          setInput("");
        }}
        value={input}
      />
    </form>
  );
}
