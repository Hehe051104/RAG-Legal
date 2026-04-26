"use client";

type LegalAssistantSettingsMetricsProps = {
  folderCount: number;
  conversationCount: number;
  messageCount: number;
};

export function LegalAssistantSettingsMetrics({
  folderCount,
  conversationCount,
  messageCount,
}: LegalAssistantSettingsMetricsProps) {
  return (
    <div className="grid grid-cols-3 gap-2 text-center text-xs text-muted-foreground" data-testid="legal-assistant-settings-metrics">
      <div className="rounded-lg border border-border/50 bg-card/80 px-2 py-2">
        <div className="text-base font-semibold text-foreground">{folderCount}</div>
        <div>文件夹</div>
      </div>
      <div className="rounded-lg border border-border/50 bg-card/80 px-2 py-2">
        <div className="text-base font-semibold text-foreground">{conversationCount}</div>
        <div>对话</div>
      </div>
      <div className="rounded-lg border border-border/50 bg-card/80 px-2 py-2">
        <div className="text-base font-semibold text-foreground">{messageCount}</div>
        <div>消息</div>
      </div>
    </div>
  );
}
