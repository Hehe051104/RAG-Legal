import { getApiUrl } from "@/lib/api-url";

export type LegalAssistantRole = "user" | "assistant";

export type LegalReference = {
  source: string;
  article: string;
  content: string;
  score: number;
  hierarchy?: {
    book?: string;
    chapter?: string;
    section?: string;
  };
  doc_type?: string;
  method?: string;
};

export type IracSections = {
  issue: string;
  rule: string;
  application: string;
  conclusion: string;
};

export type LegalAssistantMessage = {
  id: string;
  role: LegalAssistantRole;
  content: string;
  references?: LegalReference[];
  irac?: IracSections;
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
  stream: boolean;
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
    stream: true,
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
): ParsedContent {
  const trimmed = normalizeChunkText(payload);
  if (!trimmed || trimmed === "[DONE]") {
    return { text: "", references: [] };
  }

  try {
    const parsed = JSON.parse(trimmed) as unknown;
    const result = parseJsonContent(parsed, onDelta);
    if (result.text || result.references.length > 0 || result.irac) {
      return result;
    }
  } catch {
    onDelta(trimmed);
    return { text: trimmed, references: [] };
  }

  onDelta(trimmed);
  return { text: trimmed, references: [] };
}

function extractReferencesFromPayload(json: unknown): LegalReference[] {
  if (!isRecord(json)) {
    return [];
  }

  const refs = json.references;
  if (!Array.isArray(refs)) {
    return [];
  }

  return refs.filter(isRecord).map((ref) => ({
    source: typeof ref.source === "string" ? ref.source : "未知",
    article: typeof ref.article === "string" ? ref.article : "未知",
    content: typeof ref.content === "string" ? ref.content : "",
    score: typeof ref.score === "number" ? ref.score : 0,
    hierarchy: isRecord(ref.hierarchy)
      ? {
          book: typeof ref.hierarchy.book === "string" ? ref.hierarchy.book : undefined,
          chapter: typeof ref.hierarchy.chapter === "string" ? ref.hierarchy.chapter : undefined,
          section: typeof ref.hierarchy.section === "string" ? ref.hierarchy.section : undefined,
        }
      : undefined,
    doc_type: typeof ref.doc_type === "string" ? ref.doc_type : undefined,
    method: typeof ref.method === "string" ? ref.method : undefined,
  }));
}

function extractIracFromPayload(json: unknown): IracSections | undefined {
  if (!isRecord(json)) {
    return undefined;
  }

  const irac = json.irac;
  if (!isRecord(irac)) {
    return undefined;
  }

  const issue = typeof irac.issue === "string" ? irac.issue : "";
  const rule = typeof irac.rule === "string" ? irac.rule : "";
  const application = typeof irac.application === "string" ? irac.application : "";
  const conclusion = typeof irac.conclusion === "string" ? irac.conclusion : "";

  if (!issue && !rule && !application && !conclusion) {
    return undefined;
  }

  return { issue, rule, application, conclusion };
}

type ParsedContent = {
  text: string;
  references: LegalReference[];
  irac?: IracSections;
};

function parseJsonContent(
  json: unknown,
  onDelta: (delta: string) => void,
): ParsedContent {
  const references = extractReferencesFromPayload(json);
  const irac = extractIracFromPayload(json);

  const extracted = extractTextFromUnknownPayload(json).trim();
  if (extracted) {
    onDelta(extracted);
    return { text: extracted, references, irac };
  }

  if (isRecord(json)) {
    const nested = [json.data, json.message, json.response]
      .map((item) => extractTextFromUnknownPayload(item))
      .join("")
      .trim();

    if (nested) {
      onDelta(nested);
      return { text: nested, references, irac };
    }
  }

  return { text: "", references, irac };
}

export async function readChatResponse(
  response: Response,
  onDelta: (delta: string) => void,
): Promise<{ text: string; references: LegalReference[]; irac?: IracSections }> {
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const json = (await response.json()) as unknown;
    return parseJsonContent(json, onDelta);
  }

  if (!response.body) {
    return { text: "", references: [] };
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let eventLines: string[] = [];
  let assistantText = "";
  let accumulatedReferences: LegalReference[] = [];
  let accumulatedIrac: IracSections | undefined;

  const flushEvent = () => {
    if (!eventLines.length) {
      return;
    }

    const dataPayload = eventLines.join("\n");
    eventLines = [];
    const result = appendStreamPayload(dataPayload, onDelta);
    assistantText += result.text;
    if (result.references.length > 0) {
      accumulatedReferences = result.references;
    }
    if (result.irac) {
      accumulatedIrac = result.irac;
    }
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

      const result = appendStreamPayload(line, onDelta);
      assistantText += result.text;
      if (result.references.length > 0) {
        accumulatedReferences = result.references;
      }
    }
  }

  if (buffer.trim()) {
    if (buffer.trimStart().startsWith("data:")) {
      eventLines.push(buffer.trimStart().slice(5).trimStart());
      flushEvent();
    } else {
      const result = appendStreamPayload(buffer, onDelta);
      assistantText += result.text;
      if (result.references.length > 0) {
        accumulatedReferences = result.references;
      }
    }
  } else {
    flushEvent();
  }

  return { text: assistantText.trim(), references: accumulatedReferences, irac: accumulatedIrac };
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
