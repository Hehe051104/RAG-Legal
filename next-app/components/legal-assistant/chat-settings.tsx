"use client";

import { CheckCircle2Icon, ChevronDownIcon, SlidersHorizontalIcon } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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

  const activeGroupLabel = useMemo(() => {
    return MODEL_GROUPS.find((group) => group.models.includes(modelId))?.label ?? "自定义";
  }, [modelId]);

  return (
    <DropdownMenu onOpenChange={setOpen} open={open}>
      <DropdownMenuTrigger asChild>
        <Button
          className="gap-1.5 rounded-md border-border/50 text-muted-foreground shadow-none transition-colors hover:text-foreground"
          size="sm"
          variant="outline"
        >
          <SlidersHorizontalIcon className="size-4" />
          <span className="hidden max-w-[160px] truncate md:inline">{modelId}</span>
          <ChevronDownIcon className="size-4" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="min-w-[320px]">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>模型设置</span>
          <span className="rounded-full border border-border/60 px-2 py-0.5 text-[10px] text-muted-foreground">
            {activeGroupLabel}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {MODEL_GROUPS.map((group) => (
          <div className="py-1" key={group.label}>
            <div className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              {group.label}
            </div>

            {group.models.map((model) => (
              <DropdownMenuItem
                className="flex items-center justify-between"
                key={model}
                onSelect={() => {
                  setModelId(model);
                }}
              >
                <span>{model}</span>
                {modelId === model ? <CheckCircle2Icon className="size-4 text-foreground" /> : null}
              </DropdownMenuItem>
            ))}
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
