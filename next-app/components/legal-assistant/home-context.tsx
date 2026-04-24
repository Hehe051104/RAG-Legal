"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
} from "react";

import { generateUUID } from "@/lib/utils";

import {
  LEGAL_ASSISTANT_CHAT_ENDPOINT,
  buildAssistantFetchInit,
  buildChatRequestPayload,
  fetchAssistantErrorMessage,
  readChatResponse,
  type LegalAssistantConversation,
  type LegalAssistantFolder,
  type LegalAssistantMessage,
} from "./api";

export type LegalAssistantTheme = "system" | "light" | "dark";

type HomeState = {
  isSideBarOpen: boolean;
  settingsOpen: boolean;
  selectedConversationId: string | null;
  conversations: LegalAssistantConversation[];
  folders: LegalAssistantFolder[];
  modelId: string;
  theme: LegalAssistantTheme;
  isSending: boolean;
};

type StoredHomeState = Pick<
  HomeState,
  | "isSideBarOpen"
  | "selectedConversationId"
  | "conversations"
  | "folders"
  | "modelId"
  | "theme"
>;

type ConversationInput = {
  title?: string;
  folderId?: string | null;
  modelId?: string;
};

type HomeContextValue = HomeState & {
  selectedConversation: LegalAssistantConversation | null;
  selectedFolder: LegalAssistantFolder | null;
  authToken: string;
  createConversation: (options?: ConversationInput) => string;
  selectConversation: (conversationId: string | null) => void;
  renameConversation: (conversationId: string, title: string) => void;
  deleteConversation: (conversationId: string) => void;
  moveConversationToFolder: (conversationId: string, folderId: string | null) => void;
  createFolder: (name: string) => string;
  renameFolder: (folderId: string, name: string) => void;
  deleteFolder: (folderId: string) => void;
  toggleSidebar: () => void;
  setSideBarOpen: (open: boolean) => void;
  setSettingsOpen: (open: boolean) => void;
  setModelId: (modelId: string) => void;
  setTheme: (theme: LegalAssistantTheme) => void;
  clearAll: () => void;
  sendMessage: (content: string) => Promise<void>;
};

const STORAGE_KEY = "legal-assistant-home-state-v1";
const DEFAULT_MODEL_ID = "legal-default";

const initialState: HomeState = {
  isSideBarOpen: true,
  settingsOpen: false,
  selectedConversationId: null,
  conversations: [],
  folders: [],
  modelId: DEFAULT_MODEL_ID,
  theme: "system",
  isSending: false,
};

type Action =
  | { type: "HYDRATE"; payload: StoredHomeState }
  | { type: "SET_SIDEBAR_OPEN"; payload: boolean }
  | { type: "SET_SETTINGS_OPEN"; payload: boolean }
  | { type: "SET_MODEL_ID"; payload: string }
  | { type: "SET_THEME"; payload: LegalAssistantTheme }
  | { type: "SET_SELECTED_CONVERSATION"; payload: string | null }
  | { type: "CREATE_CONVERSATION"; payload: LegalAssistantConversation }
  | { type: "UPSERT_CONVERSATION"; payload: LegalAssistantConversation }
  | { type: "RENAME_CONVERSATION"; payload: { conversationId: string; title: string } }
  | { type: "DELETE_CONVERSATION"; payload: string }
  | { type: "MOVE_CONVERSATION_TO_FOLDER"; payload: { conversationId: string; folderId: string | null } }
  | { type: "CREATE_FOLDER"; payload: LegalAssistantFolder }
  | { type: "RENAME_FOLDER"; payload: { folderId: string; name: string } }
  | { type: "DELETE_FOLDER"; payload: string }
  | {
      type: "APPEND_MESSAGES";
      payload: { conversationId: string; messages: LegalAssistantMessage[] };
    }
  | {
      type: "APPEND_MESSAGE_TEXT";
      payload: { conversationId: string; messageId: string; delta: string };
    }
  | {
      type: "FINALIZE_MESSAGE";
      payload: { conversationId: string; messageId: string; content: string; isError?: boolean };
    }
  | { type: "SET_SENDING"; payload: boolean }
  | { type: "CLEAR_ALL" };

