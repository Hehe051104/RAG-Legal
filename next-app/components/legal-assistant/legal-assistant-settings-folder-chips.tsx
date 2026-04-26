"use client";

import { Button } from "@/components/ui/button";

type LegalAssistantSettingsFolderChipsProps = {
  folderNames: Array<{ id: string; name: string }>;
  onMoveConversation: (folderId: string) => void;
  hasSelectedConversation: boolean;
};

export function LegalAssistantSettingsFolderChips({
  folderNames,
  onMoveConversation,
  hasSelectedConversation,
}: LegalAssistantSettingsFolderChipsProps) {
  return (
    <div className="space-y-2 rounded-lg border border-border/60 bg-muted/20 p-3">
      <div className="text-sm font-medium">快速转移会话</div>
      <div className="text-xs text-muted-foreground">点击标签可把当前会话移动到目标文件夹。</div>

      <div className="flex flex-wrap gap-2 pt-1">
        {folderNames.map((folder) => (
          <Button
            className="h-8 rounded-full px-3 text-xs"
            disabled={!hasSelectedConversation}
            key={folder.id}
            onClick={() => onMoveConversation(folder.id)}
            type="button"
            variant="outline"
          >
            {folder.name}
          </Button>
        ))}
        {folderNames.length === 0 ? <div className="text-xs text-muted-foreground">还没有任何文件夹。</div> : null}
        {!hasSelectedConversation && folderNames.length > 0 ? <div className="text-xs text-muted-foreground">先选择一个会话再快速转移。</div> : null}
      </div>
    </div>
  );
}
