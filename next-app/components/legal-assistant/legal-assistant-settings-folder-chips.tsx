"use client";

import { Button } from "@/components/ui/button";

export function LegalAssistantSettingsFolderChips({
  folderNames,
  onMoveConversation,
  hasSelectedConversation,
}: {
  folderNames: Array<{ id: string; name: string }>;
  onMoveConversation: (folderId: string) => void;
  hasSelectedConversation: boolean;
}) {
  return (
    <div className="space-y-2 rounded-3xl border border-border/60 bg-card p-4 shadow-sm">
      <div className="text-sm font-medium">文件夹管理</div>
      <div className="text-xs text-muted-foreground">你可以在侧栏中继续新建、重命名和删除文件夹。</div>
      <div className="flex flex-wrap gap-2 pt-2">
        {folderNames.map((folder) => (
          <Button key={folder.id} type="button" variant="outline" className="rounded-full" onClick={() => onMoveConversation(folder.id)}>
            {folder.name}
          </Button>
        ))}
        {folderNames.length === 0 ? <div className="text-xs text-muted-foreground">还没有任何文件夹。</div> : null}
        {!hasSelectedConversation && folderNames.length > 0 ? <div className="text-xs text-muted-foreground">先选择一个会话再快速转移。</div> : null}
      </div>
    </div>
  );
}
