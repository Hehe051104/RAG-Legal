"use client";

import { LegalAssistantComposer } from "./legal-assistant-composer";

export function LegalAssistantChatComposerShell() {
  return (
    <div className="mx-auto w-full max-w-4xl" data-testid="legal-assistant-composer-shell">
      <LegalAssistantComposer />
    </div>
  );
}
