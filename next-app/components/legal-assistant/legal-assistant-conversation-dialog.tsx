"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LegalAssistantConversationDialog({
  open,
  draft,
  setDraft,
  onClose,
  onSubmit,
}: {
  open: boolean;
  draft: string;
  setDraft: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(nextOpen) => (nextOpen ? null : onClose())}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>重命名对话</DialogTitle>
          <DialogDescription>修改当前对话显示名称。</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="conversation-title">对话标题</Label>
          <Input autoFocus id="conversation-title" value={draft} onChange={(event) => setDraft(event.target.value)} />
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
