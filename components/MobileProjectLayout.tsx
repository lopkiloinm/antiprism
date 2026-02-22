"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { ProjectDropdown } from "./ProjectDropdown";
import { FileActions } from "./FileActions";
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
  IconSearch,
  IconX,
} from "./Icons";

type IdbfsFs = Awaited<ReturnType<typeof import("@wwog/idbfs").mount>>;

interface MobileProjectLayoutProps {
  projectName: string;
  projectId: string;
  isCompiling: boolean;
  compilerReady: boolean;
  onCompile: () => void;
  pdfUrl: string | null;
  currentPage?: number;
  totalPages?: number;
  fs: IdbfsFs | null;
  
  // Tab panels
  filesPanel: (searchQuery: string) => React.ReactElement | null;
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
  onRefresh?: () => void;
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
  fs,
  filesPanel,
  editorPanel,
  pdfPanel,
  activeFile,
  openTabsCount,
  onAddFile,
  onAddFolder,
  onUploadFile,
  onUploadDirectory,
  onRefresh,
}: MobileProjectLayoutProps) {
  const [activeTab, setActiveTab] = useState<"files" | "code" | "preview">("files");
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const addMenuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Auto-switch to code tab when a file is opened
  useEffect(() => {
    if (activeFile && activeTab === "files") {
      setActiveTab("code");
    }
  }, [activeFile]); // purposely omit activeTab to only trigger on activeFile change

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

  // Focus search input when expanded
  useEffect(() => {
    if (searchExpanded && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [searchExpanded]);

  return (
    <div className="flex flex-col fixed inset-0 overflow-hidden bg-[var(--background)] text-[var(--foreground)]">
      {/* Top Bar */}
      <div className="h-14 flex items-center justify-between px-3 border-b border-[var(--border)] shrink-0 bg-[var(--background)] z-20">
        <Link 
          href="/" 
          className="flex items-center gap-2 text-[var(--foreground)] hover:text-[var(--accent)] transition-colors p-2 -ml-2 rounded-md shrink-0"
        >
          <span className="flex items-center justify-center w-5 h-5"><IconHome /></span>
        </Link>
        
        <div className="flex-1 min-w-0 px-2 flex justify-center">
          <ProjectDropdown
            projectId={projectId}
            projectName={projectName}
            isRoom={false} // Currently we don't have isRoom in mobile props, defaulting to false
            fs={fs}
            onRename={() => {}} // Might need to pass this down if we want rename support
          >
            <span className="truncate max-w-[150px] inline-block align-bottom">{projectName}</span>
          </ProjectDropdown>
        </div>
        
        <div className="flex items-center gap-2 shrink-0">
          {/* Compile Button */}
          <button 
            onClick={onCompile}
            disabled={!compilerReady || isCompiling}
            className="flex items-center gap-1.5 p-2 rounded bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white disabled:opacity-50 transition-colors"
            title="Compile"
          >
            {isCompiling ? (
              <span className="flex items-center justify-center w-5 h-5"><IconLoader /></span>
            ) : (
              <span className="flex items-center justify-center w-5 h-5"><IconRefreshCw /></span>
            )}
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
          <div className="px-3 py-2 border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--border)_10%,transparent)] flex justify-between items-center relative">
            {searchExpanded ? (
              <div className="absolute inset-0 z-10 flex items-center bg-[var(--background)] px-2 gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)] pointer-events-none">
                    <IconSearch />
                  </span>
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Search files…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 px-3 py-1.5 text-sm rounded bg-[color-mix(in_srgb,var(--border)_22%,transparent)] border border-[var(--border)] text-[var(--foreground)] placeholder-[var(--muted)] focus:outline-none focus:ring-1 focus:ring-[color-mix(in_srgb,var(--accent)_55%,transparent)]"
                  />
                </div>
                <button 
                  onClick={() => {
                    setSearchExpanded(false);
                    setSearchQuery("");
                  }}
                  className="p-1.5 text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
                >
                  <IconX />
                </button>
              </div>
            ) : (
              <>
                <h2 className="text-sm font-medium text-[var(--muted)] uppercase tracking-wider">Project Files</h2>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setSearchExpanded(true)}
                    className="p-1 rounded text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[color-mix(in_srgb,var(--border)_45%,transparent)] transition-colors"
                  >
                    <IconSearch />
                  </button>
                  <div className="relative" ref={addMenuRef}>
                    <button 
                      onClick={() => setShowAddMenu(!showAddMenu)}
                      className="p-1 rounded text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[color-mix(in_srgb,var(--border)_45%,transparent)] transition-colors"
                    >
                      <IconPlus />
                    </button>
                    
                    {showAddMenu && (
                      <div className="absolute right-0 top-full mt-1 w-48 bg-[var(--background)] border border-[var(--border)] shadow-lg rounded-md overflow-hidden z-50 py-1">
                        <FileActions
                          fs={fs}
                          basePath={`/projects/${projectId}`}
                          expanded={true}
                          onAction={() => {
                            setShowAddMenu(false);
                            onRefresh?.();
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
          <div className="flex-1 overflow-auto p-2">
            <div onClick={() => {
              // The FileTree will handle actual selection logic.
              // We'll rely on an effect to watch activeFile changes
              // and auto-switch to the code tab if a file is opened.
            }}>
              {filesPanel(searchQuery)}
            </div>
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
      <div className="flex items-center justify-around border-t border-[var(--border)] shrink-0 bg-[var(--background)] z-50 pb-[env(safe-area-inset-bottom)]">
        <button
          onClick={() => setActiveTab("files")}
          className={`flex flex-col items-center justify-center w-full h-14 gap-1 transition-colors ${
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
          className={`flex flex-col items-center justify-center w-full h-14 gap-1 transition-colors relative ${
            activeTab === "code" 
              ? "text-[var(--accent)]" 
              : "text-[var(--muted)] hover:text-[var(--foreground)]"
          }`}
        >
          <span className="flex items-center justify-center w-5 h-5"><IconCode2 /></span>
          <span className="text-[10px] font-medium">Code</span>
          {openTabsCount > 0 && activeTab !== "code" && (
            <div className="absolute top-1.5 right-[calc(50%-20px)] flex flex-col items-center gap-0.5">
              <span className="w-2 h-2 rounded-full bg-[var(--accent)] border-2 border-[var(--background)] shadow-sm" />
            </div>
          )}
        </button>
        
        <button
          onClick={() => setActiveTab("preview")}
          className={`flex flex-col items-center justify-center w-full h-14 gap-1 transition-colors relative ${
            activeTab === "preview" 
              ? "text-[var(--accent)]" 
              : "text-[var(--muted)] hover:text-[var(--foreground)]"
          }`}
        >
          <span className="flex items-center justify-center w-5 h-5"><IconFile /></span>
          <span className="text-[10px] font-medium">Preview</span>
          {pdfUrl && activeTab !== "preview" && (
            <span className="absolute top-1.5 right-[calc(50%-16px)] w-2 h-2 rounded-full bg-green-500 border-2 border-[var(--background)]" />
          )}
        </button>
      </div>
    </div>
  );
}
