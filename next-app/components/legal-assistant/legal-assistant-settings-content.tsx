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

  const currentFolderId = selectedConversation?.folderId ?? null;

  return (
    <div className="space-y-5">
      <LegalAssistantSettingsBasics
        canMoveConversation={Boolean(selectedConversation)}
        currentFolderId={currentFolderId}
        folderOptions={folders}
        modelId={modelId}
        onModelIdChange={setModelId}
        onMoveConversation={(folderId) => moveConversationToFolder(selectedConversation?.id ?? "", folderId)}
        onThemeChange={(value) => setTheme(value as typeof theme)}
        selectedFolderName={selectedFolder?.name ?? null}
        theme={theme}
      />

      <Separator />

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
        onMoveConversation={(folderId) => moveConversationToFolder(selectedConversation?.id ?? "", folderId)}
      />
    </div>
  );
}
