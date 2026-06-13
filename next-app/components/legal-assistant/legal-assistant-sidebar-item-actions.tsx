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
      className="ml-auto flex shrink-0 items-center gap-1"
      onClick={(event) => {
        event.stopPropagation();
      }}
      onMouseDown={(event) => {
        event.stopPropagation();
      }}
    >
      <Button
        aria-label="重命名对话"
        className="size-8 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground active:scale-95 transition-all duration-150"
        onClick={() => onRename(conversationId)}
        size="icon-sm"
        type="button"
        variant="ghost"
      >
        <Edit2Icon className="size-3.5" />
      </Button>

      <Button
        aria-label="删除对话"
        className="size-8 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive active:scale-95 transition-all duration-150"
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
