"use client";

import Link from "next/link";
import { IconFolder, IconFileText, IconUsers, IconTrash2 } from "./Icons";

type NavItem = "all" | "projects" | "rooms" | "trash";

interface DashboardSidebarProps {
  activeNav: NavItem;
  onNavChange: (nav: NavItem) => void;
}

export function DashboardSidebar({ activeNav, onNavChange }: DashboardSidebarProps) {
  return (
    <aside className="w-56 border-r border-[var(--border)] flex flex-col bg-[var(--background)] shrink-0">
      <Link
        href="/features"
        className="h-14 flex items-center px-4 font-semibold text-lg border-b border-[var(--border)] text-[var(--foreground)] shrink-0 hover:opacity-90 transition-opacity"
      >
        Antiprism
      </Link>
      <nav className="p-2 space-y-0.5">
        <button
          onClick={() => onNavChange("all")}
          className={`w-full px-3 py-2 text-left text-sm rounded flex items-center gap-2 transition-colors ${
            activeNav === "all"
              ? "bg-[color-mix(in_srgb,var(--accent)_18%,transparent)] text-[var(--foreground)]"
              : "text-[var(--muted)] hover:bg-[color-mix(in_srgb,var(--border)_40%,transparent)] hover:text-[var(--foreground)]"
          }`}
        >
          <IconFolder />
          All Projects
        </button>
        <button
          onClick={() => onNavChange("projects")}
          className={`w-full px-3 py-2 text-left text-sm rounded flex items-center gap-2 transition-colors ${
            activeNav === "projects"
              ? "bg-[color-mix(in_srgb,var(--accent)_18%,transparent)] text-[var(--foreground)]"
              : "text-[var(--muted)] hover:bg-[color-mix(in_srgb,var(--border)_40%,transparent)] hover:text-[var(--foreground)]"
          }`}
        >
          <IconFileText />
          Your Projects
        </button>
        <button
          onClick={() => onNavChange("rooms")}
          className={`w-full px-3 py-2 text-left text-sm rounded flex items-center gap-2 transition-colors ${
            activeNav === "rooms"
              ? "bg-[color-mix(in_srgb,var(--accent)_18%,transparent)] text-[var(--foreground)]"
              : "text-[var(--muted)] hover:bg-[color-mix(in_srgb,var(--border)_40%,transparent)] hover:text-[var(--foreground)]"
          }`}
        >
          <IconUsers />
          Your Rooms
        </button>
        <button
          onClick={() => onNavChange("trash")}
          className={`w-full px-3 py-2 text-left text-sm rounded flex items-center gap-2 transition-colors ${
            activeNav === "trash"
              ? "bg-[color-mix(in_srgb,var(--accent)_18%,transparent)] text-[var(--foreground)]"
              : "text-[var(--muted)] hover:bg-[color-mix(in_srgb,var(--border)_40%,transparent)] hover:text-[var(--foreground)]"
          }`}
        >
          <IconTrash2 />
          Trashed Projects
        </button>
      </nav>
    </aside>
  );
}
