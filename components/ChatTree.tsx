"use client";

import { useState, useRef, useEffect } from "react";
import { NameModal } from "./NameModal";
import { IconMessageSquare, IconPencil, IconDownload, IconTrash2, IconSearch, IconChevronDown } from "./Icons";
import { renameProjectChat, deleteProjectChat, getProjectChatMessages, listProjectChats, type ChatSession } from "@/lib/chatStore";
import { ChatTreeManager, type ChatTreeItem, type SortCriteria } from "@/lib/chatTreeManager";
import { useContextMenu } from "@/contexts/ContextMenuContext";

interface ChatTreeProps {
  projectId: string;
  chatTreeManager: ChatTreeManager | null;
  onChatSelect: (chatId: string) => void;
  refreshTrigger?: number;
  onRefresh: () => void;
  searchQuery?: string;
  activeChatId?: string;
  onFindConversation?: () => void;
}

function ChatNodeComponent({
  chat,
  projectId,
  onChatSelect,
  onRefresh,
  onOpenRenameModal,
  level,
  refreshTrigger,
  activeChatId,
}: {
  chat: ChatSession;
  projectId: string;
  onChatSelect: (chatId: string) => void;
  onRefresh: () => void;
  onOpenRenameModal: (chat: ChatSession) => void;
  level: number;
  refreshTrigger?: number;
  activeChatId?: string;
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
            const messages = await getProjectChatMessages(projectId, chat.id);
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
            await deleteProjectChat(projectId, chat.id);
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
    <div
      className={`group relative px-3 py-2 cursor-pointer text-sm flex items-center gap-2 min-w-0 transition-colors ${
        chat.id === activeChatId
          ? "bg-[color-mix(in_srgb,var(--accent)_18%,transparent)]"
          : "hover:bg-[color-mix(in_srgb,var(--border)_45%,transparent)]"
      }`}
      style={{ paddingLeft: `${level * 12 + 12}px` }}
      onClick={() => onChatSelect(chat.id)}
      onContextMenu={handleContextMenu}
    >
      {/* Left accent indicator with 4-level system */}
      <div className={`absolute left-0 top-1/2 -translate-y-1/2 bg-[var(--accent)] rounded-r transition-all ${
        chat.id === activeChatId 
          ? 'h-4 w-0.5 group-hover:h-5 group-hover:w-1' // Level 2: Active, Level 3: Active + hover
          : 'h-2 w-0.5 opacity-0 group-hover:opacity-100' // Level 1: Hover only
      }`} />
      
      {/* Chat icon */}
      <span className="shrink-0 flex items-center">
        <IconMessageSquare />
      </span>
      
      {/* Chat title and date */}
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <span className="truncate min-w-0 flex-1">{chat.title}</span>
        <span className="text-xs text-[var(--muted)] ml-auto shrink-0">
          {new Date(chat.createdAt).toLocaleDateString()}
        </span>
      </div>
    </div>
  );
}

function filterChats(chats: ChatTreeItem[], q: string): ChatTreeItem[] {
  if (!q.trim()) return chats;
  const lower = q.toLowerCase().trim();
  return chats.filter((c) => c.title.toLowerCase().includes(lower));
}

