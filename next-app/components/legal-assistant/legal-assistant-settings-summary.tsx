"use client";

import { LegalAssistantSettingsAuthCard } from "./legal-assistant-settings-auth-card";
import { LegalAssistantSettingsMetrics } from "./legal-assistant-settings-metrics";

export function LegalAssistantSettingsSummary({
  authStatus,
  folderCount,
  conversationCount,
  messageCount,
}: {
  authStatus: string;
  folderCount: number;
  conversationCount: number;
  messageCount: number;
}) {
  return (
    <>
      <LegalAssistantSettingsAuthCard authStatus={authStatus} />
      <LegalAssistantSettingsMetrics conversationCount={conversationCount} folderCount={folderCount} messageCount={messageCount} />
    </>
  );
}
