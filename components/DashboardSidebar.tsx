"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  IconLayoutDashboard,
  IconFolder,
  IconTrash2,
  IconSettings,
  IconPlus,
  IconServer,
  IconAntiprism,
  IconFileText,
  IconHistory,
  IconChevronDown,
  IconChevronUp,
  IconSun,
  IconMoon,
  IconBookOpen,
  IconX,
} from "./Icons";
import { useTheme } from "@/contexts/ThemeContext";

type NavItem = "all" | "projects" | "recently-opened" | "servers" | "templates" | "trash";

interface DashboardSidebarProps {
  activeNav: string;
  onNavChange: (nav: any) => void;
  isMobile?: boolean;
  mobileMenuOpen?: boolean;
  onClose?: () => void;
}

export function DashboardSidebar({ activeNav, onNavChange, isMobile = false, mobileMenuOpen = false, onClose }: DashboardSidebarProps) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [themeOpen, setThemeOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);
  
  return (
    <aside className={`border-r border-[var(--border)] flex flex-col bg-[var(--background)] shrink-0 h-full ${isMobile ? 'w-64' : 'w-56'}`}>
      <div className="flex h-14 shrink-0 items-center justify-between px-4 border-b border-[var(--border)] relative z-10">
        <div 
          onClick={() => router.push("/features")}
          className="flex items-center gap-2 px-1 hover:opacity-80 transition-opacity cursor-pointer"
        >
          <IconAntiprism className="w-5 h-5 text-[var(--foreground)]" />
          <span className="font-semibold text-[var(--foreground)]">Antiprism</span>
        </div>
        {isMobile && onClose && (
          <button 
            onClick={onClose}
            className="p-1.5 -mr-1.5 rounded-md text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[color-mix(in_srgb,var(--border)_45%,transparent)] transition-colors"
          >
            <IconX />
          </button>
        )}
      </div>
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
          onClick={() => onNavChange("recently-opened")}
          className={`w-full px-3 py-2 text-left text-sm rounded flex items-center gap-2 transition-colors ${
            activeNav === "recently-opened"
              ? "bg-[color-mix(in_srgb,var(--accent)_18%,transparent)] text-[var(--foreground)]"
              : "text-[var(--muted)] hover:bg-[color-mix(in_srgb,var(--border)_40%,transparent)] hover:text-[var(--foreground)]"
          }`}
        >
          <IconHistory />
          Recently Opened
        </button>
        <button
          onClick={() => onNavChange("templates")}
          className={`w-full px-3 py-2 text-left text-sm rounded flex items-center gap-2 transition-colors ${
            activeNav === "templates"
              ? "bg-[color-mix(in_srgb,var(--accent)_18%,transparent)] text-[var(--foreground)]"
              : "text-[var(--muted)] hover:bg-[color-mix(in_srgb,var(--border)_40%,transparent)] hover:text-[var(--foreground)]"
          }`}
        >
          <IconBookOpen />
          Templates
        </button>
        <button
          onClick={() => onNavChange("servers")}
          className={`w-full px-3 py-2 text-left text-sm rounded flex items-center gap-2 transition-colors ${
            activeNav === "servers"
              ? "bg-[color-mix(in_srgb,var(--accent)_18%,transparent)] text-[var(--foreground)]"
              : "text-[var(--muted)] hover:bg-[color-mix(in_srgb,var(--border)_40%,transparent)] hover:text-[var(--foreground)]"
          }`}
        >
          <IconServer />
          Signaling Servers
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
      <div className="mt-auto border-t border-[var(--border)] p-2">
        <button
          onClick={() => setThemeOpen(!themeOpen)}
          className={`w-full px-3 py-2 text-left text-sm rounded flex items-center gap-2 transition-colors ${
            themeOpen
              ? "bg-[color-mix(in_srgb,var(--accent)_18%,transparent)] text-[var(--foreground)]"
              : "text-[var(--muted)] hover:bg-[color-mix(in_srgb,var(--border)_40%,transparent)] hover:text-[var(--foreground)]"
          }`}
        >
          {mounted ? (
            (theme === "light" || theme === "sepia") ? <IconSun /> : <IconMoon />
          ) : (
            <IconSun />
          )}
          <span className="capitalize">{mounted ? (theme === "dark-purple" ? "Dark Purple" : theme) : "light"}</span>
          <div className="ml-auto">
            {themeOpen ? <IconChevronUp /> : <IconChevronDown />}
          </div>
        </button>
        {themeOpen && (
          <div className="space-y-0.5">
            <button
              onClick={() => {
                setTheme("light");
                setThemeOpen(false);
              }}
              className="w-full px-3 py-2 text-left text-sm text-[var(--foreground)] hover:bg-[color-mix(in_srgb,var(--border)_45%,transparent)] flex items-center gap-2"
            >
              <IconSun />
              Light
            </button>
            <button
              onClick={() => {
                setTheme("sepia");
                setThemeOpen(false);
              }}
              className="w-full px-3 py-2 text-left text-sm text-[var(--foreground)] hover:bg-[color-mix(in_srgb,var(--border)_45%,transparent)] flex items-center gap-2"
            >
              <IconSun />
              Sepia
            </button>
            <button
              onClick={() => {
                setTheme("dark");
                setThemeOpen(false);
              }}
              className="w-full px-3 py-2 text-left text-sm text-[var(--foreground)] hover:bg-[color-mix(in_srgb,var(--border)_45%,transparent)] flex items-center gap-2"
            >
              <IconMoon />
              Dark
            </button>
            <button
              onClick={() => {
                setTheme("dark-purple");
                setThemeOpen(false);
              }}
              className="w-full px-3 py-2 text-left text-sm text-[var(--foreground)] hover:bg-[color-mix(in_srgb,var(--border)_45%,transparent)] flex items-center gap-2"
            >
              <IconMoon />
              Dark Purple
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
