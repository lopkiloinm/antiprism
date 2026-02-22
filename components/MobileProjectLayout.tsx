"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  IconHome,
  IconPlus,
  IconChevronDown,
  IconFilePlus,
  IconFolderPlus,
  IconUpload,
  IconFolderOpen,
  IconRefreshCw,
  IconLoader,
  IconFolder,
  IconCode2,
  IconFile,
  IconZoomIn,
  IconZoomOut,
  IconDownload,
} from "./Icons";

interface MobileProjectLayoutProps {
  projectName: string;
  projectId: string;
  isCompiling: boolean;
  compilerReady: boolean;
  onCompile: () => void;
  pdfUrl: string | null;
  currentPage?: number;
  totalPages?: number;
  
  // Tab panels
  filesPanel: React.ReactNode;
  editorPanel: React.ReactNode;
  pdfPanel: React.ReactNode;
  
  // State from parent
  activeFile: string | null;
  openTabsCount: number;
  
  // Actions
  onAddFile?: () => void;
  onAddFolder?: () => void;
  onUploadFile?: () => void;
  onUploadDirectory?: () => void;
}

export function MobileProjectLayout({
  projectName,
  projectId,
  isCompiling,
  compilerReady,
  onCompile,
  pdfUrl,
  currentPage = 1,
  totalPages = 1,
  filesPanel,
  editorPanel,
  pdfPanel,
  activeFile,
  openTabsCount,
  onAddFile,
  onAddFolder,
  onUploadFile,
  onUploadDirectory,
}: MobileProjectLayoutProps) {
  const [activeTab, setActiveTab] = useState<"files" | "code" | "preview">("files");
  const [showAddMenu, setShowAddMenu] = useState(false);
  const addMenuRef = useRef<HTMLDivElement>(null);

  // Handle click outside for add menu
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (addMenuRef.current && !addMenuRef.current.contains(e.target as Node)) {
        setShowAddMenu(false);
      }
    };

    if (showAddMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showAddMenu]);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[var(--background)] text-[var(--foreground)]">
      {/* Top Bar */}
      <div className="h-14 flex items-center justify-between px-3 border-b border-[var(--border)] shrink-0 bg-[var(--background)] z-20">
        <Link 
          href="/" 
          className="flex items-center gap-2 text-[var(--foreground)] hover:text-[var(--accent)] transition-colors p-2 -ml-2 rounded-md"
        >
          <span className="flex items-center justify-center w-5 h-5"><IconHome /></span>
        </Link>
        
        <div className="flex items-center gap-2">
          {/* Add Dropdown */}
          <div className="relative" ref={addMenuRef}>
            <button 
              onClick={() => setShowAddMenu(!showAddMenu)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[color-mix(in_srgb,var(--border)_22%,transparent)] hover:bg-[color-mix(in_srgb,var(--border)_45%,transparent)] text-[var(--foreground)] transition-colors"
            >
              <span className="flex items-center justify-center w-4 h-4"><IconPlus /></span>
              <span className="text-sm font-medium">Add</span>
              <span className="flex items-center justify-center w-3 h-3 opacity-70"><IconChevronDown /></span>
            </button>
            
            {showAddMenu && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-[var(--background)] border border-[var(--border)] shadow-lg rounded-md overflow-hidden z-50 py-1">
                <button 
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[var(--foreground)] hover:bg-[color-mix(in_srgb,var(--border)_45%,transparent)] cursor-pointer text-left"
                  onClick={() => {
                    setShowAddMenu(false);
                    onAddFile?.();
                  }}
                >
                  <span className="flex items-center justify-center w-4 h-4 text-[var(--muted)]"><IconFilePlus /></span>
                  Add File
                </button>
                <button 
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[var(--foreground)] hover:bg-[color-mix(in_srgb,var(--border)_45%,transparent)] cursor-pointer text-left"
                  onClick={() => {
                    setShowAddMenu(false);
                    onAddFolder?.();
                  }}
                >
                  <span className="flex items-center justify-center w-4 h-4 text-[var(--muted)]"><IconFolderPlus /></span>
                  Add Folder
                </button>
                <div className="h-px bg-[var(--border)] my-1" />
                <button 
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[var(--foreground)] hover:bg-[color-mix(in_srgb,var(--border)_45%,transparent)] cursor-pointer text-left"
                  onClick={() => {
                    setShowAddMenu(false);
                    onUploadFile?.();
                  }}
                >
                  <span className="flex items-center justify-center w-4 h-4 text-[var(--muted)]"><IconUpload /></span>
                  Upload File
                </button>
                <button 
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[var(--foreground)] hover:bg-[color-mix(in_srgb,var(--border)_45%,transparent)] cursor-pointer text-left"
                  onClick={() => {
                    setShowAddMenu(false);
                    onUploadDirectory?.();
                  }}
                >
                  <span className="flex items-center justify-center w-4 h-4 text-[var(--muted)]"><IconFolderOpen /></span>
                  Upload Directory
                </button>
              </div>
            )}
          </div>
          
          {/* Compile Button */}
          <button 
            onClick={onCompile}
            disabled={!compilerReady || isCompiling}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white disabled:opacity-50 transition-colors"
          >
            {isCompiling ? (
              <span className="flex items-center justify-center w-4 h-4"><IconLoader /></span>
            ) : (
              <span className="flex items-center justify-center w-4 h-4"><IconRefreshCw /></span>
            )}
            <span className="text-sm font-medium">Compile</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden relative z-0">
        {/* Files Panel */}
        <div 
          className={`absolute inset-0 flex flex-col transition-opacity duration-200 ${
            activeTab === "files" ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
          }`}
        >
          <div className="px-3 py-2 border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--border)_10%,transparent)]">
            <h2 className="text-sm font-medium text-[var(--muted)] uppercase tracking-wider">Project Files</h2>
          </div>
          <div className="flex-1 overflow-auto p-2">
            {filesPanel}
          </div>
        </div>

        {/* Code Panel */}
        <div 
          className={`absolute inset-0 flex flex-col transition-opacity duration-200 bg-[var(--background)] ${
            activeTab === "code" ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
          }`}
        >
          {openTabsCount === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-[var(--muted)] p-6 text-center">
              <span className="flex items-center justify-center w-12 h-12 mb-4 opacity-20"><IconCode2 /></span>
              <p className="text-sm">No files open</p>
              <p className="text-xs mt-1">Select a file from the Files tab to start editing</p>
              <button 
                onClick={() => setActiveTab("files")}
                className="mt-4 px-4 py-2 text-sm bg-[color-mix(in_srgb,var(--border)_22%,transparent)] hover:bg-[color-mix(in_srgb,var(--border)_45%,transparent)] rounded-md transition-colors text-[var(--foreground)]"
              >
                Go to Files
              </button>
            </div>
          ) : (
            <div className="flex-1 overflow-hidden flex flex-col">
              {editorPanel}
            </div>
          )}
        </div>

        {/* Preview Panel */}
        <div 
          className={`absolute inset-0 flex flex-col transition-opacity duration-200 bg-[var(--background)] ${
            activeTab === "preview" ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
          }`}
        >
          {pdfPanel}
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="h-14 flex items-center justify-around border-t border-[var(--border)] shrink-0 bg-[var(--background)] safe-area-bottom z-20">
        <button
          onClick={() => setActiveTab("files")}
          className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-colors ${
            activeTab === "files" 
              ? "text-[var(--accent)]" 
              : "text-[var(--muted)] hover:text-[var(--foreground)]"
          }`}
        >
          <span className="flex items-center justify-center w-5 h-5"><IconFolder /></span>
          <span className="text-[10px] font-medium">Files</span>
        </button>
        
        <button
          onClick={() => setActiveTab("code")}
          className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-colors relative ${
            activeTab === "code" 
              ? "text-[var(--accent)]" 
              : "text-[var(--muted)] hover:text-[var(--foreground)]"
          }`}
        >
          <span className="flex items-center justify-center w-5 h-5"><IconCode2 /></span>
          <span className="text-[10px] font-medium">Code</span>
          {openTabsCount > 0 && activeTab !== "code" && (
            <span className="absolute top-1.5 right-[calc(50%-16px)] w-2 h-2 rounded-full bg-[var(--accent)]" />
          )}
        </button>
        
        <button
          onClick={() => setActiveTab("preview")}
          className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-colors relative ${
            activeTab === "preview" 
              ? "text-[var(--accent)]" 
              : "text-[var(--muted)] hover:text-[var(--foreground)]"
          }`}
        >
          <span className="flex items-center justify-center w-5 h-5"><IconFile /></span>
          <span className="text-[10px] font-medium">Preview</span>
          {pdfUrl && activeTab !== "preview" && (
            <span className="absolute top-1.5 right-[calc(50%-16px)] w-2 h-2 rounded-full bg-green-500" />
          )}
        </button>
      </div>
    </div>
  );
}
