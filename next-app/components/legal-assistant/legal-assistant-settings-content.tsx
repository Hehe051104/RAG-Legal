"use client";

import { Separator } from "@/components/ui/separator";

import { useHome } from "./home-context";
import { LegalAssistantSettingsBasics } from "./legal-assistant-settings-basics";
import { LegalAssistantSettingsFolders } from "./legal-assistant-settings-folders";
import { LegalAssistantSettingsSummary } from "./legal-assistant-settings-summary";

export function LegalAssistantSettingsContent() {
  const {
    modelId,
    setModelId,
    theme,
    setTheme,
    selectedConversation,
    conversations,
    folders,
    moveConversationToFolder,
    createFolder,
    clearAll,
    selectedFolder,
    authToken,
  } = useHome();

  const selectedConversationId = selectedConversation?.id ?? null;
  const currentFolderId = selectedConversation?.folderId ?? null;

  const handleMoveConversation = (folderId: string | null) => {
    if (!selectedConversationId) {
      return;
    }

    moveConversationToFolder(selectedConversationId, folderId);
  };

  return (
    <div className="space-y-5 pb-2">
      <LegalAssistantSettingsBasics
        canMoveConversation={Boolean(selectedConversation)}
        currentFolderId={currentFolderId}
        folderOptions={folders}
        modelId={modelId}
        onModelIdChange={setModelId}
        onMoveConversation={handleMoveConversation}
        onThemeChange={(value) => setTheme(value as typeof theme)}
        selectedFolderName={selectedFolder?.name ?? null}
        theme={theme}
      />

      <Separator className="my-1" />

      <LegalAssistantSettingsSummary
        authStatus={authToken ? "已验证" : "未登录"}
        conversationCount={conversations.length}
        folderCount={folders.length}
        messageCount={selectedConversation?.messages.length ?? 0}
      />

      <LegalAssistantSettingsFolders
        folderNames={folders}
        hasSelectedConversation={Boolean(selectedConversation)}
        onClearHistory={clearAll}
        onCreateFolder={() => createFolder("新文件夹")}
        onMoveConversation={(folderId) => handleMoveConversation(folderId)}
      />
    </div>
  );
}
