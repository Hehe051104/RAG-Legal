"use client";

import { PanelLeftIcon, PlusIcon, Settings2Icon } from "lucide-react";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { useHome } from "./home-context";

export function QuickSettings() {
  const { createConversation, modelId, setSideBarOpen, setSettingsOpen } = useHome();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "p") {
        event.preventDefault();
        createConversation();
      }

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "i") {
        event.preventDefault();
        setSettingsOpen(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [createConversation, setSettingsOpen]);

  return (
    <TooltipProvider>
      <div className="flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              aria-label="新建会话"
              className="size-9 rounded-md text-muted-foreground hover:text-foreground"
              onClick={() => {
                createConversation();
              }}
              size="icon-sm"
              type="button"
              variant="ghost"
            >
              <PlusIcon className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>新建会话 (Ctrl/Cmd + P)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              aria-label="打开侧栏"
              className="size-9 rounded-md text-muted-foreground hover:text-foreground"
              onClick={() => setSideBarOpen(true)}
              size="icon-sm"
              type="button"
              variant="ghost"
            >
              <PanelLeftIcon className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>打开侧栏</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              aria-label="打开设置"
              className="size-9 rounded-md text-muted-foreground hover:text-foreground"
              onClick={() => setSettingsOpen(true)}
              size="icon-sm"
              type="button"
              variant="ghost"
            >
              <Settings2Icon className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>打开设置 (Ctrl/Cmd + I)</TooltipContent>
        </Tooltip>

        <div className="hidden max-w-[170px] truncate rounded-md border border-border/50 px-2 py-1 text-[11px] text-muted-foreground lg:block">
          {modelId || "legal-default"}
        </div>
      </div>
    </TooltipProvider>
  );
}
