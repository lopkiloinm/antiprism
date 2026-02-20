"use client";

import { useState, useRef, useEffect } from "react";
import { NameModal } from "./NameModal";
import { IconMessageSquare, IconPencil, IconDownload, IconTrash2 } from "./Icons";
import { renameChat, deleteChat, getChatMessages, type ChatSession } from "@/lib/chatStore";
import { useContextMenu } from "@/contexts/ContextMenuContext";

interface ChatTreeProps {
  onChatSelect: (chatId: string) => void;
  refreshTrigger?: number;
  onRefresh: () => void;
  searchQuery?: string;
}

function ChatNodeComponent({
  chat,
  onChatSelect,
  onRefresh,
  onOpenRenameModal,
  level,
  refreshTrigger,
}: {
  chat: ChatSession;
  onChatSelect: (chatId: string) => void;
  onRefresh: () => void;
  onOpenRenameModal: (chat: ChatSession) => void;
  level: number;
  refreshTrigger?: number;
}) {
  const { showContextMenu } = useContextMenu();

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    
    const menuItems = [
      {
        label: "Rename",
        icon: <IconPencil />,
        onClick: () => onOpenRenameModal(chat)
      },
      {
        label: "Download",
        icon: <IconDownload />,
        onClick: async () => {
          try {
            const messages = await getChatMessages(chat.id);
            const content = JSON.stringify(messages, null, 2);
            const blob = new Blob([content], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `${chat.title.replace(/[^a-zA-Z0-9]/g, "_")}_messages.json`;
            a.click();
            URL.revokeObjectURL(url);
          } catch (e) {
            console.error("Download failed:", e);
          }
        }
      },
      {
        label: "Delete",
        icon: <IconTrash2 />,
        danger: true,
        onClick: async () => {
          if (!confirm(`Delete chat "${chat.title}"?`)) return;
          try {
            await deleteChat(chat.id);
            onRefresh();
          } catch (e) {
            console.error("Delete failed:", e);
          }
        }
      }
    ];
    
    showContextMenu(e.clientX, e.clientY, menuItems);
  };

  return (
    <>
      <div
        className={`px-3 py-2 cursor-pointer text-sm flex items-center gap-2 min-w-0 transition-colors hover:bg-[color-mix(in_srgb,var(--border)_45%,transparent)]`}
        style={{ paddingLeft: `${level * 12 + 12}px` }}
        onClick={() => onChatSelect(chat.id)}
        onContextMenu={handleContextMenu}
      >
        <span className="shrink-0 flex items-center text-[var(--muted)]">
          <IconMessageSquare />
        </span>
        <span className="truncate min-w-0 flex-1">{chat.title}</span>
        <span className="text-xs text-[var(--muted)] ml-auto shrink-0">
          {new Date(chat.createdAt).toLocaleDateString()}
        </span>
      </div>
    </>
  );
}

function filterChats(chats: ChatSession[], q: string): ChatSession[] {
  if (!q.trim()) return chats;
  const lower = q.toLowerCase().trim();
  return chats.filter((c) => c.title.toLowerCase().includes(lower));
}

export function ChatTree({ onChatSelect, refreshTrigger, onRefresh, searchQuery }: ChatTreeProps) {
  const [chats, setChats] = useState<ChatSession[]>([]);
  const [renameModal, setRenameModal] = useState<ChatSession | null>(null);

  useEffect(() => {
    // Load chats from localStorage
    const loadChats = () => {
      try {
        const stored = localStorage.getItem("antiprism_chats");
        const parsed = stored ? JSON.parse(stored) : [];
                setChats(parsed);
      } catch (e) {
        console.error("Failed to load chats:", e);
        setChats([]);
      }
    };

    loadChats();

    // Listen for storage changes from other tabs
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "antiprism_chats") {
        loadChats();
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
    }, [refreshTrigger]);

  const performRename = async (newName: string) => {
    if (!renameModal) return;
    const trimmed = newName.trim();
    if (!trimmed || trimmed === renameModal.title) return;
    try {
      renameChat(renameModal.id, trimmed);
      onRefresh();
    } catch (e) {
      console.error("Rename failed:", e);
    }
    setRenameModal(null);
  };

  const filteredChats = filterChats(chats, searchQuery ?? "");

  return (
    <>
      <div className="overflow-auto flex-1 min-h-0 py-3">
        {filteredChats.length === 0 ? (
          <div className="p-3 text-sm text-[var(--muted)]">
            {searchQuery?.trim() ? "No matching chats." : "No chats yet. Create a new chat to get started."}
          </div>
        ) : (
          filteredChats.map((chat) => (
            <ChatNodeComponent
              key={chat.id}
              chat={chat}
              onChatSelect={onChatSelect}
              onRefresh={onRefresh}
              onOpenRenameModal={setRenameModal}
              level={0}
              refreshTrigger={refreshTrigger}
            />
          ))
        )}
      </div>
      <NameModal
        isOpen={!!renameModal}
        title="Rename chat"
        initialValue={renameModal?.title ?? ""}
        placeholder="Enter new name"
        onClose={() => setRenameModal(null)}
        onConfirm={performRename}
      />
    </>
  );
}

export { type ChatTreeProps, type ChatSession };
