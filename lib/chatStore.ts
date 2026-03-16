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
  responseType?: "ask" | "agent" | "edit";
  createdPath?: string;
  markdown?: string;
  image?: string;
  thinkingExpanded?: boolean;
  thinkingContent?: string;
  thinkingStartedAt?: number;
  thinkingDurationMs?: number;
}

const CHAT_LIST_KEY = "antiprism_chats";

export type ChatOrigin = "big" | "small";

export function getProjectChatListKey(projectId: string): string {
  return `antiprism_chats_${projectId}`;
}

export function getProjectChatKey(projectId: string, origin: ChatOrigin, chatId?: string): string {
  if (origin === "small") {
    // Small chats are tied to the current file/document
    return `antiprism_small_chat_${projectId}`;
  } else {
    // Big chats are standalone chat sessions
    return chatId ? `antiprism_chat_${projectId}_${chatId}` : `antiprism_chat_${projectId}`;
  }
}

// Legacy functions for backward compatibility
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

export function listProjectChats(projectId: string): ChatSession[] {
  try {
    const key = getProjectChatListKey(projectId);
    const raw = localStorage.getItem(key);
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

export function createProjectChat(projectId: string, modelId: string): ChatSession {
  const list = listProjectChats(projectId);
  
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
  localStorage.setItem(getProjectChatListKey(projectId), JSON.stringify(list));
  return chat;
}

export function deleteChat(id: string, origin: ChatOrigin = "big"): void {
  const list = listChats().filter((c) => c.id !== id);
  localStorage.setItem(CHAT_LIST_KEY, JSON.stringify(list));
  const key = getChatKey(origin, id);
  localStorage.removeItem(key);
}

export function deleteProjectChat(projectId: string, id: string, origin: ChatOrigin = "big"): void {
  const list = listProjectChats(projectId).filter((c) => c.id !== id);
  localStorage.setItem(getProjectChatListKey(projectId), JSON.stringify(list));
  const key = getProjectChatKey(projectId, origin, id);
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

export function renameProjectChat(projectId: string, id: string, title: string): void {
  const list = listProjectChats(projectId);
  const chat = list.find((c) => c.id === id);
  if (chat) {
    chat.title = title;
    localStorage.setItem(getProjectChatListKey(projectId), JSON.stringify(list));
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

export function updateProjectChatModel(projectId: string, id: string, modelId: string): void {
  const list = listProjectChats(projectId);
  const chat = list.find((c) => c.id === id);
  if (chat) {
    chat.modelId = modelId;
    localStorage.setItem(getProjectChatListKey(projectId), JSON.stringify(list));
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

export function getProjectChatMessages(projectId: string, id: string, origin: ChatOrigin = "big"): ChatMessage[] {
  const key = getProjectChatKey(projectId, origin, id);
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

const MAX_MESSAGE_CONTENT_CHARS = 20_000;

function compactMessages(messages: ChatMessage[]): ChatMessage[] {
  return messages.map((m) => ({
    ...m,
    content:
      m.content.length > MAX_MESSAGE_CONTENT_CHARS
        ? `${m.content.slice(0, MAX_MESSAGE_CONTENT_CHARS)}\n\n[truncated]`
        : m.content,
    // No more image size restrictions - keep all images
    image: m.image,
  }));
}

function fitMessagesToQuota(messages: ChatMessage[]): ChatMessage[] {
  // No more storage restrictions - keep all messages
  return compactMessages(messages);
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

export function saveProjectChatMessages(projectId: string, id: string, messages: ChatMessage[], origin: ChatOrigin = "big"): void {
  const key = getProjectChatKey(projectId, origin, id);
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
          renameProjectChat(projectId, id, firstLine);
          return;
        }
      }
    }
    // Fallback: use first user message
    if (messages.length > 0) {
      const firstUser = messages.find((m) => m.role === "user");
      if (firstUser) {
        const title = firstUser.content.slice(0, 50) + (firstUser.content.length > 50 ? "…" : "");
        renameProjectChat(projectId, id, title);
      }
    }
  } catch (e) {
    // Last chance: keep only latest messages if storage is tight.
    try {
      const minimal = fitMessagesToQuota(messages.slice(-8));
      localStorage.setItem(key, JSON.stringify(minimal));
    } catch (e2) {
      console.error("Failed to save project chat messages:", e, e2);
    }
  }
}
