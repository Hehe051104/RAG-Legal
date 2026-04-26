"use client";

import { FolderTreeIcon, PaletteIcon, SparklesIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type LegalAssistantSettingsBasicsProps = {
  modelId: string;
  theme: string;
  currentFolderId: string | null;
  folderOptions: Array<{ id: string; name: string }>;
  selectedFolderName: string | null;
  onModelIdChange: (value: string) => void;
  onThemeChange: (value: string) => void;
  onMoveConversation: (folderId: string | null) => void;
  canMoveConversation: boolean;
};

const MODEL_OPTIONS = ["legal-default", "gpt-4.1", "gpt-4.1-mini", "deepseek-chat", "qwen-plus", "glm-4.5"];

export function LegalAssistantSettingsBasics({
  modelId,
  theme,
  currentFolderId,
  folderOptions,
  selectedFolderName,
  onModelIdChange,
  onThemeChange,
  onMoveConversation,
  canMoveConversation,
}: LegalAssistantSettingsBasicsProps) {
  return (
    <div className="space-y-4 rounded-xl border border-border/50 bg-card/70 p-4 shadow-sm">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <SparklesIcon className="size-4" />
        基础设置
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-medium">模型标识</Label>
        <Input
          className="h-10 rounded-lg border-border/60"
          onChange={(event) => onModelIdChange(event.target.value)}
          placeholder="请输入后端使用的模型标识"
          value={modelId}
        />
        <div className="flex flex-wrap gap-2 pt-1">
          {MODEL_OPTIONS.map((option) => (
            <Button
              className="h-8 rounded-full px-3 text-xs"
              key={option}
              onClick={() => onModelIdChange(option)}
              type="button"
              variant={modelId === option ? "default" : "outline"}
            >
              {option}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label className="flex items-center gap-1 text-sm font-medium">
          <PaletteIcon className="size-3.5" />
          主题
        </Label>
        <Select value={theme} onValueChange={onThemeChange}>
          <SelectTrigger className="h-10 w-full rounded-lg">
            <SelectValue placeholder="选择主题" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="system">跟随系统</SelectItem>
            <SelectItem value="light">浅色</SelectItem>
            <SelectItem value="dark">深色</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className="flex items-center gap-1 text-sm font-medium">
          <FolderTreeIcon className="size-3.5" />
          当前会话文件夹
        </Label>
        <Select
          disabled={!canMoveConversation}
          onValueChange={(value) => onMoveConversation(value === "__root__" ? null : value)}
          value={currentFolderId ?? "__root__"}
        >
          <SelectTrigger className="h-10 w-full rounded-lg">
            <SelectValue placeholder="未选择会话" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__root__">未归类</SelectItem>
            {folderOptions.map((folder) => (
              <SelectItem key={folder.id} value={folder.id}>
                {folder.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {!canMoveConversation ? (
          <div className="text-xs text-muted-foreground">先在侧栏选择一个会话，再进行文件夹归类。</div>
        ) : selectedFolderName ? (
          <div className="text-xs text-muted-foreground">当前所在文件夹：{selectedFolderName}</div>
        ) : (
          <div className="text-xs text-muted-foreground">当前会话位于未归类。</div>
        )}
      </div>
    </div>
  );
}
