"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { mount } from "@wwog/idbfs";
import JSZip from "jszip";
import {
  getProjects,
  getRooms,
  getAllItems,
  createProject,
  deleteProject,
  deleteRoom,
  deleteProjectDataFromStorage,
} from "@/lib/projects";
import type { Project } from "@/lib/projects";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { DashboardHeader } from "@/components/DashboardHeader";
import { ProjectList } from "@/components/ProjectList";

type NavItem = "all" | "projects" | "rooms";

export default function DashboardPage() {
  const router = useRouter();
  const [activeNav, setActiveNav] = useState<NavItem>("projects");
  const [viewMode, setViewMode] = useState<"list" | "icons">("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [items, setItems] = useState<Project[]>([]);
  const [refresh, setRefresh] = useState(0);

  const loadItems = useCallback(() => {
    let list: Project[];
    if (activeNav === "all") list = getAllItems();
    else if (activeNav === "projects") list = getProjects();
    else list = getRooms();

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(q));
    }
    setItems(list);
  }, [activeNav, searchQuery]);

  useEffect(() => {
    loadItems();
  }, [loadItems, refresh]);

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
      deleteProject(item.id);
    }
    await deleteProjectDataFromStorage(item.id);
    setRefresh((r) => r + 1);
  };

  return (
    <div className="flex h-screen w-screen bg-zinc-950">
      <DashboardSidebar activeNav={activeNav} onNavChange={setActiveNav} />
      <div className="flex-1 flex flex-col min-w-0">
        <DashboardHeader
          activeNav={activeNav}
          onNewProject={handleNewProject}
          onImportZip={handleImportZip}
          onImportFolder={handleImportFolder}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />
        <ProjectList
          items={items}
          viewMode={viewMode}
          onDelete={handleDelete}
        />
      </div>
    </div>
  );
}
