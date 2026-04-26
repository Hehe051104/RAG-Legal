"use client";

import { CommandK } from "./command-k";
import { HomeProvider } from "./home-context";
import { LegalAssistantChat } from "./legal-assistant-chat";

type LegalAssistantShellProps = {
  authToken: string;
};

export function LegalAssistantShell({ authToken }: LegalAssistantShellProps) {
  return (
    <HomeProvider authToken={authToken}>
      <>
        <LegalAssistantChat />
        <CommandK />
      </>
    </HomeProvider>
  );
}
