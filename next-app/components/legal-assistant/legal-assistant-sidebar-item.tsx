"use client";

import { useState } from "react";
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
  const [isHovering, setIsHovering] = useState(false);

  return (
    <div
      className={cn(
        "flex h-11 w-full shrink-0 items-center gap-1 rounded-lg px-2 transition-colors duration-150 cursor-pointer select-none overflow-hidden",
        isActive
          ? "bg-sidebar-accent text-sidebar-foreground shadow-sm"
          : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
      )}
      onClick={() => onSelect(conversationId)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect(conversationId);
        }
      }}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      role="button"
      tabIndex={0}
    >
      <span className="min-w-0 flex-1 truncate text-[13px] font-medium leading-none">
        {title}
      </span>

      {(isHovering || isActive) && (
        <LegalAssistantSidebarItemActions
          conversationId={conversationId}
          onDelete={onDelete}
          onRename={onRename}
        />
      )}
    </div>
  );
}
