"use client";

import { useRef, useState, useEffect, useCallback } from "react";

export const SETTINGS_TAB_PATH = "__settings__";

interface Tab {
  path: string;
  type: "text" | "image" | "settings";
}

interface FileTabsProps {
  tabs: Tab[];
  activePath: string | null;
  onSelect: (path: string) => void;
  onClose: (path: string) => void;
}

function getTabLabel(tab: Tab): string {
  if (tab.type === "settings" || tab.path === SETTINGS_TAB_PATH) return "Settings";
  return tab.path.split("/").filter(Boolean).pop() || tab.path;
}

export function FileTabs({ tabs, activePath, onSelect, onClose }: FileTabsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollState, setScrollState] = useState({ scrollLeft: 0, scrollWidth: 0, clientWidth: 0 });
  const [isHovering, setIsHovering] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, scrollLeft: 0 });

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
      <div
        ref={scrollRef}
        className="file-tabs-scroll h-12 flex flex-nowrap items-end overflow-x-auto overflow-y-hidden"
      >
      {tabs.map((tab) => {
        const isActive = tab.path === activePath;
        const name = getTabLabel(tab);
        return (
          <div
            key={tab.path}
            className={`group relative flex items-center px-3 pr-3 border-r border-[var(--border)] cursor-pointer shrink-0 min-w-0 max-w-[180px] h-full overflow-hidden ${
              isActive
                ? "bg-[var(--background)] border-b-2 border-b-[var(--background)] -mb-px text-[var(--foreground)]"
                : "bg-[color-mix(in_srgb,var(--border)_18%,transparent)] text-[var(--muted)] hover:bg-[color-mix(in_srgb,var(--border)_35%,transparent)] hover:text-[var(--foreground)]"
            }`}
            onClick={() => onSelect(tab.path)}
          >
            <span className="text-sm truncate block">{name}</span>
            <div
              className="absolute right-0 top-0 bottom-0 w-12 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
              style={{
                background: `linear-gradient(to right, transparent 0%, ${
                  isActive
                    ? "var(--background)"
                    : "color-mix(in srgb, var(--border) 18%, transparent)"
                } 45%)`,
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
      </div>
      {overflow && (isHovering || isDragging) && (
        <div className="absolute bottom-0 left-0 right-0 h-1.5 px-1 flex items-center pointer-events-none">
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
