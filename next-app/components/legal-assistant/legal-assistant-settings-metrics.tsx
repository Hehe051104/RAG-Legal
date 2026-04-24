"use client";

export function LegalAssistantSettingsMetrics({
  folderCount,
  conversationCount,
  messageCount,
}: {
  folderCount: number;
  conversationCount: number;
  messageCount: number;
}) {
  return (
    <div className="grid grid-cols-3 gap-2 text-center text-xs text-muted-foreground">
      <div className="rounded-2xl bg-muted/40 px-3 py-2">{folderCount} 个文件夹</div>
      <div className="rounded-2xl bg-muted/40 px-3 py-2">{conversationCount} 个对话</div>
      <div className="rounded-2xl bg-muted/40 px-3 py-2">{messageCount} 条消息</div>
    </div>
  );
}
