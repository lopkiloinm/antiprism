"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconFolder, IconFileText, IconUsers } from "./Icons";

type NavItem = "all" | "projects" | "rooms";

interface DashboardSidebarProps {
  activeNav: NavItem;
  onNavChange: (nav: NavItem) => void;
}

export function DashboardSidebar({ activeNav, onNavChange }: DashboardSidebarProps) {
  return (
    <aside className="w-56 border-r border-zinc-800 flex flex-col bg-zinc-950 shrink-0">
      <div className="h-14 flex items-center px-4 font-semibold text-lg border-b border-zinc-800 text-zinc-200 shrink-0">
        Dashboard
      </div>
      <nav className="p-2 space-y-0.5">
        <button
          onClick={() => onNavChange("all")}
          className={`w-full px-3 py-2 text-left text-sm rounded flex items-center gap-2 transition-colors ${
            activeNav === "all"
              ? "bg-zinc-800 text-zinc-100"
              : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-300"
          }`}
        >
          <IconFolder />
          All Projects
        </button>
        <button
          onClick={() => onNavChange("projects")}
          className={`w-full px-3 py-2 text-left text-sm rounded flex items-center gap-2 transition-colors ${
            activeNav === "projects"
              ? "bg-zinc-800 text-zinc-100"
              : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-300"
          }`}
        >
          <IconFileText />
          Your Projects
        </button>
        <button
          onClick={() => onNavChange("rooms")}
          className={`w-full px-3 py-2 text-left text-sm rounded flex items-center gap-2 transition-colors ${
            activeNav === "rooms"
              ? "bg-zinc-800 text-zinc-100"
              : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-300"
          }`}
        >
          <IconUsers />
          Your Rooms
        </button>
      </nav>
    </aside>
  );
}
