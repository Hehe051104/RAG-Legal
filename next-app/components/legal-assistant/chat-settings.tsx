"use client";

import { Settings2Icon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

import { useHome } from "./home-context";

const MODEL_GROUPS = [
  {
    label: "常用",
    models: ["legal-default", "gpt-4.1", "gpt-4.1-mini"]
  },
  {
    label: "国产",
    models: ["deepseek-chat", "qwen-plus", "glm-4.5"]
  }
];

export function ChatSettings() {
  const { modelId, setModelId } = useHome();
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "i") {
        event.preventDefault();
        setOpen((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const allModels = useMemo(
    () => MODEL_GROUPS.flatMap((group) => group.models),
    []
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button ref={buttonRef} className="flex items-center gap-2 rounded-full px-3" size="sm" variant="ghost">
          <div className="max-w-[120px] truncate text-sm font-medium sm:max-w-[200px] md:max-w-[260px]">{modelId}</div>
          <Settings2Icon className="size-4" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="relative flex max-h-[calc(100vh-60px)] w-[300px] flex-col space-y-4 overflow-auto rounded-lg border-2 p-6 shadow-lg sm:w-[350px] md:w-[400px] lg:w-[500px]">
        <div>
          <div className="text-sm font-semibold">模型设置</div>
          <div className="text-xs text-muted-foreground">切换当前模型，`modelId` 会随请求传给后端。</div>
        </div>

        <div className="space-y-3">
          {MODEL_GROUPS.map((group) => (
            <div key={group.label} className="space-y-2">
              <div className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                {group.label}
              </div>
              <div className="flex flex-wrap gap-2">
                {group.models.map((model) => (
                  <Button
                    key={model}
                    className="rounded-full"
                    onClick={() => setModelId(model)}
                    size="sm"
                    variant={modelId === model ? "default" : "outline"}
                    type="button"
                  >
                    {model}
                  </Button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-border/60 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          当前模型：{modelId}
        </div>
      </PopoverContent>
    </Popover>
  );
}
