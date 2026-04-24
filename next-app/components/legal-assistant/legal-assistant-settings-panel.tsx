"use client";

import { useHome } from "./home-context";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";

import { LegalAssistantConversationDialog } from "./legal-assistant-conversation-dialog";
import { LegalAssistantSettingsContent } from "./legal-assistant-settings-content";
import { LegalAssistantFolderDialog } from "./legal-assistant-folder-dialog";

export function LegalAssistantSettingsPanel({
  folderDialogOpen,
  folderDialogMode,
  folderDraft,
  setFolderDraft,
  onFolderDialogClose,
  onFolderDialogSubmit,
  conversationDialogOpen,
  conversationDraft,
  setConversationDraft,
  onConversationDialogClose,
  onConversationDialogSubmit,
}: {
  folderDialogOpen: boolean;
  folderDialogMode: "create" | "rename";
  folderDraft: string;
  setFolderDraft: (value: string) => void;
  onFolderDialogClose: () => void;
  onFolderDialogSubmit: () => void;
  conversationDialogOpen: boolean;
  conversationDraft: string;
  setConversationDraft: (value: string) => void;
  onConversationDialogClose: () => void;
  onConversationDialogSubmit: () => void;
}) {
  const { settingsOpen, setSettingsOpen } = useHome();

  return (
    <Sheet onOpenChange={setSettingsOpen} open={settingsOpen}>
      <SheetContent className="w-[92vw] max-w-[520px] overflow-y-auto border-l border-border/40 p-0" side="right">
        <div className="p-6">
          <SheetHeader className="px-0">
            <SheetTitle>Settings</SheetTitle>
            <SheetDescription>模型、主题和文件夹都在这里管理。</SheetDescription>
          </SheetHeader>

          <div className="mt-6">
            <LegalAssistantSettingsContent />
          </div>
        </div>

        <LegalAssistantFolderDialog
          draft={folderDraft}
          mode={folderDialogMode}
          onClose={onFolderDialogClose}
          onSubmit={onFolderDialogSubmit}
          open={folderDialogOpen}
          setDraft={setFolderDraft}
        />

        <LegalAssistantConversationDialog
          draft={conversationDraft}
          onClose={onConversationDialogClose}
          onSubmit={onConversationDialogSubmit}
          open={conversationDialogOpen}
          setDraft={setConversationDraft}
        />
      </SheetContent>
    </Sheet>
  );
}
