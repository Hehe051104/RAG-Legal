"use client";

import { LegalAssistantComposer } from "./legal-assistant-composer";

export function LegalAssistantChatComposerShell() {
  return (
    <div className="w-full min-w-[300px] px-2 pb-3 pt-0 sm:w-[600px] sm:pb-6 sm:pt-4 md:w-[700px] lg:w-[700px] xl:w-[800px]">
      <div className="rounded-[22px] border border-white/10 bg-[linear-gradient(to_bottom,oklch(1_0_0_/0.06),oklch(0_0_0_/0.12))] p-1 shadow-[0_16px_40px_-18px_oklch(0_0_0_/0.6)] backdrop-blur-sm">
        <LegalAssistantComposer />
      </div>
    </div>
  );
}
