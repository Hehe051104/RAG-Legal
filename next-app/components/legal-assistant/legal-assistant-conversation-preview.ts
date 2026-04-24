"use client";

export function getLegalAssistantConversationPreview(content: string) {
  return content.trim().replace(/\s+/g, " ").slice(0, 36);
}
