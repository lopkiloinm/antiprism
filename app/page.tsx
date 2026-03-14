"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { mount } from "@wwog/idbfs";
import JSZip from "jszip";
import {
  getProjects,
  getRooms,
  getAllItems,
  getTrashedProjects,
  createProject,
  deleteProject,
  trashProject,
  restoreProject,
  renameProject,
  renameRoom,
  deleteRoom,
  deleteProjectDataFromStorage,
  getRecentlyOpened,
  addRecentlyOpened,
} from "@/lib/projects";
import type { Project } from "@/lib/projects";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { ProjectList } from "@/components/ProjectList";
import { SignalingServerList } from "@/components/SignalingServerList";
import { NameModal } from "@/components/NameModal";
import { TemplateGallery } from "@/components/TemplateGallery";
import { useResponsive } from "@/hooks/useResponsive";
import { 
  IconSearch, 
  IconPlus, 
  IconFolderPlus, 
  IconFilePlus,
  IconUpload,
  IconList,
  IconLayoutGrid,
  IconX,
  IconMenu,
  IconTrash2,
  IconDownload,
  IconRotateCcw,
} from "@/components/Icons";

type NavItem = "all" | "projects" | "recently-opened" | "templates" | "servers" | "trash";

const TITLES: Record<NavItem, string> = {
  all: "All Projects",
  projects: "Your Projects",
  "recently-opened": "Recently Opened",
  templates: "Templates",
  servers: "Signaling Servers",
  trash: "Trashed Projects",
};

