"use client";

import { ChatSettings } from "./chat-settings";
import { QuickSettings } from "./quick-settings";

export function LegalAssistantChatHeaderActions() {
  return (
    <div className="absolute right-2 top-1 hidden h-[40px] items-center gap-2 md:flex">
      <QuickSettings />
      <ChatSettings />
    </div>
  );
}
