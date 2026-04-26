"use client";

import { FolderPlusIcon, Trash2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";

type LegalAssistantSettingsQuickActionsProps = {
  onCreateFolder: () => void;
  onClearHistory: () => void;
};

export function LegalAssistantSettingsQuickActions({
  onCreateFolder,
  onClearHistory,
}: LegalAssistantSettingsQuickActionsProps) {
  return (
    <div className="grid gap-2 sm:grid-cols-2" data-testid="legal-assistant-settings-quick-actions">
      <Button className="h-10 justify-start gap-2 rounded-lg border-border/60 text-[13px]" onClick={onCreateFolder} type="button" variant="outline">
        <FolderPlusIcon className="size-4" />
        新建文件夹
      </Button>
      <Button className="h-10 justify-start gap-2 rounded-lg text-[13px]" onClick={onClearHistory} type="button" variant="destructive">
        <Trash2Icon className="size-4" />
        清空本地历史
      </Button>
    </div>
  );
}
