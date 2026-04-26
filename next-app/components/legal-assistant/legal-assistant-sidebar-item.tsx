"use client";

import { cn } from "@/lib/utils";

import { LegalAssistantSidebarItemActions } from "./legal-assistant-sidebar-item-actions";

type LegalAssistantSidebarItemProps = {
  conversationId: string;
  title: string;
  preview: string;
  isActive: boolean;
  onSelect: (conversationId: string) => void;
  onRename: (conversationId: string) => void;
  onDelete: (conversationId: string) => void;
};

export function LegalAssistantSidebarItem({
  conversationId,
  title,
  preview,
  isActive,
  onSelect,
  onRename,
  onDelete,
}: LegalAssistantSidebarItemProps) {
  const handleSelect = () => {
    onSelect(conversationId);
  };

  return (
    <div
      className={cn(
        "group flex w-full items-center rounded-md px-2 py-1.5 text-sidebar-foreground/75 transition-colors duration-150",
        isActive
          ? "bg-sidebar-accent/60 text-sidebar-foreground"
          : "hover:bg-sidebar-accent/40 hover:text-sidebar-foreground",
      )}
      onClick={handleSelect}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          handleSelect();
        }
      }}
      role="button"
      tabIndex={0}
    >
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-medium leading-5">{title}</div>
        <div className="truncate text-[11px] text-sidebar-foreground/55 leading-5">
          {preview || "暂无消息"}
        </div>
      </div>

      <LegalAssistantSidebarItemActions conversationId={conversationId} onDelete={onDelete} onRename={onRename} />
    </div>
  );
}
