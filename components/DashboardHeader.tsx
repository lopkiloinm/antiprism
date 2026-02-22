"use client";

import { useState, useRef, useEffect } from "react";
import {
  IconSearch,
  IconPlus,
  IconUpload,
  IconFolderOpen,
  IconLayoutGrid,
  IconList,
  IconMaximize2,
  IconMinimize2,
  IconTrash2,
  IconDownload,
  IconRestore,
  IconRotateCcw,
  IconChevronDown,
  IconMenu,
  IconX,
} from "./Icons";

type NavItem = "all" | "projects" | "recently-opened" | "templates" | "servers" | "trash";

const TITLES: Record<NavItem, string> = {
  all: "All Projects",
  projects: "Your Projects",
  "recently-opened": "Recently Opened",
  templates: "Templates",
  servers: "Signaling Servers",
  trash: "Trashed Projects",
};

interface DashboardHeaderProps {
  activeNav: NavItem;
  onNewProject: () => void;
  onNewServer?: () => void;
  onImportZip: () => void;
  onImportFolder: () => void;
  viewMode: "list" | "icons";
  onViewModeChange: (mode: "list" | "icons") => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedCount: number;
  onClearSelection: () => void;
  onBulkDelete: () => void;
  onBulkDownload?: () => void;
  onBulkRestore?: () => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  isMobile?: boolean;
  onMenuClick?: () => void;
}

