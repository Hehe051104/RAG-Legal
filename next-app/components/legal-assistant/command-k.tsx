"use client";

import { Loader2Icon, SendIcon } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

import { useHome } from "./home-context";

export function CommandK() {
  const { authToken, sendMessage } = useHome();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleCommand = async () => {
    const text = value.trim();
    if (!text || !authToken) return;

    try {
      setLoading(true);
      await sendMessage(text);
      setValue("");
      setOpen(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Command K</DialogTitle>
          <DialogDescription>
            输入一句话直接发到当前法律会话，走你自己的 JWT 和后端。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Textarea
            autoFocus
            className="min-h-32 rounded-2xl"
            onChange={(event) => setValue(event.target.value)}
            placeholder="比如：帮我概括合同无效的要点"
            value={value}
          />
          <div className="flex justify-end gap-2">
            <Button onClick={() => setOpen(false)} type="button" variant="ghost">
              取消
            </Button>
            <Button onClick={handleCommand} disabled={!value.trim() || loading} type="button">
              {loading ? <Loader2Icon className="size-4 animate-spin" /> : <SendIcon className="size-4" />}
              发送
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