const HomeContext = createContext<HomeContextValue | null>(null);

function safeParseState(raw: string | null): StoredHomeState | null {
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<StoredHomeState>;

    return {
      isSideBarOpen: typeof parsed.isSideBarOpen === "boolean" ? parsed.isSideBarOpen : true,
      selectedConversationId:
        typeof parsed.selectedConversationId === "string" || parsed.selectedConversationId === null
          ? parsed.selectedConversationId ?? null
          : null,
      conversations: Array.isArray(parsed.conversations) ? (parsed.conversations as LegalAssistantConversation[]) : [],
      folders: Array.isArray(parsed.folders) ? (parsed.folders as LegalAssistantFolder[]) : [],
      modelId: typeof parsed.modelId === "string" && parsed.modelId.trim() ? parsed.modelId : DEFAULT_MODEL_ID,
      theme:
        parsed.theme === "dark" || parsed.theme === "light" || parsed.theme === "system"
          ? parsed.theme
          : "system",
    };
  } catch {
    return null;
  }
}

function loadInitialState(): HomeState {
  if (typeof window === "undefined") {
    return initialState;
  }

  const parsed = safeParseState(window.localStorage.getItem(STORAGE_KEY));
  if (!parsed) {
    return initialState;
  }

  return {
    ...initialState,
    ...parsed,
  };
}

function touchConversation(conversation: LegalAssistantConversation): LegalAssistantConversation {
  return {
    ...conversation,
    updatedAt: new Date().toISOString(),
  };
}

function updateConversationMessages(
  conversations: LegalAssistantConversation[],
  conversationId: string,
  updater: (messages: LegalAssistantMessage[]) => LegalAssistantMessage[],
) {
  return conversations.map((conversation) => {
    if (conversation.id !== conversationId) {
      return conversation;
    }

    return touchConversation({
      ...conversation,
      messages: updater(conversation.messages),
    });
  });
}

function addConversationToFolder(
  folders: LegalAssistantFolder[],
  folderId: string | null,
  conversationId: string,
) {
  if (!folderId) {
    return folders;
  }

  return folders.map((folder) =>
    folder.id === folderId
      ? {
          ...folder,
          conversationIds: folder.conversationIds.includes(conversationId)
            ? folder.conversationIds
            : [...folder.conversationIds, conversationId],
          updatedAt: new Date().toISOString(),
        }
      : folder,
  );
}

function removeConversationFromFolders(
  folders: LegalAssistantFolder[],
  conversationId: string,
) {
  return folders.map((folder) => ({
    ...folder,
    conversationIds: folder.conversationIds.filter((currentId) => currentId !== conversationId),
    updatedAt: new Date().toISOString(),
  }));
}

