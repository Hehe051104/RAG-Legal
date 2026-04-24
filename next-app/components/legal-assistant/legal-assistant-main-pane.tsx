"use client";

import { useEffect, useRef } from "react";

import { LegalAssistantChatFeed } from "./legal-assistant-chat-feed";
import { LegalAssistantChatHelp } from "./legal-assistant-chat-help";
import { LegalAssistantChatHeader } from "./legal-assistant-chat-header";
import { LegalAssistantSettingsPanel } from "./legal-assistant-settings-panel";

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
}: {
  isSidebarOpen: boolean;
  modelLabel: string;
  selectedFolderName: string | null;
  title: string;
  messages: Array<{
    id: string;
    role: "user" | "assistant";
    content: string;
    createdAt: string;
    status?: "streaming" | "done" | "error";
    isError?: boolean;
  }>;
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
}) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const panel = messagesEndRef.current;
    if (!panel) {
      return;
    }

    panel.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isSending]);

  return (
    <div className="relative flex min-w-0 flex-1 flex-col bg-[radial-gradient(circle_at_top,oklch(0.98_0.02_250_/0.22),transparent_38%),linear-gradient(to_bottom,oklch(0.99_0.01_260_/0.98),oklch(0.97_0.01_260_/0.95))] dark:bg-[radial-gradient(circle_at_top,oklch(0.36_0.02_255_/0.32),transparent_42%),linear-gradient(to_bottom,oklch(0.22_0.01_255_/0.98),oklch(0.18_0.01_260_/0.97))]">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,transparent_0%,oklch(0_0_0_/0.08)_100%)]" />
      <LegalAssistantChatHeader
        isSidebarOpen={isSidebarOpen}
        modelLabel={modelLabel}
        onOpenSidebar={onOpenSidebar}
        selectedFolderName={selectedFolderName}
        title={title}
      />

      <LegalAssistantChatFeed
        isSending={isSending}
        messages={messages}
        messagesEndRef={messagesEndRef}
        onQuickPrompt={onQuickPrompt}
      />

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
