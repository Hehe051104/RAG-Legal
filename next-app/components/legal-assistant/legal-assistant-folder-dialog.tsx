"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LegalAssistantFolderDialog({
  open,
  mode,
  draft,
  setDraft,
  onClose,
  onSubmit,
}: {
  open: boolean;
  mode: "create" | "rename";
  draft: string;
  setDraft: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(nextOpen) => (nextOpen ? null : onClose())}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "新建文件夹" : "重命名文件夹"}</DialogTitle>
          <DialogDescription>输入一个新的文件夹名称。</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="folder-name">文件夹名称</Label>
          <Input autoFocus id="folder-name" value={draft} onChange={(event) => setDraft(event.target.value)} />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            取消
          </Button>
          <Button type="button" onClick={onSubmit}>
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
