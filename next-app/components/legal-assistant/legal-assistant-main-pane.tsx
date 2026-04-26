"use client";

import { useEffect, useRef } from "react";

import type { LegalAssistantMessage } from "./api";

import { LegalAssistantChatComposerShell } from "./legal-assistant-chat-composer-shell";
import { LegalAssistantChatFeed } from "./legal-assistant-chat-feed";
import { LegalAssistantChatHeader } from "./legal-assistant-chat-header";
import { LegalAssistantChatHelp } from "./legal-assistant-chat-help";
import { LegalAssistantSettingsPanel } from "./legal-assistant-settings-panel";

type LegalAssistantMainPaneProps = {
  isSidebarOpen: boolean;
  modelLabel: string;
  selectedFolderName: string | null;
  title: string;
  messages: LegalAssistantMessage[];
  isSending: boolean;
  onOpenSidebar: () => void;
  onQuickPrompt: (prompt: string) => void;
  conversationDialogOpen: boolean;
  conversationDraft: string;
  folderDialogMode: "create" | "rename";
  folderDialogOpen: boolean;
  folderDraft: string;
  onConversationDialogClose: () => void;
  onConversationDialogSubmit: () => void;
  onFolderDialogClose: () => void;
  onFolderDialogSubmit: () => void;
  setConversationDraft: (value: string) => void;
  setFolderDraft: (value: string) => void;
};

export function LegalAssistantMainPane({
  isSidebarOpen,
  modelLabel,
  selectedFolderName,
  title,
  messages,
  isSending,
  onOpenSidebar,
  onQuickPrompt,
  conversationDialogOpen,
  conversationDraft,
  folderDialogMode,
  folderDialogOpen,
  folderDraft,
  onConversationDialogClose,
  onConversationDialogSubmit,
  onFolderDialogClose,
  onFolderDialogSubmit,
  setConversationDraft,
  setFolderDraft,
}: LegalAssistantMainPaneProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const messagesStartRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    const panel = messagesEndRef.current;
    if (!panel) {
      return;
    }

    panel.scrollIntoView({ behavior: "smooth", block: "end" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isSending]);

  return (
    <div className="relative flex min-w-0 flex-1 flex-col bg-sidebar">
      <LegalAssistantChatHeader
        isSidebarOpen={isSidebarOpen}
        modelLabel={modelLabel}
        onOpenSidebar={onOpenSidebar}
        selectedFolderName={selectedFolderName}
        title={title || "法律助手"}
      />

      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-background md:rounded-tl-[12px] md:border-t md:border-l md:border-border/40">
        <LegalAssistantChatFeed
          isSending={isSending}
          messages={messages}
          messagesStartRef={messagesStartRef}
          messagesEndRef={messagesEndRef}
          scrollContainerRef={scrollContainerRef}
          onQuickPrompt={onQuickPrompt}
        />

        <div className="sticky bottom-0 z-10 mx-auto flex w-full max-w-4xl gap-2 bg-background px-2 pb-3 pt-2 md:px-4 md:pb-4">
          <LegalAssistantChatComposerShell />
        </div>
      </div>

      <div className="absolute bottom-2 right-2 hidden md:block lg:bottom-4 lg:right-4">
        <LegalAssistantChatHelp />
      </div>

      <LegalAssistantSettingsPanel
        conversationDialogOpen={conversationDialogOpen}
        conversationDraft={conversationDraft}
        folderDialogMode={folderDialogMode}
        folderDialogOpen={folderDialogOpen}
        folderDraft={folderDraft}
        onConversationDialogClose={onConversationDialogClose}
        onConversationDialogSubmit={onConversationDialogSubmit}
        onFolderDialogClose={onFolderDialogClose}
        onFolderDialogSubmit={onFolderDialogSubmit}
        setConversationDraft={setConversationDraft}
        setFolderDraft={setFolderDraft}
      />
    </div>
  );
}
