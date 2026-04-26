"use client";

import { BarChart3Icon } from "lucide-react";

import { LegalAssistantSettingsAuthCard } from "./legal-assistant-settings-auth-card";
import { LegalAssistantSettingsMetrics } from "./legal-assistant-settings-metrics";

type LegalAssistantSettingsSummaryProps = {
  authStatus: string;
  folderCount: number;
  conversationCount: number;
  messageCount: number;
};

export function LegalAssistantSettingsSummary({
  authStatus,
  folderCount,
  conversationCount,
  messageCount,
}: LegalAssistantSettingsSummaryProps) {
  return (
    <div className="space-y-3 rounded-xl border border-border/50 bg-card/70 p-4 shadow-sm">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <BarChart3Icon className="size-4" />
        状态概览
      </div>
      <LegalAssistantSettingsAuthCard authStatus={authStatus} />
      <LegalAssistantSettingsMetrics
        conversationCount={conversationCount}
        folderCount={folderCount}
        messageCount={messageCount}
      />
    </div>
  );
}
