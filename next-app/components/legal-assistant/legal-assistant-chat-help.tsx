"use client";

import { CircleHelpIcon } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type ShortcutItem = {
  label: string;
  shortcut: string;
};

const HELP_ITEMS: ShortcutItem[] = [
  { label: "打开帮助面板", shortcut: "/" },
  { label: "命令面板", shortcut: "⌃/⌘ + K" },
  { label: "打开设置", shortcut: "⌃/⌘ + I" },
  { label: "新建会话", shortcut: "⌃/⌘ + P" },
  { label: "发送消息", shortcut: "回车" },
  { label: "换行", shortcut: "上档键 + 回车" },
  { label: "关闭弹层", shortcut: "退出键" },
];

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || target.isContentEditable;
}

export function LegalAssistantChatHelp() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.key === "/" &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.altKey &&
        !isTypingTarget(event.target)
      ) {
        event.preventDefault();
        setOpen((prevState) => !prevState);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label="帮助与快捷键"
          className="size-8 rounded-xl border border-border/50 bg-card/70 text-muted-foreground shadow-sm transition-all duration-200 hover:text-foreground"
          data-testid="legal-assistant-help"
          size="icon-sm"
          type="button"
          variant="ghost"
        >
          <CircleHelpIcon className="size-4" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-72 rounded-xl border border-border/60 bg-popover/95 p-1 backdrop-blur">
        <DropdownMenuLabel className="px-2 pt-1.5 pb-1 text-xs font-medium text-muted-foreground">
          快捷键
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {HELP_ITEMS.map((item) => (
          <DropdownMenuItem className="flex items-center justify-between rounded-lg px-2 py-1.5" key={item.label}>
            <span className="text-[13px]">{item.label}</span>
            <span className="rounded-md border border-border/50 bg-muted/50 px-1.5 py-0.5 text-[11px] text-muted-foreground">
              {item.shortcut}
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
