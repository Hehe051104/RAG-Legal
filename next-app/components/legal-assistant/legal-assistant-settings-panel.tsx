"use client";

import { Settings2Icon } from "lucide-react";

import { useHome } from "./home-context";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";

import { LegalAssistantConversationDialog } from "./legal-assistant-conversation-dialog";
import { LegalAssistantSettingsContent } from "./legal-assistant-settings-content";
import { LegalAssistantFolderDialog } from "./legal-assistant-folder-dialog";

type LegalAssistantSettingsPanelProps = {
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
};

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
}: LegalAssistantSettingsPanelProps) {
  const { settingsOpen, setSettingsOpen } = useHome();

  return (
    <Sheet onOpenChange={setSettingsOpen} open={settingsOpen}>
      <SheetContent className="w-[92vw] max-w-[560px] border-l border-border/40 p-0" side="right">
        <div className="flex h-full min-h-0 flex-col">
          <SheetHeader className="sticky top-0 z-10 border-b border-border/40 bg-background/95 px-6 py-5 backdrop-blur supports-[backdrop-filter]:bg-background/85">
            <div className="mb-2 inline-flex size-10 items-center justify-center rounded-xl border border-border/60 bg-muted/40">
              <Settings2Icon className="size-5" />
            </div>
            <SheetTitle className="text-left">工作区设置</SheetTitle>
            <SheetDescription className="text-left">统一管理模型、主题、文件夹和本地数据。</SheetDescription>
          </SheetHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
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
