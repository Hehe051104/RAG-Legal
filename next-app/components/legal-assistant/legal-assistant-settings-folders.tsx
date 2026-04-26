"use client";

import { FolderIcon } from "lucide-react";

import { LegalAssistantSettingsFolderChips } from "./legal-assistant-settings-folder-chips";
import { LegalAssistantSettingsQuickActions } from "./legal-assistant-settings-quick-actions";

type LegalAssistantSettingsFoldersProps = {
  folderNames: Array<{ id: string; name: string }>;
  onCreateFolder: () => void;
  onClearHistory: () => void;
  onMoveConversation: (folderId: string) => void;
  hasSelectedConversation: boolean;
};

export function LegalAssistantSettingsFolders({
  folderNames,
  onCreateFolder,
  onClearHistory,
  onMoveConversation,
  hasSelectedConversation,
}: LegalAssistantSettingsFoldersProps) {
  return (
    <div className="space-y-3 rounded-xl border border-border/50 bg-card/70 p-4 shadow-sm">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <FolderIcon className="size-4" />
        文件夹与数据
      </div>

      <LegalAssistantSettingsQuickActions onClearHistory={onClearHistory} onCreateFolder={onCreateFolder} />

      <LegalAssistantSettingsFolderChips
        folderNames={folderNames}
        hasSelectedConversation={hasSelectedConversation}
        onMoveConversation={onMoveConversation}
      />
    </div>
  );
}
