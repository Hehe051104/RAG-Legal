"use client";

import { Edit2Icon, Trash2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";

type LegalAssistantSidebarItemActionsProps = {
  conversationId: string;
  onRename: (conversationId: string) => void;
  onDelete: (conversationId: string) => void;
};

export function LegalAssistantSidebarItemActions({
  conversationId,
  onRename,
  onDelete,
}: LegalAssistantSidebarItemActionsProps) {
  return (
    <div
      className="ml-2 flex items-center gap-1 opacity-100 md:w-11 md:opacity-0 md:group-hover:opacity-100"
      onClick={(event) => {
        event.stopPropagation();
      }}
      onMouseDown={(event) => {
        event.stopPropagation();
      }}
    >
      <Button
        aria-label="重命名对话"
        className="size-7 rounded-md text-sidebar-foreground/60 hover:text-sidebar-foreground"
        onClick={() => onRename(conversationId)}
        size="icon-sm"
        type="button"
        variant="ghost"
      >
        <Edit2Icon className="size-3.5" />
      </Button>

      <Button
        aria-label="删除对话"
        className="size-7 rounded-md text-sidebar-foreground/50 hover:bg-destructive/10 hover:text-destructive"
        onClick={() => onDelete(conversationId)}
        size="icon-sm"
        type="button"
        variant="ghost"
      >
        <Trash2Icon className="size-3.5" />
      </Button>
    </div>
  );
}
