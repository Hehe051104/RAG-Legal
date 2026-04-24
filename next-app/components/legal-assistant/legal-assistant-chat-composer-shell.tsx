"use client";

import { LegalAssistantComposer } from "./legal-assistant-composer";

export function LegalAssistantChatComposerShell() {
  return (
    <div className="w-full min-w-[300px] px-2 pb-3 pt-0 sm:w-[600px] sm:pb-6 sm:pt-4 md:w-[700px] lg:w-[700px] xl:w-[800px]">
      <LegalAssistantComposer />
    </div>
  );
}
