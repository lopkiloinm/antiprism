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
import { DashboardHeader } from "@/components/DashboardHeader";
import { ProjectList } from "@/components/ProjectList";
import { SignalingServerList } from "@/components/SignalingServerList";
import { NameModal } from "@/components/NameModal";
import { TemplateGallery } from "@/components/TemplateGallery";
import { useResponsive } from "@/hooks/useResponsive";
import { IconLayoutDashboard, IconFolder, IconFileText, IconHistory, IconCopy, IconServer, IconTrash2, IconMenu, IconX } from "@/components/Icons";

type NavItem = "all" | "projects" | "recently-opened" | "templates" | "servers" | "trash";

export default function DashboardPage() {
  const router = useRouter();
  const { isMobile } = useResponsive();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const signalingServerListRef = useRef<{ handleNewServer: () => void }>(null);
  const [activeNav, setActiveNav] = useState<NavItem>("projects");
  const [viewMode, setViewMode] = useState<"list" | "icons">("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [items, setItems] = useState<Project[]>([]);
  const [refresh, setRefresh] = useState(0);
  const [isDownloading, setIsDownloading] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Close mobile menu when nav changes
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

  // Handle fullscreen state changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (error) {
      console.error('Failed to toggle fullscreen:', error);
    }
  };

  const [renameModalOpen, setRenameModalOpen] = useState(false);
  const [projectToRename, setProjectToRename] = useState<Project | null>(null);

  const handleNewServer = () => {
    if (signalingServerListRef.current) {
      signalingServerListRef.current.handleNewServer();
    }
  };

  const handleNewProject = () => {
    const project = createProject("Untitled Project");
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
        const project = createProject(file.name.replace(/\.zip$/i, "") || "Imported Project");
        console.log("Created project:", project.id);
        
        const zip = await JSZip.loadAsync(file);
        console.log("Loaded zip, file count:", Object.keys(zip.files).length);
        
        const fs = await mount();
        console.log("Mounted filesystem");

        // Helper function to create directories recursively
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
              // Create all parent directories recursively
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

        // Mark this project as imported so ProjectPageClient won't seed templates.
        // Write *after* extraction to avoid collisions if the zip contains the same filename.
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
        const project = createProject("Imported Folder");
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

        // Mark this project as imported so ProjectPageClient won't seed templates.
        // Write *after* copying to avoid collisions if the folder contains the same filename.
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
        // Permanent delete from Trash
        deleteProject(item.id);
        await deleteProjectDataFromStorage(item.id);
      } else {
        // Soft delete: move to Trash
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
    setRefresh((r) => r + 1); // Refresh the project list
    setRenameModalOpen(false);
    setProjectToRename(null);
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[var(--background)] text-[var(--foreground)] relative">
      {/* Mobile Sidebar Overlay */}
      {isMobile && mobileMenuOpen && (
        <div 
          className="absolute inset-0 bg-black/50 z-40"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        ${isMobile ? 'absolute inset-y-0 left-0 z-50 transform transition-transform duration-300 w-56 h-full' : 'relative z-10 w-56 shrink-0'}
        ${isMobile && !mobileMenuOpen ? '-translate-x-full' : 'translate-x-0'}
      `}>
        <DashboardSidebar
          activeNav={activeNav}
          onNavChange={setActiveNav}
          isMobile={isMobile}
        />
      </div>

      <main className="flex-1 flex flex-col min-w-0 min-h-0 relative">
        <DashboardHeader
          activeNav={activeNav}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onNewProject={handleNewProject}
          onImportZip={handleImportZip}
          onImportFolder={handleImportFolder}
          onNewServer={handleNewServer}
          isFullscreen={isFullscreen}
          onToggleFullscreen={toggleFullscreen}
          selectedCount={selectedItems.length}
          onClearSelection={handleClearSelection}
          onBulkDelete={handleBulkDelete}
          onBulkDownload={handleBulkDownload}
          onBulkRestore={handleBulkRestore}
          isMobile={isMobile}
          onMenuClick={() => setMobileMenuOpen(true)}
        />
        {activeNav === "servers" ? (
          <SignalingServerList 
            ref={signalingServerListRef}
            searchQuery={searchQuery} 
            viewMode={viewMode}
            onNewServer={handleNewServer}
          />
        ) : activeNav === "templates" ? (
          <TemplateGallery viewMode={viewMode} searchQuery={searchQuery} />
        ) : (
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
        )}
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
