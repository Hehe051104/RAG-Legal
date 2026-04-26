"use client";

import { InfoIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { ChatSettings } from "./chat-settings";
import { QuickSettings } from "./quick-settings";

export function LegalAssistantChatHeaderActions() {
  return (
    <div className="absolute right-2 top-1 hidden h-10 items-center gap-1 md:flex">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              aria-label="查看会话信息"
              className="size-9 rounded-md text-muted-foreground hover:text-foreground"
              size="icon-sm"
              type="button"
              variant="ghost"
            >
              <InfoIcon className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>会话信息</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <QuickSettings />
      <ChatSettings />
    </div>
  );
}
