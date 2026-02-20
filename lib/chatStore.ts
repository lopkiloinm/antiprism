"use client";

export interface ChatSession {
  id: string;
  title: string;
  createdAt: number;
  modelId: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  responseType?: "ask" | "agent";
  createdPath?: string;
  markdown?: string;
  image?: string;
}

const CHAT_LIST_KEY = "antiprism_chats";

export type ChatOrigin = "big" | "small";

export function getChatKey(origin: ChatOrigin, chatId?: string): string {
  if (origin === "small") {
    // Small chats are tied to the current file/document
    return "antiprism_small_chat";
  } else {
    // Big chats are standalone chat sessions
    return chatId ? `antiprism_chat_${chatId}` : "antiprism_chat";
  }
}

export function listChats(): ChatSession[] {
  try {
    const raw = localStorage.getItem(CHAT_LIST_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function createChat(modelId: string): ChatSession {
  const list = listChats();
  
  // Generate sequential "New Chat" number
  const existingNewChats = list.filter(c => c.title.startsWith("New Chat"));
  const nextNumber = existingNewChats.length + 1;
  const defaultTitle = nextNumber === 1 ? "New Chat" : `New Chat ${nextNumber}`;
  
  const chat: ChatSession = {
    id: `chat-${Date.now()}`,
    title: defaultTitle,
    createdAt: Date.now(),
    modelId,
  };
  list.unshift(chat);
  localStorage.setItem(CHAT_LIST_KEY, JSON.stringify(list));
  return chat;
}

export function deleteChat(id: string, origin: ChatOrigin = "big"): void {
  const list = listChats().filter((c) => c.id !== id);
  localStorage.setItem(CHAT_LIST_KEY, JSON.stringify(list));
  const key = getChatKey(origin, id);
  localStorage.removeItem(key);
}

export function renameChat(id: string, title: string): void {
  const list = listChats();
  const chat = list.find((c) => c.id === id);
  if (chat) {
    chat.title = title;
    localStorage.setItem(CHAT_LIST_KEY, JSON.stringify(list));
  }
}

export function updateChatModel(id: string, modelId: string): void {
  const list = listChats();
  const chat = list.find((c) => c.id === id);
  if (chat) {
    chat.modelId = modelId;
    localStorage.setItem(CHAT_LIST_KEY, JSON.stringify(list));
  }
}

export function getChatMessages(id: string, origin: ChatOrigin = "big"): ChatMessage[] {
  const key = getChatKey(origin, id);
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

const MAX_CHAT_STORAGE_BYTES = 2_000_000;
const MAX_MESSAGE_CONTENT_CHARS = 20_000;
const MAX_IMAGE_DATA_URL_CHARS = 200_000;

function compactMessages(messages: ChatMessage[]): ChatMessage[] {
  return messages.map((m) => ({
    ...m,
    content:
      m.content.length > MAX_MESSAGE_CONTENT_CHARS
        ? `${m.content.slice(0, MAX_MESSAGE_CONTENT_CHARS)}\n\n[truncated]`
        : m.content,
    image:
      m.image && m.image.length > MAX_IMAGE_DATA_URL_CHARS
        ? undefined
        : m.image,
  }));
}

function fitMessagesToQuota(messages: ChatMessage[]): ChatMessage[] {
  let next = compactMessages(messages);
  let payload = JSON.stringify(next);

  // Keep recent context first when over quota.
  while (payload.length > MAX_CHAT_STORAGE_BYTES && next.length > 8) {
    next = next.slice(Math.floor(next.length / 4));
    payload = JSON.stringify(next);
  }

  return next;
}

export function saveChatMessages(id: string, messages: ChatMessage[], origin: ChatOrigin = "big"): void {
  const key = getChatKey(origin, id);
  try {
    const fitted = fitMessagesToQuota(messages);
    localStorage.setItem(key, JSON.stringify(fitted));
    // Auto-title from first assistant response (AI-generated name) or fallback to user message
    if (messages.length >= 2) {
      const firstAssistant = messages.find((m) => m.role === "assistant");
      if (firstAssistant && firstAssistant.content !== "Thinking...") {
        // Extract AI-generated name from first line before first newline
        const lines = firstAssistant.content.split('\n');
        const firstLine = lines[0].trim();
        if (firstLine.length > 0 && firstLine.length <= 50 && !firstLine.includes('#') && !firstLine.includes('*')) {
          renameChat(id, firstLine);
          return;
        }
      }
    }
    // Fallback: use first user message
    if (messages.length > 0) {
      const firstUser = messages.find((m) => m.role === "user");
      if (firstUser) {
        const title = firstUser.content.slice(0, 50) + (firstUser.content.length > 50 ? "…" : "");
        renameChat(id, title);
      }
    }
  } catch (e) {
    // Last chance: keep only latest messages if storage is tight.
    try {
      const minimal = fitMessagesToQuota(messages.slice(-8));
      localStorage.setItem(key, JSON.stringify(minimal));
    } catch (e2) {
      console.error("Failed to save chat messages:", e, e2);
    }
  }
}
