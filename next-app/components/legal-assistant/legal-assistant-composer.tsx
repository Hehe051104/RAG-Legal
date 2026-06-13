"use client";

import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useCallback, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { useHome } from "./home-context";
import { LegalAssistantComposerInput } from "./legal-assistant-composer-input";
import {
  type SlashCommand,
  SlashCommandMenu,
} from "@/components/chat/slash-commands";

type PendingFile = {
  file: File;
  previewUrl: string | null;
};

export function LegalAssistantComposer() {
  const router = useRouter();
  const { setTheme, resolvedTheme } = useTheme();
  const { isSending, sendMessage, deleteConversation, selectedConversationId, clearAll } = useHome();
  const [input, setInput] = useState("");
  const [slashOpen, setSlashOpen] = useState(false);
  const [slashQuery, setSlashQuery] = useState("");
  const [slashIndex, setSlashIndex] = useState(0);

  // 文件上传状态
  const [pendingFile, setPendingFile] = useState<PendingFile | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasText = useMemo(() => input.trim().length > 0, [input]);
  const canSubmit = (hasText || pendingFile !== null) && !isSending;

  // --- 文件上传 ---

  const handleFileSelect = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) {
        return;
      }

      const isImage = file.type.startsWith("image/");
      const previewUrl = isImage ? URL.createObjectURL(file) : null;
      setPendingFile({ file, previewUrl });

      // 重置 input 以便同一文件可以再次选择
      event.target.value = "";
    },
    [],
  );

  const handleFileRemove = useCallback(() => {
    if (pendingFile?.previewUrl) {
      URL.revokeObjectURL(pendingFile.previewUrl);
    }
    setPendingFile(null);
  }, [pendingFile]);

  // TODO: 接入后端 /api/upload 接口，上传文件并获取 URL
  // const handleUpload = useCallback(async (file: File) => {
  //   const token = /* 从 auth 上下文获取 */;
  //   const result = await uploadFile(file, token);
  //   return result.url;
  // }, []);

  // --- 斜杠命令 ---

  const handleSlashSelect = useCallback(
    (cmd: SlashCommand) => {
      setSlashOpen(false);
      setInput("");
      switch (cmd.action) {
        case "new":
          router.push("/legal-assistant");
          break;
        case "clear":
          clearAll();
          toast.success("已清空所有对话");
          break;
        case "rename":
          toast("请在侧边栏中右键点击对话进行重命名");
          break;
        case "theme":
          setTheme(resolvedTheme === "dark" ? "light" : "dark");
          break;
        case "delete":
          if (selectedConversationId) {
            deleteConversation(selectedConversationId);
            toast.success("对话已删除");
          }
          break;
        case "purge":
          clearAll();
          toast.success("已清空所有对话");
          break;
        default:
          break;
      }
    },
    [router, setTheme, resolvedTheme, clearAll, deleteConversation, selectedConversationId],
  );

  const handleSlashKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (!slashOpen) {
        return;
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();
        setSlashIndex((prev) => prev + 1);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setSlashIndex((prev) => Math.max(0, prev - 1));
      } else if (event.key === "Enter" || event.key === "Tab") {
        event.preventDefault();
        const cmds = [
          { name: "new", action: "new" },
          { name: "clear", action: "clear" },
          { name: "rename", action: "rename" },
          { name: "model", action: "model" },
          { name: "theme", action: "theme" },
          { name: "delete", action: "delete" },
          { name: "purge", action: "purge" },
        ].filter((c) => c.name.startsWith(slashQuery.toLowerCase()));
        if (cmds[slashIndex]) {
          handleSlashSelect(cmds[slashIndex] as SlashCommand);
        }
      } else if (event.key === "Escape") {
        setSlashOpen(false);
      }
    },
    [slashOpen, slashQuery, slashIndex, handleSlashSelect],
  );

  const handleInputChange = useCallback(
    (value: string) => {
      setInput(value);
      if (value.startsWith("/") && !value.includes(" ")) {
        setSlashOpen(true);
        setSlashQuery(value.slice(1));
        setSlashIndex(0);
      } else {
        setSlashOpen(false);
      }
    },
    [],
  );

  // --- 提交 ---

  const handleSubmit = useCallback(() => {
    if (!canSubmit) {
      return;
    }

    setSlashOpen(false);

    // TODO: 如果有 pendingFile，先调用 handleUpload 获取文件 URL，附加到消息中
    if (pendingFile) {
      // 当前直接忽略文件，仅发送文本
      // 后续接入 upload API 后，将文件 URL 附加到消息体
      toast.info(`文件 "${pendingFile.file.name}" 已选择，上传功能开发中`);
      if (pendingFile.previewUrl) {
        URL.revokeObjectURL(pendingFile.previewUrl);
      }
      setPendingFile(null);
    }

    if (hasText) {
      void sendMessage(input);
      setInput("");
    }
  }, [canSubmit, pendingFile, hasText, input, sendMessage]);

  return (
    <form
      className="relative rounded-2xl border border-border/30 bg-card/70 p-3 shadow-[var(--shadow-composer)] backdrop-blur transition-shadow duration-300 focus-within:shadow-[var(--shadow-composer-focus)]"
      data-testid="legal-assistant-composer"
      onSubmit={(event) => {
        event.preventDefault();
        handleSubmit();
      }}
    >
      {slashOpen && (
        <SlashCommandMenu
          query={slashQuery}
          onSelect={handleSlashSelect}
          onClose={() => setSlashOpen(false)}
          selectedIndex={slashIndex}
        />
      )}

      {/* 隐藏的文件选择器 */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept="image/*,.pdf,.doc,.docx,.txt"
        onChange={handleFileChange}
      />

      <LegalAssistantComposerInput
        canSubmit={canSubmit}
        isSending={isSending}
        pendingFile={pendingFile}
        value={input}
        onChange={handleInputChange}
        onSubmit={handleSubmit}
        onKeyDown={handleSlashKeyDown}
        onFileSelect={handleFileSelect}
        onFileRemove={handleFileRemove}
      />

      <div className="mt-2 px-1 text-[11px] text-muted-foreground/80">
        {isSending ? "正在生成回复..." : "Enter 发送，Shift+Enter 换行，/ 命令"}
      </div>
    </form>
  );
}
