"use client";

import { Button } from "@/components/ui/button";

export function LegalAssistantSettingsQuickActions({
  onCreateFolder,
  onClearHistory,
}: {
  onCreateFolder: () => void;
  onClearHistory: () => void;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <Button className="h-11 rounded-2xl" onClick={onCreateFolder} type="button" variant="outline">
        新建文件夹
      </Button>
      <Button className="h-11 rounded-2xl" onClick={onClearHistory} type="button" variant="destructive">
        清空本地历史
      </Button>
    </div>
  );
}
