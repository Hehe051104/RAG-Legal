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

const TEXT_KEYS = ["data", "delta", "text", "content", "answer", "message", "response"] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function normalizeChunkText(text: string): string {
  return text.trim();
}

function extractTextFromUnknownPayload(payload: unknown): string {
  if (typeof payload === "string") {
    return payload;
  }

  if (!isRecord(payload)) {
    return "";
  }

  for (const key of TEXT_KEYS) {
    const value = payload[key];
    if (typeof value === "string" && value.trim()) {
      return value;
    }
  }

  const dataValue = payload.data;
  if (Array.isArray(dataValue)) {
    const nested = dataValue.map((item) => extractTextFromUnknownPayload(item)).join("");
    if (nested.trim()) {
      return nested;
    }
  }

  const partsValue = payload.parts;
  if (Array.isArray(partsValue)) {
    const nested = partsValue.map((item) => extractTextFromUnknownPayload(item)).join("");
    if (nested.trim()) {
      return nested;
    }
  }

  const choicesValue = payload.choices;
  if (Array.isArray(choicesValue)) {
    for (const choice of choicesValue) {
      if (!isRecord(choice)) {
        continue;
      }

      const deltaText = extractTextFromUnknownPayload(choice.delta);
      if (deltaText.trim()) {
        return deltaText;
      }

      const messageText = extractTextFromUnknownPayload(choice.message);
      if (messageText.trim()) {
        return messageText;
      }
    }
  }

  const nestedData = extractTextFromUnknownPayload(payload.data);
  if (nestedData.trim()) {
    return nestedData;
  }

  const nestedMessage = extractTextFromUnknownPayload(payload.message);
  if (nestedMessage.trim()) {
    return nestedMessage;
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

      if (isRecord(parsed)) {
        const message = parsed.message;
        if (typeof message === "string" && message.trim()) {
          return message;
        }

        const error = parsed.error;
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
  const trimmed = normalizeChunkText(payload);
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

function parseJsonContent(json: unknown, onDelta: (delta: string) => void): string {
  const extracted = extractTextFromUnknownPayload(json).trim();
  if (extracted) {
    onDelta(extracted);
    return extracted;
  }

  if (isRecord(json)) {
    const nested = [json.data, json.message, json.response]
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

export async function readChatResponse(
  response: Response,
  onDelta: (delta: string) => void,
): Promise<string> {
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const json = (await response.json()) as unknown;
    return parseJsonContent(json, onDelta);
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
