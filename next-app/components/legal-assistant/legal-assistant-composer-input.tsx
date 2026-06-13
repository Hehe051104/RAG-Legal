"use client";

import { PaperclipIcon, XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { LegalAssistantComposerSendButton } from "./legal-assistant-composer-send-button";
import { LegalAssistantComposerTextarea } from "./legal-assistant-composer-textarea";

type PendingFile = {
  file: File;
  previewUrl: string | null;
};

type LegalAssistantComposerInputProps = {
  value: string;
  canSubmit: boolean;
  isSending: boolean;
  pendingFile: PendingFile | null;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onKeyDown?: (event: React.KeyboardEvent) => void;
  onFileSelect: () => void;
  onFileRemove: () => void;
};

export function LegalAssistantComposerInput({
  value,
  canSubmit,
  isSending,
  pendingFile,
  onChange,
  onSubmit,
  onKeyDown,
  onFileSelect,
  onFileRemove,
}: LegalAssistantComposerInputProps) {
  const handleSubmit = () => {
    if (!canSubmit) {
      return;
    }

    onSubmit();
  };

  return (
    <div className="flex flex-col gap-2" aria-disabled={isSending}>
      {pendingFile && (
        <div className="flex items-center gap-2 rounded-lg border border-border/30 bg-muted/30 px-3 py-2">
          {pendingFile.previewUrl ? (
            <img
              alt={pendingFile.file.name}
              className="size-10 rounded object-cover"
              src={pendingFile.previewUrl}
            />
          ) : (
            <div className="flex size-10 items-center justify-center rounded bg-muted text-[10px] text-muted-foreground">
              {pendingFile.file.name.split(".").pop()?.toUpperCase() || "FILE"}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12px] text-foreground">{pendingFile.file.name}</p>
            <p className="text-[10px] text-muted-foreground">
              {(pendingFile.file.size / 1024).toFixed(1)} KB
            </p>
          </div>
          <Button
            aria-label="移除文件"
            className="size-6 shrink-0 text-muted-foreground hover:text-foreground"
            onClick={onFileRemove}
            size="icon-sm"
            type="button"
            variant="ghost"
          >
            <XIcon className="size-3.5" />
          </Button>
        </div>
      )}

      <div className="flex items-end gap-2">
        <Button
          aria-label="上传文件"
          className="size-8 shrink-0 rounded-lg text-muted-foreground hover:text-foreground"
          disabled={isSending}
          onClick={onFileSelect}
          size="icon-sm"
          type="button"
          variant="ghost"
        >
          <PaperclipIcon className="size-4" />
        </Button>

        <LegalAssistantComposerTextarea
          disabled={isSending}
          onChange={onChange}
          onSubmit={handleSubmit}
          onKeyDown={onKeyDown}
          value={value}
        />

        <LegalAssistantComposerSendButton disabled={!canSubmit} onSubmit={handleSubmit} />
      </div>
    </div>
  );
}
