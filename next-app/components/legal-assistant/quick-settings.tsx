"use client";

import { PlusIcon, PanelLeftIcon, Settings2Icon } from "lucide-react";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";

import { useHome } from "./home-context";

export function QuickSettings() {
  const {
    createConversation,
    setSideBarOpen,
    setSettingsOpen,
  } = useHome();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "p") {
        event.preventDefault();
        setSettingsOpen(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setSettingsOpen]);

  return (
    <div className="flex items-center gap-1">
      <Button className="size-9 rounded-full" onClick={() => createConversation()} size="icon-sm" variant="ghost" type="button" title="新建对话">
        <PlusIcon className="size-4" />
      </Button>
      <Button className="size-9 rounded-full" onClick={() => setSideBarOpen(true)} size="icon-sm" variant="ghost" type="button" title="打开侧边栏">
        <PanelLeftIcon className="size-4" />
      </Button>
      <Button className="size-9 rounded-full" onClick={() => setSettingsOpen(true)} size="icon-sm" variant="ghost" type="button" title="打开设置">
        <Settings2Icon className="size-4" />
      </Button>
    </div>
  );
}
