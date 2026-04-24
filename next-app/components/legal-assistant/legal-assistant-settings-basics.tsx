"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const modelOptions = ["legal-default", "gpt-4.1", "gpt-4.1-mini", "deepseek-chat", "qwen-plus", "glm-4.5"];

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
}: {
  modelId: string;
  theme: string;
  currentFolderId: string | null;
  folderOptions: Array<{ id: string; name: string }>;
  selectedFolderName: string | null;
  onModelIdChange: (value: string) => void;
  onThemeChange: (value: string) => void;
  onMoveConversation: (folderId: string | null) => void;
  canMoveConversation: boolean;
}) {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label className="text-sm font-medium">modelId</Label>
        <Input
          className="h-11 rounded-2xl"
          onChange={(event) => onModelIdChange(event.target.value)}
          placeholder="请输入后端使用的 modelId"
          value={modelId}
        />
        <div className="flex flex-wrap gap-2">
          {modelOptions.map((option) => (
            <Button key={option} type="button" variant={modelId === option ? "default" : "outline"} className="rounded-full" onClick={() => onModelIdChange(option)}>
              {option}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-medium">主题</Label>
        <Select value={theme} onValueChange={onThemeChange}>
          <SelectTrigger className="h-11 w-full rounded-2xl">
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
        <Label className="text-sm font-medium">当前会话文件夹</Label>
        <Select disabled={!canMoveConversation} value={currentFolderId ?? "__root__"} onValueChange={(value) => onMoveConversation(value === "__root__" ? null : value)}>
          <SelectTrigger className="h-11 w-full rounded-2xl">
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
        {selectedFolderName ? <div className="text-xs text-muted-foreground">当前所在文件夹：{selectedFolderName}</div> : null}
      </div>
    </div>
  );
}
