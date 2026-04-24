import { getApiUrl } from "@/lib/api-url";

export type LegalAssistantRole = "user" | "assistant";

export type LegalAssistantMessage = {
  id: string;
  role: LegalAssistantRole;
  content: string;
  createdAt: string;
  status?: "streaming" | "done" | "error";
  isError?: boolean;
};

export type LegalAssistantConversation = {
  id: string;
  title: string;
  folderId: string | null;
  modelId: string;
  createdAt: string;
  updatedAt: string;
  messages: LegalAssistantMessage[];
};

export type LegalAssistantFolder = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  conversationIds: string[];
};

export type ChatRequestMessage = {
  role: LegalAssistantRole;
  content: string;
};

export type ChatRequestPayload = {
  conversation_id: string;
  folder_id: string | null;
  model_id: string;
  query: string;
  history: ChatRequestMessage[];
  messages: ChatRequestMessage[];
  top_n: number;
  n_results: number;
  threshold: number;
  force_search: boolean;
};

export const LEGAL_ASSISTANT_CHAT_ENDPOINT =
  process.env.NEXT_PUBLIC_LEGAL_ASSISTANT_API_URL?.trim() ||
  getApiUrl("/api/chat");

function extractTextFromUnknownPayload(payload: unknown): string {
  if (typeof payload === "string") {
    return payload;
  }

  if (!payload || typeof payload !== "object") {
    return "";
  }

  const record = payload as Record<string, unknown>;

  const directTextKeys = ["data", "delta", "text", "content", "answer", "message", "response"];
  for (const key of directTextKeys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) {
      return value;
    }
  }

  if (Array.isArray(record.data)) {
    const nested = record.data.map(extractTextFromUnknownPayload).join("");
    if (nested.trim()) {
      return nested;
    }
  }

  if (Array.isArray(record.parts)) {
    const nested = record.parts
      .map((part) => extractTextFromUnknownPayload(part))
      .join("");
    if (nested.trim()) {
      return nested;
    }
  }

  if (Array.isArray(record.choices)) {
    for (const choice of record.choices) {
      if (!choice || typeof choice !== "object") {
        continue;
      }

      const choiceRecord = choice as Record<string, unknown>;
      const deltaText = extractTextFromUnknownPayload(choiceRecord.delta);
      if (deltaText.trim()) {
        return deltaText;
      }

      const messageText = extractTextFromUnknownPayload(choiceRecord.message);
      if (messageText.trim()) {
        return messageText;
      }
    }
  }

  if (record.data && typeof record.data === "object") {
    const nested = extractTextFromUnknownPayload(record.data);
    if (nested.trim()) {
      return nested;
    }
  }

  if (record.message && typeof record.message === "object") {
    const nested = extractTextFromUnknownPayload(record.message);
    if (nested.trim()) {
      return nested;
    }
  }

  return "";
}

export function buildChatRequestPayload(options: {
  conversationId: string;
  folderId: string | null;
  modelId: string;
  messages: LegalAssistantMessage[];
}): ChatRequestPayload {
  const history = options.messages.map((message) => ({
    role: message.role,
    content: message.content,
  }));

  const query = [...options.messages]
    .reverse()
    .find((message) => message.role === "user")?.content
    ?.trim() ?? "";

  return {
    conversation_id: options.conversationId,
    folder_id: options.folderId,
    model_id: options.modelId,
    query,
    history,
    messages: history,
    top_n: 5,
    n_results: 15,
    threshold: -2,
    force_search: true,
  };
}

async function getErrorMessageFromResponse(response: Response): Promise<string> {
  const fallback = `请求失败（${response.status}）`;

  try {
    const raw = await response.text();
    if (!raw.trim()) {
      return fallback;
    }

    try {
      const parsed = JSON.parse(raw) as unknown;
      const extracted = extractTextFromUnknownPayload(parsed).trim();
      if (extracted) {
        return extracted;
      }

      if (parsed && typeof parsed === "object") {
        const record = parsed as Record<string, unknown>;
        const message = record.message;
        if (typeof message === "string" && message.trim()) {
          return message;
        }

        const error = record.error;
        if (typeof error === "string" && error.trim()) {
          return error;
        }
      }
    } catch {
      return raw.trim();
    }

    return raw.trim() || fallback;
  } catch {
    return fallback;
  }
}

function appendStreamPayload(
  payload: string,
  onDelta: (delta: string) => void,
): string {
  const trimmed = payload.trim();
  if (!trimmed || trimmed === "[DONE]") {
    return "";
  }

  try {
    const parsed = JSON.parse(trimmed) as unknown;
    const extracted = extractTextFromUnknownPayload(parsed).trim();
    if (extracted) {
      onDelta(extracted);
      return extracted;
    }
  } catch {
    onDelta(trimmed);
    return trimmed;
  }

  onDelta(trimmed);
  return trimmed;
}

export async function readChatResponse(
  response: Response,
  onDelta: (delta: string) => void,
): Promise<string> {
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const json = (await response.json()) as unknown;
    const extracted = extractTextFromUnknownPayload(json).trim();
    if (extracted) {
      onDelta(extracted);
      return extracted;
    }

    if (json && typeof json === "object") {
      const record = json as Record<string, unknown>;
      const nested = [record.data, record.message, record.response]
        .map((item) => extractTextFromUnknownPayload(item))
        .join("")
        .trim();

      if (nested) {
        onDelta(nested);
        return nested;
      }
    }

    return "";
  }

  if (!response.body) {
    return "";
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let eventLines: string[] = [];
  let assistantText = "";

  const flushEvent = () => {
    if (!eventLines.length) {
      return;
    }

    const dataPayload = eventLines.join("\n");
    eventLines = [];
    assistantText += appendStreamPayload(dataPayload, onDelta);
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() ?? "";

    for (const rawLine of lines) {
      const line = rawLine.trimEnd();

      if (!line.trim()) {
        flushEvent();
        continue;
      }

      if (line.startsWith("data:")) {
        eventLines.push(line.slice(5).trimStart());
        continue;
      }

      if (line.startsWith("event:") || line.startsWith("id:") || line.startsWith("retry:")) {
        continue;
      }

      if (eventLines.length) {
        flushEvent();
      }

      assistantText += appendStreamPayload(line, onDelta);
    }
  }

  if (buffer.trim()) {
    if (buffer.trimStart().startsWith("data:")) {
      eventLines.push(buffer.trimStart().slice(5).trimStart());
      flushEvent();
    } else {
      assistantText += appendStreamPayload(buffer, onDelta);
    }
  } else {
    flushEvent();
  }

  return assistantText.trim();
}

export async function fetchAssistantErrorMessage(response: Response): Promise<string> {
  return getErrorMessageFromResponse(response);
}

export function buildAssistantFetchInit(options: {
  token: string;
  body: ChatRequestPayload;
}): RequestInit {
  return {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${options.token}`,
    },
    credentials: "include",
    body: JSON.stringify(options.body),
  };
}
