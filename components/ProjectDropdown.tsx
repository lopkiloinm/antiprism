"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import JSZip from "jszip";
import { mount } from "@wwog/idbfs";
import {
  createProject,
  trashProject,
  deleteRoom,
  deleteProjectDataFromStorage,
  renameProject,
  renameRoom,
} from "@/lib/projects";
import { NameModal } from "./NameModal";
import { IconPencil, IconTrash2, IconCopy, IconFileArchive } from "./Icons";

type IdbfsFs = Awaited<ReturnType<typeof mount>>;

async function copyDirRecursive(
  fs: IdbfsFs,
  srcPath: string,
  destPath: string
): Promise<void> {
  const { dirs, files } = await fs.readdir(srcPath);
  for (const d of dirs) {
    const srcChild = srcPath === "/" ? `/${d.name}` : `${srcPath}/${d.name}`;
    const destChild = destPath === "/" ? `/${d.name}` : `${destPath}/${d.name}`;
    await fs.mkdir(destChild);
    await copyDirRecursive(fs, srcChild, destChild);
  }
  for (const f of files) {
    const srcFile = srcPath === "/" ? `/${f.name}` : `${srcPath}/${f.name}`;
    const destFile = destPath === "/" ? `/${f.name}` : `${destPath}/${f.name}`;
    const data = await fs.readFile(srcFile);
    const stat = await fs.stat(srcFile).catch(() => null);
    const buf = data instanceof ArrayBuffer ? data : ((data as Uint8Array).buffer as ArrayBuffer);
    await fs.writeFile(destFile, buf, { mimeType: stat?.mimeType || "application/octet-stream" });
  }
}

async function zipFolderRecursive(
  fs: IdbfsFs,
  path: string,
  zip: JSZip,
  prefix: string
): Promise<void> {
  const { dirs, files } = await fs.readdir(path);
  for (const d of dirs) {
    const fullPath = path === "/" ? `/${d.name}` : `${path}/${d.name}`;
    const childPrefix = prefix ? `${prefix}/${d.name}` : d.name;
    await zipFolderRecursive(fs, fullPath, zip, childPrefix);
  }
  for (const f of files) {
    const fullPath = path === "/" ? `/${f.name}` : `${path}/${f.name}`;
    const data = await fs.readFile(fullPath);
    const buf = data instanceof ArrayBuffer ? new Uint8Array(data) : data;
    const zipPath = prefix ? `${prefix}/${f.name}` : f.name;
    zip.file(zipPath, buf);
  }
}

interface ProjectDropdownProps {
  projectId: string;
  projectName: string;
  isRoom?: boolean;
  fs: IdbfsFs | null;
  onRename: (name: string) => void;
  children: React.ReactNode;
}

export function ProjectDropdown({
  projectId,
  projectName,
  isRoom = false,
  fs,
  onRename,
  children,
}: ProjectDropdownProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"rename" | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleRename = (name: string) => {
    if (isRoom) renameRoom(projectId, name);
    else renameProject(projectId, name);
    onRename(name);
    setModalMode(null);
  };

  const handleDelete = async () => {
    if (!confirm(`Move "${projectName}" to trash?`)) return;
    setOpen(false);
    if (isRoom) {
      // Rooms are not trashable (for now): delete immediately.
      deleteRoom(projectId);
      await deleteProjectDataFromStorage(projectId);
    } else {
      trashProject(projectId);
    }
    router.push("/");
  };

  const handleDuplicate = async () => {
    setOpen(false);
    const newProject = createProject(`${projectName} (copy)`);
    if (!fs) {
      router.push(`/project/${newProject.id}`);
      return;
    }
    try {
      const srcPath = `/projects/${projectId}`;
      const destPath = `/projects/${newProject.id}`;
      const exists = await fs.exists(srcPath).catch(() => false);
      if (exists) {
        await fs.mkdir(destPath);
        await copyDirRecursive(fs, srcPath, destPath);
      }
    } catch (e) {
      console.warn("Duplicate: failed to copy files", e);
    }
    router.push(`/project/${newProject.id}`);
  };

  const handleExport = async () => {
    setOpen(false);
    if (!fs) return;
    try {
      const srcPath = `/projects/${projectId}`;
      const exists = await fs.exists(srcPath).catch(() => false);
      if (!exists) return;
      const zip = new JSZip();
      await zipFolderRecursive(fs, srcPath, zip, "");
      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${projectName.replace(/[^\w\s-]/g, "")}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Export failed:", e);
    }
  };

  return (
    <div className="relative flex-1 min-w-0 flex items-center" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex-1 min-w-0 text-left truncate font-semibold text-xs hover:bg-[color-mix(in_srgb,var(--border)_35%,transparent)] rounded px-1 py-0.5 -mx-1 transition-colors"
      >
        {children}
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 min-w-[160px] rounded border border-[var(--border)] bg-[var(--background)] shadow-xl py-2">
          <button
            onClick={() => {
              setModalMode("rename");
              setOpen(false);
            }}
            className="w-full px-3 py-2 text-left text-sm text-[var(--foreground)] hover:bg-[color-mix(in_srgb,var(--border)_45%,transparent)] flex items-center gap-2"
          >
            <IconPencil />
            Rename
          </button>
          <button
            onClick={() => handleDelete()}
            className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-[color-mix(in_srgb,var(--border)_45%,transparent)] hover:text-red-300 flex items-center gap-2"
          >
            <IconTrash2 />
            Move to trash
          </button>
          <button
            onClick={handleDuplicate}
            className="w-full px-3 py-2 text-left text-sm text-[var(--foreground)] hover:bg-[color-mix(in_srgb,var(--border)_45%,transparent)] flex items-center gap-2"
          >
            <IconCopy />
            Duplicate
          </button>
          <button
            onClick={handleExport}
            className="w-full px-3 py-2 text-left text-sm text-[var(--foreground)] hover:bg-[color-mix(in_srgb,var(--border)_45%,transparent)] flex items-center gap-2"
          >
            <IconFileArchive />
            Export (zip)
          </button>
        </div>
      )}
      <NameModal
        isOpen={modalMode === "rename"}
        title="Rename project"
        initialValue={projectName}
        placeholder="Project name"
        submitLabel="Rename"
        onClose={() => setModalMode(null)}
        onConfirm={handleRename}
      />
    </div>
  );
}