export function DashboardHeader({
  activeNav,
  onNewProject,
  onNewServer,
  onImportZip,
  onImportFolder,
  viewMode,
  onViewModeChange,
  searchQuery,
  onSearchChange,
  selectedCount,
  onClearSelection,
  onBulkDelete,
  onBulkDownload,
  onBulkRestore,
  isFullscreen = false,
  onToggleFullscreen,
  isMobile = false,
  onMenuClick,
}: DashboardHeaderProps) {
  const [importOpen, setImportOpen] = useState(false);
  const [searchExpanded, setSearchExpanded] = useState(false);
  const importRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (importRef.current && !importRef.current.contains(e.target as Node)) {
        setImportOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Auto-focus search input when expanded on mobile
  useEffect(() => {
    if (searchExpanded && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [searchExpanded]);

  return (
    <div className="h-14 flex items-center justify-between px-4 border-b border-[var(--border)] bg-[var(--background)] shrink-0 relative">
      {/* Mobile Expanded Search Overlay */}
      {isMobile && searchExpanded && (
        <div className="absolute inset-0 z-10 flex items-center bg-[var(--background)] px-4 gap-2">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)] pointer-events-none">
              <IconSearch />
            </span>
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search…"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-10 pr-3 px-3 py-2 text-sm rounded bg-[color-mix(in_srgb,var(--border)_22%,transparent)] border border-[var(--border)] text-[var(--foreground)] placeholder-[var(--muted)] focus:outline-none focus:ring-1 focus:ring-[color-mix(in_srgb,var(--accent)_55%,transparent)]"
            />
          </div>
          <button 
            onClick={() => {
              setSearchExpanded(false);
              onSearchChange("");
            }}
            className="p-2 text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
          >
            <IconX />
          </button>
        </div>
      )}

      <div className={`flex-1 flex items-center justify-between ${isMobile && searchExpanded ? 'invisible' : ''}`}>
        <div className="flex items-center gap-3">
          {isMobile && onMenuClick && (
            <button
              onClick={onMenuClick}
              className="p-2 -ml-2 text-[var(--muted)] hover:text-[var(--foreground)] rounded-md transition-colors"
            >
              <IconMenu />
            </button>
          )}
          <h1 className="text-xl font-semibold capitalize tracking-tight">
            {TITLES[activeNav]}
          </h1>
        </div>
        {isMobile && !searchExpanded && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => setSearchExpanded(true)}
              className="p-2 text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
            >
              <IconSearch />
            </button>
            <button
              onClick={activeNav === "servers" ? onNewServer : onNewProject}
              className="flex items-center gap-2 p-2 rounded-md bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-sm font-medium transition-colors shadow-sm"
            >
              <IconPlus />
            </button>
          </div>
        )}
      </div>
      <div className={`flex items-center gap-3 ${isMobile ? 'hidden' : ''}`}>
        {/* Search */}
        <div className={`relative ${isMobile ? 'flex-1' : 'w-64'}`}>
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)] pointer-events-none">
            <IconSearch />
          </span>
          <input
            type="text"
            placeholder="Search…"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-3 px-3 py-2 text-sm rounded bg-[color-mix(in_srgb,var(--border)_22%,transparent)] border border-[var(--border)] text-[var(--foreground)] placeholder-[var(--muted)] focus:outline-none focus:ring-1 focus:ring-[color-mix(in_srgb,var(--accent)_55%,transparent)]"
          />
        </div>
        {selectedCount > 0 && activeNav !== "servers" && (
          <div
            className="flex items-center rounded-lg border border-[var(--border)] bg-[color-mix(in_srgb,var(--accent)_8%,var(--background))] shadow-sm overflow-hidden"
            role="toolbar"
            aria-label="Bulk actions"
          >
            <div className="flex items-center gap-2 px-3 py-1 text-sm text-[var(--foreground)]">
              <span className="font-medium">
                {selectedCount} selected
              </span>
              <button
                onClick={onClearSelection}
                className="px-2 py-1 rounded hover:bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
                title="Clear selection"
              >
                <IconX />
              </button>
            </div>

            <div className="w-px self-stretch bg-[var(--border)]" />

            <div className="flex items-center">
              {onBulkDownload && (
                <button
                  onClick={onBulkDownload}
                  className="px-3 py-2 text-sm text-[var(--foreground)] hover:bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] transition-colors flex items-center gap-2"
                  title="Download selected"
                >
                  <IconDownload />
                  <span className="hidden sm:inline">Download</span>
                </button>
              )}
              {onBulkRestore && activeNav === "trash" && (
                <button
                  onClick={onBulkRestore}
                  className="px-3 py-2 text-sm text-[var(--foreground)] hover:bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] transition-colors flex items-center gap-2 border-l border-[var(--border)]"
                  title="Restore selected"
                >
                  <IconRotateCcw />
                  <span className="hidden sm:inline">Restore</span>
                </button>
              )}
              <button
                onClick={onBulkDelete}
                className="px-3 py-2 text-sm text-red-300 hover:bg-red-500/10 transition-colors flex items-center gap-2 border-l border-[var(--border)]"
                title="Delete selected"
              >
                <IconTrash2 />
                <span className="hidden sm:inline">Delete</span>
              </button>
            </div>
          </div>
        )}
        {activeNav !== "servers" && activeNav !== "recently-opened" && (
          <>
            <div className="flex items-center border border-[var(--border)] rounded overflow-hidden">
              <button
                onClick={() => onViewModeChange("list")}
                className={`px-2 py-2 ${viewMode === "list" ? "bg-[color-mix(in_srgb,var(--border)_55%,transparent)] text-[var(--foreground)]" : "bg-[color-mix(in_srgb,var(--border)_22%,transparent)] text-[var(--muted)] hover:text-[var(--foreground)]"}`}
                title="List view"
              >
                <IconList />
              </button>
              <button
                onClick={() => onViewModeChange("icons")}
                className={`px-2 py-2 border-l border-[var(--border)] ${viewMode === "icons" ? "bg-[color-mix(in_srgb,var(--border)_55%,transparent)] text-[var(--foreground)]" : "bg-[color-mix(in_srgb,var(--border)_22%,transparent)] text-[var(--muted)] hover:text-[var(--foreground)]"}`}
                title="Icons view"
              >
                <IconLayoutGrid />
              </button>
              {onToggleFullscreen && (
                <button
                  onClick={onToggleFullscreen}
                  className="px-2 py-2 border-l border-[var(--border)] bg-[color-mix(in_srgb,var(--border)_22%,transparent)] text-[var(--muted)] hover:text-[var(--foreground)]"
                  title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
                >
                  {isFullscreen ? <IconMinimize2 /> : <IconMaximize2 />}
                </button>
              )}
            </div>
            <div className="relative" ref={importRef}>
              <button
                onClick={() => setImportOpen(!importOpen)}
                className="px-3 py-2 text-sm rounded bg-[color-mix(in_srgb,var(--border)_22%,transparent)] hover:bg-[color-mix(in_srgb,var(--border)_45%,transparent)] text-[var(--foreground)] border border-[var(--border)] flex items-center gap-2"
              >
                Import
                <IconChevronDown />
              </button>
              {importOpen && (
                <div className="absolute right-0 top-full mt-1 z-50 min-w-[140px] rounded border border-[var(--border)] bg-[var(--background)] shadow-xl py-2">
                  <button
                    onClick={() => {
                      onImportZip();
                      setImportOpen(false);
                    }}
                    className="w-full px-3 py-2 text-left text-sm text-[var(--foreground)] hover:bg-[color-mix(in_srgb,var(--border)_45%,transparent)]"
                  >
                    Import zip
                  </button>
                  <button
                    onClick={() => {
                      onImportFolder();
                      setImportOpen(false);
                    }}
                    className="w-full px-3 py-2 text-left text-sm text-[var(--foreground)] hover:bg-[color-mix(in_srgb,var(--border)_45%,transparent)]"
                  >
                    Import folder
                  </button>
                </div>
              )}
            </div>
            <button
              onClick={onNewProject}
              className="px-3 py-2 text-sm rounded bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-medium flex items-center gap-2"
            >
              <IconPlus />
              New
            </button>
          </>
        )}
        {activeNav === "recently-opened" && (
          <>
            <div className="flex items-center border border-[var(--border)] rounded overflow-hidden">
              <button
                onClick={() => onViewModeChange("list")}
                className={`px-2 py-2 ${viewMode === "list" ? "bg-[color-mix(in_srgb,var(--border)_55%,transparent)] text-[var(--foreground)]" : "bg-[color-mix(in_srgb,var(--border)_22%,transparent)] text-[var(--muted)] hover:text-[var(--foreground)]"}`}
                title="List view"
              >
                <IconList />
              </button>
              <button
                onClick={() => onViewModeChange("icons")}
                className={`px-2 py-2 border-l border-[var(--border)] ${viewMode === "icons" ? "bg-[color-mix(in_srgb,var(--border)_55%,transparent)] text-[var(--foreground)]" : "bg-[color-mix(in_srgb,var(--border)_22%,transparent)] text-[var(--muted)] hover:text-[var(--foreground)]"}`}
                title="Icons view"
              >
                <IconLayoutGrid />
              </button>
              {onToggleFullscreen && (
                <button
                  onClick={onToggleFullscreen}
                  className="px-2 py-2 border-l border-[var(--border)] bg-[color-mix(in_srgb,var(--border)_22%,transparent)] text-[var(--muted)] hover:text-[var(--foreground)]"
                  title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
                >
                  {isFullscreen ? <IconMinimize2 /> : <IconMaximize2 />}
                </button>
              )}
            </div>
          </>
        )}
        {activeNav === "servers" && (
          <>
            <div className="flex items-center border border-[var(--border)] rounded overflow-hidden">
              <button
                onClick={() => onViewModeChange("list")}
                className={`px-2 py-2 ${viewMode === "list" ? "bg-[color-mix(in_srgb,var(--border)_55%,transparent)] text-[var(--foreground)]" : "bg-[color-mix(in_srgb,var(--border)_22%,transparent)] text-[var(--muted)] hover:text-[var(--foreground)]"}`}
                title="List view"
              >
                <IconList />
              </button>
              <button
                onClick={() => onViewModeChange("icons")}
                className={`px-2 py-2 border-l border-[var(--border)] ${viewMode === "icons" ? "bg-[color-mix(in_srgb,var(--border)_55%,transparent)] text-[var(--foreground)]" : "bg-[color-mix(in_srgb,var(--border)_22%,transparent)] text-[var(--muted)] hover:text-[var(--foreground)]"}`}
                title="Icons view"
              >
                <IconLayoutGrid />
              </button>
              {onToggleFullscreen && (
                <button
                  onClick={onToggleFullscreen}
                  className="px-2 py-2 border-l border-[var(--border)] bg-[color-mix(in_srgb,var(--border)_22%,transparent)] text-[var(--muted)] hover:text-[var(--foreground)]"
                  title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
                >
                  {isFullscreen ? <IconMinimize2 /> : <IconMaximize2 />}
                </button>
              )}
            </div>
            <button
              onClick={onNewServer}
              className="px-3 py-2 text-sm rounded bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-medium flex items-center gap-2"
            >
              <IconPlus />
              New
            </button>
          </>
        )}
      </div>
    </div>
  );
}
