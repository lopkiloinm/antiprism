"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { mount } from "@wwog/idbfs";
import JSZip from "jszip";
import { useTheme } from "@/contexts/ThemeContext";
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

type NavItem = "all" | "projects" | "recently-opened" | "servers" | "trash";

export default function DashboardPage() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const signalingServerListRef = useRef<{ handleNewServer: () => void }>(null);
  const [activeNav, setActiveNav] = useState<NavItem>("projects");
  const [viewMode, setViewMode] = useState<"list" | "icons">("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [items, setItems] = useState<Project[]>([]);
  const [refresh, setRefresh] = useState(0);
  const [isDownloading, setIsDownloading] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);

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
        const project = createProject(file.name.replace(/\.zip$/i, "") || "Imported Project");
        const zip = await JSZip.loadAsync(file);
        const fs = await mount();

        const basePath = `/projects/${project.id}`;
        for (const dir of ["/projects", basePath]) {
          try {
            await fs.mkdir(dir);
          } catch {
            /* may exist */
          }
        }

        for (const [path, entry] of Object.entries(zip.files)) {
          if (entry.dir) {
            const dirPath = path.replace(/\/$/, "");
            if (dirPath) {
              try {
                await fs.mkdir(`${basePath}/${dirPath}`);
              } catch {
                // may exist
              }
            }
          } else {
            const content = await entry.async("arraybuffer");
            const cleanPath = path.replace(/^[^/]+\//, "").replace(/\/$/, "");
            if (cleanPath) {
              await fs.writeFile(`${basePath}/${cleanPath}`, content, {
                mimeType: "application/octet-stream",
              });
            }
          }
        }

        // Mark this project as imported so ProjectPageClient won't seed templates.
        // Write *after* extraction to avoid collisions if the zip contains the same filename.
        try {
          const marker = new TextEncoder().encode("imported").buffer as ArrayBuffer;
          await fs.writeFile(`${basePath}/.antiprism_imported`, marker, { mimeType: "text/plain" });
        } catch {
          // ignore (create-only + strict-mode races)
        }
        setRefresh((r) => r + 1);
        router.push(`/project/${project.id}`);
      } catch (err) {
        console.error("Import zip failed:", err);
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
    <div className="flex h-screen w-screen bg-[var(--background)] text-[var(--foreground)]">
      <DashboardSidebar activeNav={activeNav} onNavChange={setActiveNav} />
      <div className="flex-1 flex flex-col min-w-0">
        <DashboardHeader
          activeNav={activeNav}
          onNewProject={handleNewProject}
          onNewServer={handleNewServer}
          onImportZip={handleImportZip}
          onImportFolder={handleImportFolder}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedCount={selectedItems.length}
          onClearSelection={handleClearSelection}
          onBulkDelete={handleBulkDelete}
          onBulkDownload={activeNav === "trash" ? undefined : handleBulkDownload}
          onBulkRestore={activeNav === "trash" ? handleBulkRestore : undefined}
          isFullscreen={isFullscreen}
          onToggleFullscreen={toggleFullscreen}
          theme={theme}
          onThemeChange={(newTheme) => setTheme(newTheme as any)}
        />
        {activeNav === "servers" ? (
          <SignalingServerList 
            ref={signalingServerListRef}
            searchQuery={searchQuery} 
            viewMode={viewMode}
            onNewServer={handleNewServer}
          />
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
      </div>
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