function reducer(state: HomeState, action: Action): HomeState {
  switch (action.type) {
    case "HYDRATE":
      return {
        ...state,
        ...action.payload,
      };

    case "SET_SIDEBAR_OPEN":
      return { ...state, isSideBarOpen: action.payload };

    case "SET_SETTINGS_OPEN":
      return { ...state, settingsOpen: action.payload };

    case "SET_MODEL_ID":
      return { ...state, modelId: action.payload };

    case "SET_THEME":
      return { ...state, theme: action.payload };

    case "SET_SELECTED_CONVERSATION":
      return { ...state, selectedConversationId: action.payload };

    case "CREATE_CONVERSATION": {
      const conversation = action.payload;
      const folders = addConversationToFolder(state.folders, conversation.folderId, conversation.id);

      return {
        ...state,
        conversations: [conversation, ...state.conversations],
        folders,
        selectedConversationId: conversation.id,
      };
    }

    case "UPSERT_CONVERSATION": {
      const exists = state.conversations.some((conversation) => conversation.id === action.payload.id);
      const conversations = exists
        ? state.conversations.map((conversation) =>
            conversation.id === action.payload.id ? action.payload : conversation,
          )
        : [action.payload, ...state.conversations];

      const folders = addConversationToFolder(state.folders, action.payload.folderId, action.payload.id);

      return {
        ...state,
        conversations,
        folders,
      };
    }

    case "RENAME_CONVERSATION":
      return {
        ...state,
        conversations: state.conversations.map((conversation) =>
          conversation.id === action.payload.conversationId
            ? touchConversation({ ...conversation, title: action.payload.title.trim() || conversation.title })
            : conversation,
        ),
      };

    case "DELETE_CONVERSATION": {
      const remainingConversations = state.conversations.filter(
        (conversation) => conversation.id !== action.payload,
      );
      const nextSelectedId =
        state.selectedConversationId === action.payload
          ? remainingConversations[0]?.id ?? null
          : state.selectedConversationId;

      return {
        ...state,
        conversations: remainingConversations,
        folders: removeConversationFromFolders(state.folders, action.payload),
        selectedConversationId: nextSelectedId,
      };
    }

    case "MOVE_CONVERSATION_TO_FOLDER": {
      const foldersWithoutConversation = removeConversationFromFolders(state.folders, action.payload.conversationId);
      const folders = addConversationToFolder(
        foldersWithoutConversation,
        action.payload.folderId,
        action.payload.conversationId,
      );

      return {
        ...state,
        conversations: state.conversations.map((conversation) =>
          conversation.id === action.payload.conversationId
            ? touchConversation({ ...conversation, folderId: action.payload.folderId })
            : conversation,
        ),
        folders,
      };
    }

    case "CREATE_FOLDER":
      return {
        ...state,
        folders: [action.payload, ...state.folders],
      };

    case "RENAME_FOLDER":
      return {
        ...state,
        folders: state.folders.map((folder) =>
          folder.id === action.payload.folderId
            ? {
                ...folder,
                name: action.payload.name.trim() || folder.name,
                updatedAt: new Date().toISOString(),
              }
            : folder,
        ),
      };

    case "DELETE_FOLDER":
      return {
        ...state,
        folders: state.folders.filter((folder) => folder.id !== action.payload),
        conversations: state.conversations.map((conversation) =>
          conversation.folderId === action.payload
            ? touchConversation({ ...conversation, folderId: null })
            : conversation,
        ),
      };

    case "APPEND_MESSAGES":
      return {
        ...state,
        conversations: updateConversationMessages(
          state.conversations,
          action.payload.conversationId,
          (messages) => [...messages, ...action.payload.messages],
        ),
      };

    case "APPEND_MESSAGE_TEXT":
      return {
        ...state,
        conversations: updateConversationMessages(
          state.conversations,
          action.payload.conversationId,
          (messages) =>
            messages.map((message) =>
              message.id === action.payload.messageId
                ? {
                    ...message,
                    content: `${message.content}${action.payload.delta}`,
                    status: "streaming",
                  }
                : message,
            ),
        ),
      };

    case "FINALIZE_MESSAGE":
      return {
        ...state,
        conversations: updateConversationMessages(
          state.conversations,
          action.payload.conversationId,
          (messages) =>
            messages.map((message) =>
              message.id === action.payload.messageId
                ? {
                    ...message,
                    content: action.payload.content,
                    status: action.payload.isError ? "error" : "done",
                    isError: action.payload.isError ?? false,
                  }
                : message,
            ),
        ),
      };

    case "SET_SENDING":
      return { ...state, isSending: action.payload };

    case "CLEAR_ALL":
      return {
        ...initialState,
        isSideBarOpen: state.isSideBarOpen,
        theme: state.theme,
        modelId: state.modelId,
      };

    default:
      return state;
  }
}

function applyTheme(theme: LegalAssistantTheme) {
  if (typeof document === "undefined") {
    return;
  }

  const root = document.documentElement;

  if (theme === "system") {
    root.classList.toggle("dark", window.matchMedia("(prefers-color-scheme: dark)").matches);
    return;
  }

  root.classList.toggle("dark", theme === "dark");
}

