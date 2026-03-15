"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getAssetPath } from "@/lib/assetPath";
import {
  IconFolder,
  IconTrash2,
  IconServer,
  IconFileText,
  IconHistory,
  IconSun,
  IconMoon,
  IconMonitor,
  IconLayoutGrid,
  IconX,
  IconAntiprism,
} from "./Icons";
import { Sun as LucideSun, Moon as LucideMoon, Monitor as LucideMonitor } from "lucide-react";
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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);
  
  return (
    <aside className={`border-r border-[var(--border)] flex flex-col bg-[var(--background)] shrink-0 h-full ${isMobile ? 'w-20' : 'w-20'} items-center py-4`}>
      <div className="flex shrink-0 items-center justify-center mb-6 relative z-10 w-full">
        <div 
          onClick={() => router.push("/features")}
          className="flex items-center justify-center p-2 rounded-xl hover:bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] text-[var(--accent)] transition-colors cursor-pointer"
          title="Antiprism Features"
        >
          <img 
            src={getAssetPath("/associated-press.svg")} 
            alt="Antiprism" 
            className="w-8 h-8"
          />
        </div>
              </div>
      
      <nav className="flex flex-col gap-2 w-full px-1">
        <button
          onClick={() => onNavChange("all")}
          className={`w-full flex flex-col items-center justify-center py-3 px-1 rounded-lg transition-all relative group ${
            activeNav === "all"
              ? "text-[var(--accent)]"
              : "text-[var(--muted)] hover:text-[var(--foreground)]"
          }`}
        >
          <span className="mb-1 w-5 h-5 flex items-center justify-center [&>svg]:w-5 [&>svg]:h-5"><IconFolder /></span>
          <span className="text-[10px] leading-tight font-medium text-center">All</span>
          {activeNav === "all" ? (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-[var(--accent)] rounded-r transition-all group-hover:h-8 group-hover:w-1" />
          ) : (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-3 bg-[var(--accent)] rounded-r opacity-0 transition-all group-hover:opacity-100" />
          )}
        </button>
        
        <button
          onClick={() => onNavChange("projects")}
          className={`w-full flex flex-col items-center justify-center py-3 px-1 rounded-lg transition-all relative group ${
            activeNav === "projects"
              ? "text-[var(--accent)]"
              : "text-[var(--muted)] hover:text-[var(--foreground)]"
          }`}
        >
          <span className="mb-1 w-5 h-5 flex items-center justify-center [&>svg]:w-5 [&>svg]:h-5"><IconFileText /></span>
          <span className="text-[10px] leading-tight font-medium text-center">Projects</span>
          {activeNav === "projects" ? (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-[var(--accent)] rounded-r transition-all group-hover:h-8 group-hover:w-1" />
          ) : (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-3 bg-[var(--accent)] rounded-r opacity-0 transition-all group-hover:opacity-100" />
          )}
        </button>
        
        <button
          onClick={() => onNavChange("recently-opened")}
          className={`w-full flex flex-col items-center justify-center py-3 px-1 rounded-lg transition-all relative group ${
            activeNav === "recently-opened"
              ? "text-[var(--accent)]"
              : "text-[var(--muted)] hover:text-[var(--foreground)]"
          }`}
        >
          <span className="mb-1 w-5 h-5 flex items-center justify-center [&>svg]:w-5 [&>svg]:h-5"><IconHistory /></span>
          <span className="text-[10px] leading-tight font-medium text-center">Recent</span>
          {activeNav === "recently-opened" ? (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-[var(--accent)] rounded-r transition-all group-hover:h-8 group-hover:w-1" />
          ) : (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-3 bg-[var(--accent)] rounded-r opacity-0 transition-all group-hover:opacity-100" />
          )}
        </button>
        
        <button
          onClick={() => onNavChange("templates")}
          className={`w-full flex flex-col items-center justify-center py-3 px-1 rounded-lg transition-all relative group ${
            activeNav === "templates"
              ? "text-[var(--accent)]"
              : "text-[var(--muted)] hover:text-[var(--foreground)]"
          }`}
        >
          <span className="mb-1 w-5 h-5 flex items-center justify-center [&>svg]:w-5 [&>svg]:h-5"><IconLayoutGrid /></span>
          <span className="text-[10px] leading-tight font-medium text-center">Templates</span>
          {activeNav === "templates" ? (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-[var(--accent)] rounded-r transition-all group-hover:h-8 group-hover:w-1" />
          ) : (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-3 bg-[var(--accent)] rounded-r opacity-0 transition-all group-hover:opacity-100" />
          )}
        </button>
        
        <button
          onClick={() => onNavChange("servers")}
          className={`w-full flex flex-col items-center justify-center py-3 px-1 rounded-lg transition-all relative group ${
            activeNav === "servers"
              ? "text-[var(--accent)]"
              : "text-[var(--muted)] hover:text-[var(--foreground)]"
          }`}
        >
          <span className="mb-1 w-5 h-5 flex items-center justify-center [&>svg]:w-5 [&>svg]:h-5"><IconServer /></span>
          <span className="text-[10px] leading-tight font-medium text-center">Servers</span>
          {activeNav === "servers" ? (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-[var(--accent)] rounded-r transition-all group-hover:h-8 group-hover:w-1" />
          ) : (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-3 bg-[var(--accent)] rounded-r opacity-0 transition-all group-hover:opacity-100" />
          )}
        </button>
        
        <button
          onClick={() => onNavChange("trash")}
          className={`w-full flex flex-col items-center justify-center py-3 px-1 rounded-lg transition-all relative group ${
            activeNav === "trash"
              ? "text-[var(--accent)]"
              : "text-[var(--muted)] hover:text-[var(--foreground)]"
          }`}
        >
          <span className="mb-1 w-5 h-5 flex items-center justify-center [&>svg]:w-5 [&>svg]:h-5"><IconTrash2 /></span>
          <span className="text-[10px] leading-tight font-medium text-center">Trash</span>
          {activeNav === "trash" ? (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-[var(--accent)] rounded-r transition-all group-hover:h-8 group-hover:w-1" />
          ) : (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-3 bg-[var(--accent)] rounded-r opacity-0 transition-all group-hover:opacity-100" />
          )}
        </button>
      </nav>
      
      <div className="mt-auto w-full px-1 flex flex-col gap-2">
        <button
          onClick={() => setTheme("light")}
          className={`w-full flex flex-col items-center justify-center py-3 px-1 rounded-lg transition-all relative group ${
            mounted && theme === "light" 
              ? "text-[var(--accent)]" 
              : "text-[var(--muted)] hover:text-[var(--foreground)]"
          }`}
          title="Light mode"
        >
          <span className="mb-1 w-5 h-5 flex items-center justify-center [&>svg]:w-5 [&>svg]:h-5">
            <LucideSun />
          </span>
          <span className="text-[10px] leading-tight font-medium text-center">Light</span>
          {mounted && theme === "light" ? (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-[var(--accent)] rounded-r transition-all group-hover:h-8 group-hover:w-1" />
          ) : (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-3 bg-[var(--accent)] rounded-r opacity-0 transition-all group-hover:opacity-100" />
          )}
        </button>
        <button
          onClick={() => setTheme("dark")}
          className={`w-full flex flex-col items-center justify-center py-3 px-1 rounded-lg transition-all relative group ${
            mounted && theme === "dark" 
              ? "text-[var(--accent)]" 
              : "text-[var(--muted)] hover:text-[var(--foreground)]"
          }`}
          title="Dark mode"
        >
          <span className="mb-1 w-5 h-5 flex items-center justify-center [&>svg]:w-5 [&>svg]:h-5">
            <LucideMoon />
          </span>
          <span className="text-[10px] leading-tight font-medium text-center">Dark</span>
          {mounted && theme === "dark" ? (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-[var(--accent)] rounded-r transition-all group-hover:h-8 group-hover:w-1" />
          ) : (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-3 bg-[var(--accent)] rounded-r opacity-0 transition-all group-hover:opacity-100" />
          )}
        </button>
        <button
          onClick={() => setTheme("system")}
          className={`w-full flex flex-col items-center justify-center py-3 px-1 rounded-lg transition-all relative group ${
            mounted && theme === "system" 
              ? "text-[var(--accent)]" 
              : "text-[var(--muted)] hover:text-[var(--foreground)]"
          }`}
          title="System preference"
        >
          <span className="mb-1 w-5 h-5 flex items-center justify-center [&>svg]:w-5 [&>svg]:h-5">
            <LucideMonitor />
          </span>
          <span className="text-[10px] leading-tight font-medium text-center">System</span>
          {mounted && theme === "system" ? (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-[var(--accent)] rounded-r transition-all group-hover:h-8 group-hover:w-1" />
          ) : (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-3 bg-[var(--accent)] rounded-r opacity-0 transition-all group-hover:opacity-100" />
          )}
        </button>
      </div>
    </aside>
  );
}
