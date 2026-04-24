"use client";

import { Edit2Icon, Trash2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";

export function LegalAssistantSidebarItemActions({
  conversationId,
  onRename,
  onDelete,
}: {
  conversationId: string;
  onRename: (conversationId: string) => void;
  onDelete: (conversationId: string) => void;
}) {
  return (
    <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100">
      <Button className="size-7 rounded-full" onClick={() => onRename(conversationId)} size="icon-sm" variant="ghost" type="button" aria-label="重命名对话">
        <Edit2Icon className="size-3.5" />
      </Button>
      <Button className="size-7 rounded-full text-destructive hover:text-destructive" onClick={() => onDelete(conversationId)} size="icon-sm" variant="ghost" type="button" aria-label="删除对话">
        <Trash2Icon className="size-3.5" />
      </Button>
    </div>
  );
}
