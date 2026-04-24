"use client";

import { cn } from "@/lib/utils";

import { LegalAssistantSidebarItemActions } from "./legal-assistant-sidebar-item-actions";

export function LegalAssistantSidebarItem({
  conversationId,
  title,
  preview,
  isActive,
  onSelect,
  onRename,
  onDelete,
}: {
  conversationId: string;
  title: string;
  preview: string;
  isActive: boolean;
  onSelect: (conversationId: string) => void;
  onRename: (conversationId: string) => void;
  onDelete: (conversationId: string) => void;
}) {
  return (
    <div
      className={cn(
        "group flex w-full cursor-pointer items-center rounded p-2 transition-colors hover:bg-sidebar-accent hover:opacity-50 focus:bg-sidebar-accent focus:outline-none",
        isActive && "bg-sidebar-accent",
      )}
    >
      <button className="min-w-0 flex-1 text-left" onClick={() => onSelect(conversationId)} type="button">
        <div className="truncate text-sm font-semibold">{title}</div>
        <div className="truncate text-xs text-sidebar-foreground/55">{preview || "暂无消息"}</div>
      </button>
      <LegalAssistantSidebarItemActions conversationId={conversationId} onDelete={onDelete} onRename={onRename} />
    </div>
  );
}