export function ChatTree({ projectId, chatTreeManager, onChatSelect, refreshTrigger, onRefresh, searchQuery, activeChatId, onFindConversation }: ChatTreeProps) {
  // 🎯 CRITICAL: Persist sort criteria in localStorage
  const getSavedSortBy = (): SortCriteria => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`antiprism-chat-sort-${projectId}`);
      return (saved as SortCriteria) || 'created';
    }
    return 'created';
  };
  
  const saveSortBy = (criteria: SortCriteria) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(`antiprism-chat-sort-${projectId}`, criteria);
    }
  };

  const [chats, setChats] = useState<ChatTreeItem[]>([]);
  const [renameModal, setRenameModal] = useState<ChatTreeItem | null>(null);
  const [sortBy, setSortBy] = useState<SortCriteria>(getSavedSortBy());
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load chats from ChatTreeManager (matching OrderedFileTree pattern exactly)
    const updateItems = async () => {
      try {
        if (chatTreeManager) {
          const loaded = chatTreeManager.getTreeItems();
          
          // Apply current sort criteria on initial load
          if (loaded.length > 0) {
            chatTreeManager.sortTreeItems(sortBy);
            const sortedItems = chatTreeManager.getTreeItems();
            setChats(sortedItems);
          } else {
            setChats(loaded);
          }
          
          console.log(' Loaded and sorted chats from ChatTreeManager:', loaded.length, 'by:', sortBy);
        }
      } catch (error) {
        console.error("Failed to load chats from ChatTreeManager:", error);
        setChats([]);
      }
    };

    // Initial load
    updateItems();

    // Listen for changes (this would need to be implemented in ChatTreeManager)
    // For now, just update periodically and check for new chats
    const interval = setInterval(async () => {
      const previousCount = chats.length;
      await updateItems();
      // If new chats were added, re-sort them
      if (chats.length > previousCount && chatTreeManager) {
        console.log('🔄 New chats detected, re-sorting by:', sortBy);
        chatTreeManager.sortTreeItems(sortBy);
        const sortedItems = chatTreeManager.getTreeItems();
        setChats(sortedItems);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [chatTreeManager, refreshTrigger, sortBy]); // Add sortBy dependency

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle sorting change
  const handleSortChange = (criteria: SortCriteria) => {
    setSortBy(criteria);
    saveSortBy(criteria); // 🎯 Save to localStorage
    setIsDropdownOpen(false);
    
    // Apply sorting using ChatTreeManager
    if (chatTreeManager) {
      chatTreeManager.sortTreeItems(criteria);
      
      // Trigger re-render by getting updated items
      const updatedItems = chatTreeManager.getTreeItems();
      setChats(updatedItems);
    }
  };

  // Sort chats based on criteria (now handled by ChatTreeManager)
  const sortChats = (chats: ChatTreeItem[], criteria: SortCriteria): ChatTreeItem[] => {
    return chats; // Sorting is now handled by ChatTreeManager
  };

  const performRename = async (newName: string) => {
    if (!renameModal) return;
    const trimmed = newName.trim();
    if (!trimmed || trimmed === renameModal.title) return;
    try {
      renameProjectChat(projectId, renameModal.id, trimmed);
      onRefresh();
    } catch (e) {
      console.error("Rename failed:", e);
    }
    setRenameModal(null);
  };

  const filteredChats = filterChats(chats, searchQuery ?? "");

  return (
    <>
      {/* Header */}
      <div className="shrink-0 border-b border-[var(--border)] p-2 flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-[var(--muted)]">Conversations</span>
        <div className="flex items-center gap-2">
          {/* Find button */}
          {onFindConversation && (
            <button
              onClick={onFindConversation}
              className="w-7 h-7 rounded flex items-center justify-center bg-[color-mix(in_srgb,var(--border)_22%,transparent)] hover:bg-[color-mix(in_srgb,var(--border)_45%,transparent)] text-[var(--foreground)] transition-colors"
              title="Find a conversation"
            >
              <IconSearch />
            </button>
          )}
          
          {/* Sort dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-1 px-2 py-1 text-xs bg-[color-mix(in_srgb,var(--border)_22%,transparent)] border border-[var(--border)] rounded text-[var(--foreground)] hover:bg-[color-mix(in_srgb,var(--border)_45%,transparent)] transition-colors"
            >
              {sortBy === 'title-asc' && 'Title A-Z'}
              {sortBy === 'title-desc' && 'Title Z-A'}
              {sortBy === 'created' && 'Recent'}
              {sortBy === 'created-oldest' && 'Oldest'}
              <span className={`transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}>
                <IconChevronDown />
              </span>
            </button>
            
            {isDropdownOpen && (
              <div className="absolute right-0 top-full mt-1 w-32 bg-[var(--background)] border border-[var(--border)] rounded shadow-lg z-50 overflow-hidden">
                <button
                  onClick={() => handleSortChange('title-asc')}
                  className={`w-full text-left px-2 py-1.5 text-xs hover:bg-[color-mix(in_srgb,var(--accent)_8%,transparent)] transition-colors ${
                    sortBy === 'title-asc' ? 'bg-[color-mix(in_srgb,var(--accent)_15%,transparent)] text-[var(--accent)]' : 'text-[var(--foreground)]'
                  }`}
                >
                  Title A-Z
                </button>
                <button
                  onClick={() => handleSortChange('title-desc')}
                  className={`w-full text-left px-2 py-1.5 text-xs hover:bg-[color-mix(in_srgb,var(--accent)_8%,transparent)] transition-colors ${
                    sortBy === 'title-desc' ? 'bg-[color-mix(in_srgb,var(--accent)_15%,transparent)] text-[var(--accent)]' : 'text-[var(--foreground)]'
                  }`}
                >
                  Title Z-A
                </button>
                <button
                  onClick={() => handleSortChange('created')}
                  className={`w-full text-left px-2 py-1.5 text-xs hover:bg-[color-mix(in_srgb,var(--accent)_8%,transparent)] transition-colors ${
                    sortBy === 'created' ? 'bg-[color-mix(in_srgb,var(--accent)_15%,transparent)] text-[var(--accent)]' : 'text-[var(--foreground)]'
                  }`}
                >
                  Recent
                </button>
                <button
                  onClick={() => handleSortChange('created-oldest')}
                  className={`w-full text-left px-2 py-1.5 text-xs hover:bg-[color-mix(in_srgb,var(--accent)_8%,transparent)] transition-colors ${
                    sortBy === 'created-oldest' ? 'bg-[color-mix(in_srgb,var(--accent)_15%,transparent)] text-[var(--accent)]' : 'text-[var(--foreground)]'
                  }`}
                >
                  Oldest
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="overflow-auto flex-1 min-h-0">
        {filteredChats.length === 0 ? (
          <div className="p-3 text-sm text-[var(--muted)]">
            {searchQuery?.trim() ? "No matching chats." : "No chats yet. Create a new chat to get started."}
          </div>
        ) : (
          filteredChats.map((chat) => (
            <ChatNodeComponent
              key={chat.id}
              chat={chat}
              projectId={projectId}
              onChatSelect={onChatSelect}
              onRefresh={onRefresh}
              onOpenRenameModal={setRenameModal}
              level={0}
              refreshTrigger={refreshTrigger}
              activeChatId={activeChatId}
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
