"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { IconChevronLeft, IconChevronRight } from "@/components/Icons";

export const SETTINGS_TAB_PATH = "__settings__";

interface Tab {
  path: string;
  type: "text" | "image" | "settings" | "chat";
  title?: string; // Optional title for chat tabs
  readOnly?: boolean;
  diffData?: {
    filePath: string;
    currentContent: string;
    originalContent: string;
  };
}

export type { Tab };

interface FileTabsProps {
  tabs: Tab[];
  activePath: string | null;
  onSelect: (path: string) => void;
  onClose: (path: string) => void;
  onReorder?: (newTabs: Tab[]) => void;
  onToggleFileTree?: () => void;
  onToggleRightPanel?: () => void;
  isFileTreeCollapsed?: boolean;
  isRightPanelCollapsed?: boolean;
}

function getTabLabel(tab: Tab): string {
  if (tab.type === "settings" || tab.path === SETTINGS_TAB_PATH) return "Settings";
  if (tab.type === "chat") {
    // Use the provided title first, then fall back to localStorage
    if (tab.title) return tab.title;
    
    const chatId = tab.path.replace("/ai-chat/", "");
    // Get the actual chat title from localStorage (fallback)
    try {
      const stored = localStorage.getItem("antiprism_chats");
      if (stored) {
        const chats = JSON.parse(stored);
        const chat = chats.find((c: any) => c.id === chatId);
        if (chat) return chat.title;
      }
    } catch {}
    return "New Chat";
  }
  return tab.path.split("/").filter(Boolean).pop() || tab.path;
}

