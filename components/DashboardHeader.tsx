"use client";

import { useState, useRef, useEffect } from "react";
import { IconSearch, IconList, IconLayoutGrid, IconChevronDown, IconPlus } from "./Icons";

type NavItem = "all" | "projects" | "rooms";

const TITLES: Record<NavItem, string> = {
  all: "All Projects",
  projects: "Your Projects",
  rooms: "Your Rooms",
};

interface DashboardHeaderProps {
  activeNav: NavItem;
  onNewProject: () => void;
  onImportZip: () => void;
  onImportFolder: () => void;
  viewMode: "list" | "icons";
  onViewModeChange: (mode: "list" | "icons") => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

export function DashboardHeader({
  activeNav,
  onNewProject,
  onImportZip,
  onImportFolder,
  viewMode,
  onViewModeChange,
  searchQuery,
  onSearchChange,
}: DashboardHeaderProps) {
  const [importOpen, setImportOpen] = useState(false);
  const importRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (importRef.current && !importRef.current.contains(e.target as Node)) {
        setImportOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="h-14 flex items-center justify-between px-4 border-b border-zinc-800 bg-zinc-950 shrink-0">
      <h1 className="text-lg font-semibold text-zinc-100">{TITLES[activeNav]}</h1>
      <div className="flex items-center gap-2">
        <div className="relative">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none">
            <IconSearch />
          </span>
          <input
            type="text"
            placeholder="Search…"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
            className="pl-8 pr-3 py-2 text-sm rounded bg-zinc-800 border border-zinc-700 text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 w-40"
          />
        </div>
        <div className="flex items-center border border-zinc-700 rounded overflow-hidden">
          <button
            onClick={() => onViewModeChange("list")}
            className={`px-2 py-2 ${viewMode === "list" ? "bg-zinc-700 text-zinc-100" : "bg-zinc-800 text-zinc-400 hover:text-zinc-300"}`}
            title="List view"
          >
            <IconList />
          </button>
          <button
            onClick={() => onViewModeChange("icons")}
            className={`px-2 py-2 border-l border-zinc-700 ${viewMode === "icons" ? "bg-zinc-700 text-zinc-100" : "bg-zinc-800 text-zinc-400 hover:text-zinc-300"}`}
            title="Icons view"
          >
            <IconLayoutGrid />
          </button>
        </div>
        <div className="relative" ref={importRef}>
          <button
            onClick={() => setImportOpen(!importOpen)}
            className="px-3 py-2 text-sm rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 flex items-center gap-1.5"
          >
            Import
            <IconChevronDown />
          </button>
          {importOpen && (
            <div className="absolute right-0 top-full mt-1 z-50 min-w-[140px] rounded border border-zinc-700 bg-zinc-900 shadow-xl py-2">
              <button
                onClick={() => {
                  onImportZip();
                  setImportOpen(false);
                }}
                className="w-full px-3 py-2 text-left text-sm text-zinc-200 hover:bg-zinc-800"
              >
                Import zip
              </button>
              <button
                onClick={() => {
                  onImportFolder();
                  setImportOpen(false);
                }}
                className="w-full px-3 py-2 text-left text-sm text-zinc-200 hover:bg-zinc-800"
              >
                Import folder
              </button>
            </div>
          )}
        </div>
        <button
          onClick={onNewProject}
          className="px-4 py-2 text-sm rounded bg-blue-600 hover:bg-blue-700 text-white font-medium flex items-center gap-1.5"
        >
          <IconPlus />
          New
        </button>
      </div>
    </div>
  );
}
