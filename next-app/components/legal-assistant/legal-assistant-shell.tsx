"use client";

import { CommandK } from "./command-k";
import { HomeProvider } from "./home-context";
import { LegalAssistantChat } from "./legal-assistant-chat";

export function LegalAssistantShell({ authToken }: { authToken: string }) {
  return (
    <HomeProvider authToken={authToken}>
      <CommandK />
      <LegalAssistantChat />
    </HomeProvider>
  );
}