export function HomeProvider({
  children,
  authToken,
}: {
  children: React.ReactNode;
  authToken: string;
}) {
  const [state, dispatch] = useReducer(reducer, undefined, loadInitialState);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated || typeof window === "undefined") {
      return;
    }

    const stored: StoredHomeState = {
      isSideBarOpen: state.isSideBarOpen,
      selectedConversationId: state.selectedConversationId,
      conversations: state.conversations,
      folders: state.folders,
      modelId: state.modelId,
      theme: state.theme,
    };

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  }, [hydrated, state]);

  useEffect(() => {
    applyTheme(state.theme);

    if (typeof window === "undefined" || state.theme !== "system") {
      return;
    }

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => applyTheme("system");

    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, [state.theme]);

  const createConversation = useCallback(
    (options?: ConversationInput) => {
      const now = new Date().toISOString();
      const conversation: LegalAssistantConversation = {
        id: generateUUID(),
        title: options?.title?.trim() || "新对话",
        folderId: options?.folderId ?? null,
        modelId: options?.modelId ?? state.modelId,
        createdAt: now,
        updatedAt: now,
        messages: [],
      };

      dispatch({ type: "CREATE_CONVERSATION", payload: conversation });
      return conversation.id;
    },
    [state.modelId],
  );

  const renameConversation = useCallback((conversationId: string, title: string) => {
    dispatch({ type: "RENAME_CONVERSATION", payload: { conversationId, title } });
  }, []);

  const deleteConversation = useCallback((conversationId: string) => {
    dispatch({ type: "DELETE_CONVERSATION", payload: conversationId });
  }, []);

  const moveConversationToFolder = useCallback((conversationId: string, folderId: string | null) => {
    dispatch({ type: "MOVE_CONVERSATION_TO_FOLDER", payload: { conversationId, folderId } });
  }, []);

  const createFolder = useCallback((name: string) => {
    const now = new Date().toISOString();
    const folder: LegalAssistantFolder = {
      id: generateUUID(),
      name: name.trim() || "新文件夹",
      createdAt: now,
      updatedAt: now,
      conversationIds: [],
    };

    dispatch({ type: "CREATE_FOLDER", payload: folder });
    return folder.id;
  }, []);

  const renameFolder = useCallback((folderId: string, name: string) => {
    dispatch({ type: "RENAME_FOLDER", payload: { folderId, name } });
  }, []);

  const deleteFolder = useCallback((folderId: string) => {
    dispatch({ type: "DELETE_FOLDER", payload: folderId });
  }, []);

  const clearAll = useCallback(() => {
    dispatch({ type: "CLEAR_ALL" });
  }, []);

  const sendMessage = useCallback(
    async (content: string) => {
      const text = content.trim();
      if (!text || !authToken || state.isSending) {
        return;
      }

      const existingConversation =
        state.conversations.find((item) => item.id === state.selectedConversationId) ?? null;
      const now = new Date().toISOString();
      const conversation = existingConversation ?? {
        id: generateUUID(),
        title: text.slice(0, 28) || "新对话",
        folderId: null,
        modelId: state.modelId,
        createdAt: now,
        updatedAt: now,
        messages: [],
      };

      const userMessage: LegalAssistantMessage = {
        id: generateUUID(),
        role: "user",
        content: text,
        createdAt: new Date().toISOString(),
        status: "done",
      };

      const assistantMessageId = generateUUID();
      const assistantPlaceholder: LegalAssistantMessage = {
        id: assistantMessageId,
        role: "assistant",
        content: "",
        createdAt: new Date().toISOString(),
        status: "streaming",
      };

      const conversationForState = touchConversation({
        ...conversation,
        modelId: state.modelId,
        title: conversation.title === "新对话" || !conversation.title.trim() ? text.slice(0, 28) || "新对话" : conversation.title,
        messages: [...conversation.messages, userMessage, assistantPlaceholder],
      });

      dispatch({ type: "UPSERT_CONVERSATION", payload: conversationForState });
      dispatch({ type: "SET_SELECTED_CONVERSATION", payload: conversationForState.id });

      dispatch({ type: "SET_SENDING", payload: true });

      const requestMessages = [...conversation.messages, userMessage];
      const requestBody = buildChatRequestPayload({
        conversationId: conversationForState.id,
        folderId: conversationForState.folderId,
        modelId: conversationForState.modelId,
        messages: requestMessages,
      });

      try {
        const response = await fetch(
          LEGAL_ASSISTANT_CHAT_ENDPOINT,
          buildAssistantFetchInit({
            token: authToken,
            body: requestBody,
          }),
        );

        if (!response.ok) {
          const message = await fetchAssistantErrorMessage(response);
          throw new Error(message);
        }

        let assistantText = "";
        const streamedText = await readChatResponse(response, (delta) => {
          assistantText += delta;
          dispatch({
            type: "APPEND_MESSAGE_TEXT",
            payload: {
              conversationId: conversationForState.id,
              messageId: assistantMessageId,
              delta,
            },
          });
        });

        const finalText = (assistantText || streamedText || "后端已响应，但未返回可展示文本。").trim();
        dispatch({
          type: "FINALIZE_MESSAGE",
          payload: {
            conversationId: conversationForState.id,
            messageId: assistantMessageId,
            content: finalText,
            isError: false,
          },
        });

        if (conversationForState.title === "新对话" || conversationForState.title === "") {
          dispatch({
            type: "RENAME_CONVERSATION",
            payload: {
              conversationId: conversationForState.id,
              title: text.slice(0, 28),
            },
          });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "请求后端失败，请检查 API 地址和登录状态。";
        dispatch({
          type: "FINALIZE_MESSAGE",
          payload: {
            conversationId: conversationForState.id,
            messageId: assistantMessageId,
            content: `请求后端失败：${message}`,
            isError: true,
          },
        });
      } finally {
        dispatch({ type: "SET_SENDING", payload: false });
      }
    },
    [authToken, state.conversations, state.isSending, state.modelId, state.selectedConversationId],
  );

  const selectedConversation = useMemo(
    () => state.conversations.find((conversation) => conversation.id === state.selectedConversationId) ?? null,
    [state.conversations, state.selectedConversationId],
  );

  const selectedFolder = useMemo(() => {
    if (!selectedConversation?.folderId) {
      return null;
    }

    return state.folders.find((folder) => folder.id === selectedConversation.folderId) ?? null;
  }, [selectedConversation?.folderId, state.folders]);

  const value = useMemo<HomeContextValue>(
    () => ({
      ...state,
      selectedConversation,
      selectedFolder,
      authToken,
      createConversation,
      selectConversation: (conversationId) => dispatch({ type: "SET_SELECTED_CONVERSATION", payload: conversationId }),
      renameConversation,
      deleteConversation,
      moveConversationToFolder,
      createFolder,
      renameFolder,
      deleteFolder,
      toggleSidebar: () => dispatch({ type: "SET_SIDEBAR_OPEN", payload: !state.isSideBarOpen }),
      setSideBarOpen: (open) => dispatch({ type: "SET_SIDEBAR_OPEN", payload: open }),
      setSettingsOpen: (open) => dispatch({ type: "SET_SETTINGS_OPEN", payload: open }),
      setModelId: (modelId) => dispatch({ type: "SET_MODEL_ID", payload: modelId }),
      setTheme: (theme) => dispatch({ type: "SET_THEME", payload: theme }),
      clearAll,
      sendMessage,
    }),
    [
      authToken,
      clearAll,
      createConversation,
      createFolder,
      deleteConversation,
      deleteFolder,
      moveConversationToFolder,
      renameConversation,
      renameFolder,
      selectedConversation,
      selectedFolder,
      sendMessage,
      state,
    ],
  );

  return <HomeContext.Provider value={value}>{children}</HomeContext.Provider>;
}

export function useHome() {
  const context = useContext(HomeContext);

  if (!context) {
    throw new Error("useHome must be used within a HomeProvider.");
  }

  return context;
}
