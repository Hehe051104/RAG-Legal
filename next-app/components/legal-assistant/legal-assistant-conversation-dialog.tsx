"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type LegalAssistantConversationDialogProps = {
  open: boolean;
  draft: string;
  setDraft: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
};

export function LegalAssistantConversationDialog({
  open,
  draft,
  setDraft,
  onClose,
  onSubmit,
}: LegalAssistantConversationDialogProps) {
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
          <DialogTitle>重命名对话</DialogTitle>
          <DialogDescription>更新当前会话标题，便于在侧栏快速检索。</DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-1">
          <Label htmlFor="conversation-title">对话标题</Label>
          <Input autoFocus className="h-10" id="conversation-title" onChange={(event) => setDraft(event.target.value)} value={draft} />
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
