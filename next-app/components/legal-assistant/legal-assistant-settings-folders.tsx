"use client";

import { LegalAssistantSettingsFolderChips } from "./legal-assistant-settings-folder-chips";
import { LegalAssistantSettingsQuickActions } from "./legal-assistant-settings-quick-actions";

export function LegalAssistantSettingsFolders({
  folderNames,
  onCreateFolder,
  onClearHistory,
  onMoveConversation,
  hasSelectedConversation,
}: {
  folderNames: Array<{ id: string; name: string }>;
  onCreateFolder: () => void;
  onClearHistory: () => void;
  onMoveConversation: (folderId: string) => void;
  hasSelectedConversation: boolean;
}) {
  return (
    <>
      <LegalAssistantSettingsQuickActions onClearHistory={onClearHistory} onCreateFolder={onCreateFolder} />

      <LegalAssistantSettingsFolderChips
        folderNames={folderNames}
        hasSelectedConversation={hasSelectedConversation}
        onMoveConversation={onMoveConversation}
      />
    </>
  );
}