export default function DashboardPage() {
  const router = useRouter();
  const { isMobile } = useResponsive();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  useEffect(() => {
    setMobileMenuOpen(false);
  }, []);
  
  const signalingServerListRef = useRef<{ handleNewServer: () => void }>(null);
  const [activeNav, setActiveNav] = useState<NavItem>("projects");
  const [viewMode, setViewMode] = useState<"list" | "icons">("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [items, setItems] = useState<Project[]>([]);
  const [refresh, setRefresh] = useState(0);
  const [isDownloading, setIsDownloading] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [activeNav]);

  const loadItems = useCallback(() => {
    let list: Project[];
    if (activeNav === "all") list = getAllItems();
    else if (activeNav === "projects") list = getProjects();
    else if (activeNav === "recently-opened") list = getRecentlyOpened();
    else if (activeNav === "servers") list = []; // Servers handled by SignalingServerList
    else list = getTrashedProjects().map((p) => ({ ...p, isRoom: false }));

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(q));
    }
    setItems(list);
  }, [activeNav, searchQuery]);

  useEffect(() => {
    loadItems();
  }, [loadItems, refresh]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const [renameModalOpen, setRenameModalOpen] = useState(false);
  const [projectToRename, setProjectToRename] = useState<Project | null>(null);

  const handleNewServer = () => {
    if (signalingServerListRef.current) {
      signalingServerListRef.current.handleNewServer();
    }
  };

  const handleNewProject = async () => {
    const project = await createProject("Untitled Project");
    setRefresh((r) => r + 1);
    router.push(`/project/${project.id}`);
  };

  const handleImportZip = async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".zip";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        console.log("Starting zip import:", file.name, file.size);
        const project = await createProject(file.name.replace(/\.zip$/i, "") || "Imported Project");
        console.log("Created project:", project.id);
        
        const zip = await JSZip.loadAsync(file);
        console.log("Loaded zip, file count:", Object.keys(zip.files).length);
        
        const fs = await mount();
        console.log("Mounted filesystem");

        const createDirectoryRecursive = async (dirPath: string) => {
          const parts = dirPath.split('/').filter(part => part.length > 0);
          let currentPath = basePath;
          
          for (const part of parts) {
            currentPath = `${currentPath}/${part}`;
            try {
              await fs.mkdir(currentPath);
              console.log("Created directory:", currentPath);
            } catch (err) {
              console.log("Directory exists or failed:", currentPath, err);
            }
          }
        };

        const basePath = `/projects/${project.id}`;
        for (const dir of ["/projects", basePath]) {
          try {
            await fs.mkdir(dir);
            console.log("Created directory:", dir);
          } catch (err) {
            console.log("Directory exists or failed:", dir, err);
          }
        }

        for (const [path, entry] of Object.entries(zip.files)) {
          if (entry.dir) {
            const dirPath = path.replace(/\/$/, "");
            if (dirPath) {
              await createDirectoryRecursive(dirPath);
            }
          } else {
            const content = await entry.async("arraybuffer");
            const cleanPath = path.replace(/\/$/, "");
            if (cleanPath) {
              const dirPath = cleanPath.substring(0, cleanPath.lastIndexOf("/"));
              if (dirPath && dirPath !== cleanPath) {
                await createDirectoryRecursive(dirPath);
              }
              await fs.writeFile(`${basePath}/${cleanPath}`, content, {
                mimeType: "application/octet-stream",
              });
              console.log("Wrote file:", `${basePath}/${cleanPath}`);
            }
          }
        }

        try {
          const marker = new TextEncoder().encode("imported").buffer as ArrayBuffer;
          await fs.writeFile(`${basePath}/.antiprism_imported`, marker, { mimeType: "text/plain" });
          console.log("Created import marker");
        } catch (err) {
          console.log("Failed to create import marker:", err);
        }
        setRefresh((r) => r + 1);
        router.push(`/project/${project.id}`);
      } catch (err) {
        console.error("Import zip failed:", err);
        alert(`Zip import failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    };
    input.click();
  };

  const handleImportFolder = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.setAttribute("webkitdirectory", "");
    input.multiple = true;
    input.onchange = async (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (!files?.length) return;
      try {
        const project = await createProject("Imported Folder");
        const fs = await mount();
        const basePath = `/projects/${project.id}`;
        for (const dir of ["/projects", basePath]) {
          try {
            await fs.mkdir(dir);
          } catch {
            /* may exist */
          }
        }

        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const webPath = (file as File & { webkitRelativePath?: string }).webkitRelativePath;
          const relPath = webPath || file.name;
          const fullPath = `${basePath}/${relPath}`;
          const dir = fullPath.substring(0, fullPath.lastIndexOf("/"));
          if (dir && dir !== basePath) {
            const parts = dir.replace(basePath + "/", "").split("/");
            let current = basePath;
            
            for (const p of parts) {
              current += `/${p}`;
              try {
                await fs.mkdir(current);
              } catch {
                // exists
              }
            }
          }
          const buf = await file.arrayBuffer();
          await fs.writeFile(fullPath, buf, {
            mimeType: file.type || "application/octet-stream",
          });
        }

        try {
          const marker = new TextEncoder().encode("imported").buffer as ArrayBuffer;
          await fs.writeFile(`${basePath}/.antiprism_imported`, marker, { mimeType: "text/plain" });
        } catch {
          // ignore (create-only + strict-mode races)
        }
        setRefresh((r) => r + 1);
        router.push(`/project/${project.id}`);
      } catch (err) {
        console.error("Import folder failed:", err);
      }
    };
    input.click();
  };

  const handleDelete = async (item: Project) => {
    if (item.isRoom) {
      deleteRoom(item.id);
    } else {
      if (activeNav === "trash") {
        deleteProject(item.id);
        await deleteProjectDataFromStorage(item.id);
      } else {
        trashProject(item.id);
      }
    }
    setRefresh((r) => r + 1);
  };

  const handleDownloadProject = async (item: Project) => {
    if (item.isRoom) return;
    setIsDownloading(item.id);
    try {
      const fs = await mount();
      const zip = new JSZip();
      const basePath = `/projects/${item.id}`;

      async function addDir(absDir: string, relDir: string) {
        const { dirs, files } = await fs.readdir(absDir);
        for (const f of files) {
          const absPath = absDir === "/" ? `/${f.name}` : `${absDir}/${f.name}`;
          const relPath = relDir ? `${relDir}/${f.name}` : f.name;
          const data = await fs.readFile(absPath);
          zip.file(relPath, data as ArrayBuffer);
        }
        for (const d of dirs) {
          const subAbs = absDir === "/" ? `/${d.name}` : `${absDir}/${d.name}`;
          const subRel = relDir ? `${relDir}/${d.name}` : d.name;
          await addDir(subAbs, subRel);
        }
      }

      await addDir(basePath, "");

      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const safeName = (item.name || "project").replace(/[\\/:*?\"<>|]+/g, "-").trim() || "project";
      a.href = url;
      a.download = `${safeName}.zip`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } catch (err) {
      console.error("Download zip failed:", err);
    } finally {
      setIsDownloading(null);
    }
  };

  const handleRestoreProject = (item: Project) => {
    if (item.isRoom) return;
    restoreProject(item.id);
    setRefresh((r) => r + 1);
  };

  const handleSelectionChange = (selectedIds: string[]) => {
    setSelectedItems(selectedIds);
  };

  const handleClearSelection = () => {
    setSelectedItems([]);
  };

  const handleBulkDelete = async () => {
    const selectedProjects = items.filter(item => selectedItems.includes(item.id));
    for (const item of selectedProjects) {
      await handleDelete(item);
    }
    setSelectedItems([]);
  };

  const handleBulkDownload = async () => {
    const selectedProjects = items.filter(item => selectedItems.includes(item.id) && !item.isRoom);
    for (const item of selectedProjects) {
      await handleDownloadProject(item);
    }
  };

  const handleBulkRestore = async () => {
    const selectedProjects = items.filter(item => selectedItems.includes(item.id) && !item.isRoom);
    for (const item of selectedProjects) {
      handleRestoreProject(item);
    }
    setSelectedItems([]);
  };

  const handleRenameProject = (project: Project, newName: string) => {
    setProjectToRename(project);
    setRenameModalOpen(true);
  };

  const handleRenameConfirm = (newName: string) => {
    if (!projectToRename) return;
    
    if (projectToRename.isRoom) {
      renameRoom(projectToRename.id, newName);
    } else {
      renameProject(projectToRename.id, newName);
    }
    setRefresh((r) => r + 1);
    setRenameModalOpen(false);
    setProjectToRename(null);
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[var(--background)] text-[var(--foreground)] relative">
      {isMobile && (
        <div 
          className={`absolute inset-0 bg-black/50 z-40 transition-opacity duration-300 ${mobileMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <div className={`
        ${isMobile ? 'fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 w-20' : 'relative z-10 w-20 shrink-0'}
        ${isMobile && !mobileMenuOpen ? '-translate-x-full' : 'translate-x-0'}
      `}>
        <DashboardSidebar
          activeNav={activeNav}
          onNavChange={setActiveNav}
          isMobile={isMobile}
          onClose={() => setMobileMenuOpen(false)}
        />
      </div>

      <main className="flex-1 flex flex-col min-w-0 min-h-0 overflow-y-auto">
        <div className="max-w-4xl mx-auto w-full px-8 py-8 flex flex-col gap-6 pb-32">
          
          <div className="flex items-center gap-4">
            {isMobile && (
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="p-2 -ml-2 text-[var(--muted)] hover:text-[var(--foreground)] rounded-xl transition-colors"
              >
                <IconMenu />
              </button>
            )}
            {/* Top Search Bar */}
            <div className="relative w-full shadow-sm">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)] pointer-events-none w-4 h-4 flex items-center justify-center [&>svg]:w-4 [&>svg]:h-4">
                <IconSearch />
              </span>
              <input
                type="text"
                placeholder="Search your projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)] placeholder-[var(--muted)] focus:outline-none focus:border-[color-mix(in_srgb,var(--accent)_55%,transparent)] focus:ring-1 focus:ring-[color-mix(in_srgb,var(--accent)_55%,transparent)] transition-all"
              />
            </div>
          </div>

          {/* Action Cards & Import */}
          {activeNav !== "servers" && activeNav !== "trash" && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <h2 className="text-sm font-semibold text-[var(--foreground)]">Start Creating</h2>
                <p className="text-xs text-[var(--muted)]">Click to create a new project, room, or import from zip</p>
              </div>

              <div className="flex gap-3">
                <div 
                  onClick={handleNewProject}
                  className="flex-1 flex items-center gap-3 p-3 border border-[var(--border)] rounded-lg bg-[color-mix(in_srgb,var(--accent)_8%,transparent)] hover:bg-[color-mix(in_srgb,var(--accent)_15%,transparent)] cursor-pointer transition-colors group"
                >
                  <div className="w-8 h-8 rounded-md bg-[color-mix(in_srgb,var(--accent)_15%,transparent)] text-[var(--accent)] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform [&>svg]:w-4 [&>svg]:h-4">
                    <IconFilePlus />
                  </div>
                  <span className="text-sm font-medium text-[var(--foreground)]">New Project</span>
                </div>

                <div 
                  onClick={() => setActiveNav("templates")}
                  className="flex-1 flex items-center gap-3 p-3 border border-[var(--border)] rounded-lg bg-[color-mix(in_srgb,var(--border)_8%,transparent)] hover:bg-[color-mix(in_srgb,var(--border)_20%,transparent)] cursor-pointer transition-colors group"
                >
                  <div className="w-8 h-8 rounded-md bg-[color-mix(in_srgb,var(--foreground)_5%,transparent)] text-[var(--foreground)] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform [&>svg]:w-4 [&>svg]:h-4">
                    <IconLayoutGrid />
                  </div>
                  <span className="text-sm font-medium text-[var(--foreground)]">From Template</span>
                </div>
              </div>

              <div 
                onClick={handleImportZip}
                className="w-full border border-dashed border-[var(--border)] rounded-lg p-6 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-[color-mix(in_srgb,var(--border)_8%,transparent)] transition-colors group"
              >
                <div className="w-10 h-10 rounded-full bg-[color-mix(in_srgb,var(--border)_20%,transparent)] flex items-center justify-center text-[var(--muted)] group-hover:text-[var(--foreground)] transition-colors [&>svg]:w-4 [&>svg]:h-4">
                  <IconUpload />
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-sm font-medium text-[var(--foreground)]">Paste or <span className="text-[var(--accent)] hover:underline">drag & drop</span> a file here</span>
                  <span className="text-xs text-[var(--muted)] mt-1">File types supported: .ZIP</span>
                </div>
              </div>
            </div>
          )}

          {/* List Section */}
          <div className="flex flex-col gap-3 mt-2">
            <div className="flex items-center justify-between min-h-[32px]">
              {selectedItems.length > 0 && activeNav !== "servers" ? (
                <div className="flex items-center bg-[color-mix(in_srgb,var(--border)_15%,transparent)] rounded-[6px] p-0.5 animate-in fade-in slide-in-from-left-2 duration-200">
                  <div className="flex items-center gap-1.5 pl-2 pr-1">
                    <span className="text-xs font-medium text-[var(--muted)]">
                      <span className="text-[var(--foreground)]">{selectedItems.length}</span> selected
                    </span>
                    <button 
                      onClick={handleClearSelection}
                      className="h-[26px] w-[26px] rounded-[4px] text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[color-mix(in_srgb,var(--border)_25%,transparent)] transition-colors flex items-center justify-center [&>svg]:w-3.5 [&>svg]:h-3.5"
                      title="Clear selection"
                    >
                      <IconX />
                    </button>
                  </div>

                  <div className="w-px h-3.5 bg-[color-mix(in_srgb,var(--border)_50%,transparent)] mx-0.5" />

                  <div className="flex items-center gap-0.5 px-0.5">
                    {activeNav !== "trash" && (
                      <button
                        onClick={handleBulkDownload}
                        className="flex items-center gap-1.5 h-[26px] px-2 rounded-[4px] text-xs font-medium text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[color-mix(in_srgb,var(--border)_25%,transparent)] transition-colors [&>svg]:w-3.5 [&>svg]:h-3.5"
                      >
                        <IconDownload />
                        <span className="hidden sm:inline">Download</span>
                      </button>
                    )}
                    {activeNav === "trash" && (
                      <button
                        onClick={handleBulkRestore}
                        className="flex items-center gap-1.5 h-[26px] px-2 rounded-[4px] text-xs font-medium text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[color-mix(in_srgb,var(--border)_25%,transparent)] transition-colors [&>svg]:w-3.5 [&>svg]:h-3.5"
                      >
                        <IconRotateCcw />
                        <span className="hidden sm:inline">Restore</span>
                      </button>
                    )}
                    <button
                      onClick={handleBulkDelete}
                      className="flex items-center gap-1.5 h-[26px] px-2 rounded-[4px] text-xs font-medium text-red-400/80 hover:text-red-400 hover:bg-red-500/10 transition-colors [&>svg]:w-3.5 [&>svg]:h-3.5"
                    >
                      <IconTrash2 />
                      <span className="hidden sm:inline">Delete</span>
                    </button>
                  </div>
                </div>
              ) : (
                <h2 className="text-sm font-semibold text-[var(--foreground)]">{TITLES[activeNav]}</h2>
              )}
              
              <div className="flex items-center gap-2 h-[30px]">
                {activeNav === "servers" && (
                  <button
                    onClick={handleNewServer}
                    className="px-2 h-full text-xs text-[var(--foreground)] bg-[var(--accent)] hover:bg-[var(--accent-hover)] rounded-md transition-colors flex items-center gap-1.5 [&>svg]:w-3.5 [&>svg]:h-3.5"
                    title="Add new signaling server"
                  >
                    <IconPlus />
                    New
                  </button>
                )}
                
                {activeNav !== "servers" && (
                  <div className="flex items-center bg-[color-mix(in_srgb,var(--border)_15%,transparent)] rounded-[6px] p-0.5 shrink-0 h-full">
                    <button
                      onClick={() => setViewMode("list")}
                      className={`h-full w-[26px] rounded-[4px] flex items-center justify-center [&>svg]:w-3.5 [&>svg]:h-3.5 transition-colors ${viewMode === "list" ? "bg-[var(--background)] text-[var(--foreground)]" : "text-[var(--muted)] hover:text-[var(--foreground)]"}`}
                    >
                      <IconList />
                    </button>
                    <button
                      onClick={() => setViewMode("icons")}
                      className={`h-full w-[26px] rounded-[4px] flex items-center justify-center [&>svg]:w-3.5 [&>svg]:h-3.5 transition-colors ${viewMode === "icons" ? "bg-[var(--background)] text-[var(--foreground)]" : "text-[var(--muted)] hover:text-[var(--foreground)]"}`}
                    >
                      <IconLayoutGrid />
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-[var(--background)] border border-[var(--border)] rounded-lg overflow-hidden shadow-sm">
              {activeNav === "servers" ? (
                <div className="p-0">
                  <SignalingServerList 
                    ref={signalingServerListRef}
                    searchQuery={searchQuery} 
                    viewMode={viewMode}
                    onNewServer={handleNewServer}
                  />
                </div>
              ) : activeNav === "templates" ? (
                <div className="p-0">
                  <TemplateGallery viewMode={viewMode} searchQuery={searchQuery} />
                </div>
              ) : (
                <div className="p-0">
                  <ProjectList
                    items={items}
                    viewMode={viewMode}
                    onDelete={handleDelete}
                    onDownload={activeNav === "trash" ? undefined : handleDownloadProject}
                    onRestore={activeNav === "trash" ? handleRestoreProject : undefined}
                    onRename={handleRenameProject}
                    deleteTitle={activeNav === "trash" ? "Delete permanently" : "Move to trash"}
                    selectedItems={selectedItems}
                    onSelectionChange={handleSelectionChange}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <NameModal
        isOpen={renameModalOpen}
        title={projectToRename?.isRoom ? "Rename room" : "Rename project"}
        initialValue={projectToRename?.name || ""}
        placeholder="Enter new name"
        onClose={() => {
          setRenameModalOpen(false);
          setProjectToRename(null);
        }}
        onConfirm={handleRenameConfirm}
      />
    </div>
  );
}
