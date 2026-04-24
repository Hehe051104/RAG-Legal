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

export function LegalAssistantChatHelp() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "/") {
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
        <Button className="size-8 rounded-full bg-primary text-secondary opacity-60 hover:opacity-50" size="icon-sm" type="button" variant="ghost">
          <CircleHelpIcon className="size-4" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel>快捷键</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="flex justify-between">
          <span>新建对话</span>
          <span className="text-xs text-muted-foreground">Ctrl / Cmd + P</span>
        </DropdownMenuItem>
        <DropdownMenuItem className="flex justify-between">
          <span>打开设置</span>
          <span className="text-xs text-muted-foreground">点击顶部设置</span>
        </DropdownMenuItem>
        <DropdownMenuItem className="flex justify-between">
          <span>命令面板</span>
          <span className="text-xs text-muted-foreground">Ctrl / Cmd + K</span>
        </DropdownMenuItem>
        <DropdownMenuItem className="flex justify-between">
          <span>切换侧栏</span>
          <span className="text-xs text-muted-foreground">点击左上角菜单</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
