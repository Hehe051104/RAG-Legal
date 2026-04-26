"use client";

const PREVIEW_MAX_LENGTH = 48;

export function getLegalAssistantConversationPreview(content: string) {
  const normalized = content
    .replace(/\r\n|\r|\n/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) {
    return "暂无消息";
  }

  if (normalized.length <= PREVIEW_MAX_LENGTH) {
    return normalized;
  }

  return `${normalized.slice(0, PREVIEW_MAX_LENGTH)}...`;
}
