"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type LegalAssistantFolderDialogProps = {
  open: boolean;
  mode: "create" | "rename";
  draft: string;
  setDraft: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
};

export function LegalAssistantFolderDialog({
  open,
  mode,
  draft,
  setDraft,
  onClose,
  onSubmit,
}: LegalAssistantFolderDialogProps) {
  return (
    <Dialog
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          onClose();
        }
      }}
      open={open}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "创建文件夹" : "重命名文件夹"}</DialogTitle>
          <DialogDescription>用于组织会话列表，名称会立即同步到侧栏。</DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-1">
          <Label htmlFor="folder-name">文件夹名称</Label>
          <Input autoFocus className="h-10" id="folder-name" onChange={(event) => setDraft(event.target.value)} value={draft} />
        </div>

        <DialogFooter>
          <Button onClick={onClose} type="button" variant="outline">
            取消
          </Button>
          <Button onClick={onSubmit} type="button">
            确认
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