export function FileTabs({ tabs, activePath, onSelect, onClose, onReorder, onToggleFileTree, onToggleRightPanel, isFileTreeCollapsed = false, isRightPanelCollapsed = false }: FileTabsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollState, setScrollState] = useState({ scrollLeft: 0, scrollWidth: 0, clientWidth: 0 });
  const [isHovering, setIsHovering] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isReordering, setIsReordering] = useState(false);
  const [draggedTab, setDraggedTab] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const dragStartRef = useRef({ x: 0, scrollLeft: 0 });
  const dragTabRef = useRef<{ index: number; tab: Tab } | null>(null);
  const hasLeftToggle = !!onToggleFileTree;
  const hasRightToggle = !!onToggleRightPanel;
  const leftGutter = hasLeftToggle ? 48 : 0;
  const rightGutter = hasRightToggle ? 48 : 0;

  const updateScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setScrollState({
      scrollLeft: el.scrollLeft,
      scrollWidth: el.scrollWidth,
      clientWidth: el.clientWidth,
    });
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateScroll();
    const ro = new ResizeObserver(updateScroll);
    ro.observe(el);
    el.addEventListener("scroll", updateScroll);
    return () => {
      ro.disconnect();
      el.removeEventListener("scroll", updateScroll);
    };
  }, [tabs.length, updateScroll]);

  const overflow = scrollState.scrollWidth > scrollState.clientWidth;
  const maxScroll = scrollState.scrollWidth - scrollState.clientWidth;
  const thumbRatio = maxScroll > 0 ? scrollState.clientWidth / scrollState.scrollWidth : 1;
  const thumbWidth = Math.max(24, scrollState.clientWidth * thumbRatio);
  const showLeftFade = scrollState.scrollLeft > 0;
  const showRightFade = scrollState.scrollLeft < maxScroll - 1;
  const thumbLeft =
    maxScroll > 0
      ? (scrollState.scrollLeft / maxScroll) * (scrollState.clientWidth - thumbWidth)
      : 0;

  const handleThumbMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    const el = scrollRef.current;
    dragStartRef.current = { x: e.clientX, scrollLeft: el?.scrollLeft ?? 0 };
  };

  // Tab reordering handlers
  const handleTabDragStart = (e: React.DragEvent, tab: Tab, index: number) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', tab.path);
    setDraggedTab(tab.path);
    dragTabRef.current = { index, tab };
    setIsReordering(true);
  };

  const handleTabDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleTabDragEnd = () => {
    setIsReordering(false);
    setDraggedTab(null);
    setDragOverIndex(null);
    dragTabRef.current = null;
  };

  const handleTabDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    
    if (!draggedTab || !dragTabRef.current) return;
    
    const draggedIndex = dragTabRef.current.index;
    const draggedTabData = dragTabRef.current.tab;
    
    // If dropping at the end, use the last index
    const actualDropIndex = dropIndex >= tabs.length ? tabs.length : dropIndex;
    
    if (draggedIndex === actualDropIndex) return;
    
    // Create new tabs array with reordered tabs
    const newTabs = [...tabs];
    newTabs.splice(draggedIndex, 1);
    newTabs.splice(actualDropIndex, 0, draggedTabData);
    
    // Call a callback to update the tabs in the parent component
    if (onReorder) {
      onReorder(newTabs);
    }
  };

  // Calculate drop indicator position
  const getDropIndicatorPosition = (index: number) => {
    const tabElements = Array.from(document.querySelectorAll('.file-tabs-scroll > div'));
    
    if (index < tabElements.length) {
      const targetTab = tabElements[index];
      const rect = targetTab.getBoundingClientRect();
      return rect.left;
    }
    
    // For dropping beyond the last tab, position at the end of the tab container
    const container = document.querySelector('.file-tabs-scroll');
    if (container) {
      const containerRect = container.getBoundingClientRect();
      return containerRect.right - 2; // 2px for the indicator width
    }
    
    return 0;
  };

  useEffect(() => {
    if (!isDragging) return;
    const onMove = (e: MouseEvent) => {
      const el = scrollRef.current;
      if (!el) return;
      const max = el.scrollWidth - el.clientWidth;
      if (max <= 0) return;
      const dx = e.clientX - dragStartRef.current.x;
      const thumbW = Math.max(24, el.clientWidth * (el.clientWidth / el.scrollWidth));
      const trackWidth = el.clientWidth - thumbW;
      const scrollPerPx = max / trackWidth;
      const newScroll = Math.max(0, Math.min(max, dragStartRef.current.scrollLeft + dx * scrollPerPx));
      el.scrollLeft = newScroll;
      dragStartRef.current = { x: e.clientX, scrollLeft: newScroll };
    };
    const onUp = () => setIsDragging(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [isDragging]);

  if (tabs.length === 0) return null;

  return (
    <div
      className="relative h-12 shrink-0 border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--border)_18%,transparent)]"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => !isDragging && setIsHovering(false)}
    >
      {/* Left gradient overlay - fades from 100% to 0% opacity over tabs to the right of left button */}
      {onToggleFileTree && showLeftFade && (
        <div 
          className="absolute top-0 bottom-0 left-12 w-24 pointer-events-none"
          style={{
            background: 'linear-gradient(to right, color-mix(in srgb, var(--border) 18%, var(--background)) 0%, transparent 100%)',
            zIndex: 5
          }}
        />
      )}
      
      {/* Right gradient overlay - fades from 100% to 0% opacity over tabs to the left of right button */}
      {onToggleRightPanel && showRightFade && (
        <div 
          className="absolute top-0 bottom-0 right-12 w-24 pointer-events-none"
          style={{
            background: 'linear-gradient(to left, color-mix(in srgb, var(--border) 18%, var(--background)) 0%, transparent 100%)',
            zIndex: 5
          }}
        />
      )}

      {/* Left collapse button - fixed position */}
      {onToggleFileTree && (
        <button
          onClick={onToggleFileTree}
          className="absolute left-0 top-0 bottom-0 w-8 h-8 m-2 flex items-center justify-center rounded text-[var(--foreground)] hover:bg-[color-mix(in_srgb,var(--border)_45%,transparent)] transition-colors bg-[var(--background)] z-10"
          title={isFileTreeCollapsed ? "Show file tree" : "Collapse file tree"}
        >
          {isFileTreeCollapsed ? <IconChevronRight /> : <IconChevronLeft />}
        </button>
      )}
      
      {/* Right collapse button - fixed position */}
      {onToggleRightPanel && (
        <button
          onClick={onToggleRightPanel}
          className="absolute right-0 top-0 bottom-0 w-8 h-8 m-2 flex items-center justify-center rounded text-[var(--foreground)] hover:bg-[color-mix(in_srgb,var(--border)_45%,transparent)] transition-colors bg-[var(--background)] z-10"
          title={isRightPanelCollapsed ? "Show right panel" : "Collapse right panel"}
        >
          {isRightPanelCollapsed ? <IconChevronLeft /> : <IconChevronRight />}
        </button>
      )}
      
      <div
        ref={scrollRef}
        className={`file-tabs-scroll h-12 flex flex-nowrap items-end overflow-x-auto overflow-y-hidden ${
          hasLeftToggle ? 'ml-12' : ''
        } ${
          hasRightToggle ? 'mr-12' : ''
        }`}
      >
      {tabs.map((tab, index) => {
        const isActive = tab.path === activePath;
        const name = getTabLabel(tab);
        const isDragOver = isReordering && dragOverIndex === index;
        const dropPosition = isDragOver ? getDropIndicatorPosition(index) : null;
        
        // Calculate the actual background color for the gradient
        // For inactive tabs: 18% border + 82% transparent, so gradient should be 18% border + 82% background
        const tabBackgroundColor = isActive 
          ? "color-mix(in srgb, var(--background) 100%, transparent)" 
          : "color-mix(in srgb, var(--border) 18%, var(--background))"; // Match the exact 18% ratio
        
        return (
          <div
            key={tab.path}
            className={`group relative flex items-center px-3 py-2 border-r border-[var(--border)] cursor-pointer shrink-0 min-w-0 max-w-[240px] h-full overflow-hidden ${
              isActive
                ? "bg-[var(--background)] -mb-px text-[var(--foreground)] border-t-2 border-t-[var(--accent)]"
                : "bg-[color-mix(in_srgb,var(--border)_18%,transparent)] text-[var(--muted)] hover:bg-[color-mix(in_srgb,var(--border)_35%,transparent)] hover:text-[var(--foreground)]"
            } ${
              isReordering && draggedTab === tab.path ? "opacity-50" : ""
            } ${
              isDragOver ? "border-l-2 border-l-[var(--accent)]" : ""
            } ${
              hasLeftToggle && index === 0 ? "border-l border-[var(--border)]" : ""
            }`}
            draggable
            onDragStart={(e) => handleTabDragStart(e, tab, index)}
            onDragOver={(e) => handleTabDragOver(e, index)}
            onDragEnd={handleTabDragEnd}
            onDrop={(e) => handleTabDrop(e, index)}
            onClick={() => onSelect(tab.path)}
          >
            <span className="text-sm truncate">{name}</span>
            {/* Drop indicator */}
            {isDragOver && dropPosition !== null && (
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-[var(--accent)] pointer-events-none"
                style={{
                  left: `${dropPosition}px`,
                  height: '100%',
                  width: '2px'
                }}
              />
            )}
            <div
              className="absolute right-0 top-0 bottom-0 w-16 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
              style={{
                background: `linear-gradient(to right, transparent 0%, ${tabBackgroundColor} 45%)`,
              }}
            />
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClose(tab.path);
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded text-[var(--muted)] hover:bg-[color-mix(in_srgb,var(--border)_45%,transparent)] hover:text-[var(--foreground)] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto"
              title="Close"
            >
              ×
            </button>
          </div>
        );
      })}
      {/* Drop zone for moving tabs to the end */}
      {isReordering && (
        <div
          className="relative flex items-center h-full min-w-[40px] cursor-pointer"
          onDragOver={(e) => handleTabDragOver(e, tabs.length)}
          onDrop={(e) => handleTabDrop(e, tabs.length)}
        >
          {dragOverIndex === tabs.length && (
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-[var(--accent)] pointer-events-none"
              style={{
                left: '0px',
                height: '100%',
                width: '2px'
              }}
            />
          )}
        </div>
      )}
      </div>
      {overflow && (isHovering || isDragging) && (
        <div
          className="absolute bottom-0 h-1.5 px-1 flex items-center pointer-events-none"
          style={{ left: leftGutter, right: rightGutter }}
        >
          <div className="flex-1 h-1 rounded-full bg-transparent relative">
            <div
              className="absolute top-0 h-1 rounded-full bg-[color-mix(in_srgb,var(--border)_60%,transparent)] hover:bg-[color-mix(in_srgb,var(--border)_75%,transparent)] cursor-grab active:cursor-grabbing pointer-events-auto"
              style={{ left: thumbLeft, width: thumbWidth }}
              onMouseDown={handleThumbMouseDown}
            />
          </div>
        </div>
      )}
    </div>
  );
}
