"use client";

import { useState, useEffect, useRef } from "react";
import JSZip from "jszip";
import { NameModal } from "./NameModal";
import { IconFileText, IconFolder, IconFolderOpen, IconImage, IconLoader, IconPencil, IconDownload, IconTrash2, IconFileCode, IconFileJson, IconFileCog, IconBraces, IconPalette, IconFile } from "./Icons";
import { useContextMenu } from "@/contexts/ContextMenuContext";

function getFileIcon(path: string) {
  const name = path.split("/").pop()?.toLowerCase() ?? "";
  const ext = name.split(".").pop() ?? "";

  // Images
  if (/\.(jpg|jpeg|png|gif|webp|bmp|svg|ico)$/i.test(name)) return <IconImage />;
  // LaTeX files
  if (ext === "tex" || ext === "ltx" || ext === "latex") return <IconFileText />;
  // Typst files
  if (ext === "typ") return <IconFileText />;
  // Bibliography
  if (ext === "bib") return <IconBraces />;
  // Style/class files
  if (ext === "cls" || ext === "sty" || ext === "dtx" || ext === "ins") return <IconFileCog />;
  // Config/metadata
  if (ext === "json" || ext === "jsonc") return <IconFileJson />;
  // Code files
  if (ext === "js" || ext === "ts" || ext === "jsx" || ext === "tsx" || ext === "py" || ext === "lua") return <IconFileCode />;
  // CSS / styling
  if (ext === "css" || ext === "scss" || ext === "less") return <IconPalette />;
  // PDF
  if (ext === "pdf") return <IconFile />;
  // Markdown / text
  if (ext === "md" || ext === "txt" || ext === "rst") return <IconFileText />;
  // Default
  return <IconFile />;
}

type IdbfsFs = Awaited<ReturnType<typeof import("@wwog/idbfs").mount>>;

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

interface TreeNode {
  name: string;
  path: string;
  type: "file" | "folder";
  size?: number;
  children?: TreeNode[];
  loaded?: boolean;
}

interface FileTreeProps {
  fs: IdbfsFs | null;
  basePath?: string;
  currentPath: string;
  onFileSelect: (path: string) => void;
  refreshTrigger?: number;
  onRefresh: () => void;
  onFileDeleted?: (path: string, isFolder: boolean) => void;
  searchQuery?: string;
}

async function loadDir(fs: IdbfsFs, path: string): Promise<TreeNode[]> {
  const { dirs, files } = await fs.readdir(path);
  const nodes: TreeNode[] = [];

  // Sort directories alphabetically
  const sortedDirs = dirs.sort((a, b) => a.name.localeCompare(b.name));
  for (const d of sortedDirs) {
    const fullPath = path === "/" ? `/${d.name}` : `${path}/${d.name}`;
    nodes.push({ name: d.name, path: fullPath, type: "folder", children: [], loaded: false });
  }
  
  // Sort files alphabetically
  const sortedFiles = files.sort((a, b) => a.name.localeCompare(b.name));
  for (const f of sortedFiles) {
    const fullPath = path === "/" ? `/${f.name}` : `${path}/${f.name}`;
    const stat = await fs.stat(fullPath).catch(() => null);
    nodes.push({ name: f.name, path: fullPath, type: "file", size: stat?.size ?? 0 });
  }
  
  return nodes;
}

function TreeNodeComponent({
  node,
  fs,
  currentPath,
  onFileSelect,
  onRefresh,
  onOpenRenameModal,
  onFileDeleted,
  level,
  refreshTrigger,
}: {
  node: TreeNode;
  fs: IdbfsFs;
  currentPath: string;
  onFileSelect: (path: string) => void;
  onRefresh: () => void;
  onOpenRenameModal: (target: { name: string; path: string; type: "file" | "folder" }) => void;
  onFileDeleted?: (path: string, isFolder: boolean) => void;
  level: number;
  refreshTrigger?: number;
}) {
  const [children, setChildren] = useState<TreeNode[]>(node.children || []);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const { showContextMenu } = useContextMenu();

  const isSelected = currentPath === node.path;

  // Reload children when refreshTrigger changes (add/delete/rename) so expanded folders stay in sync
  useEffect(() => {
    if (node.type === "folder" && expanded && fs) {
      loadDir(fs, node.path).then(setChildren);
    }
  }, [refreshTrigger, node.type, node.path, expanded, fs]);

  const handleExpand = async (e?: React.MouseEvent) => {
    if (node.type === "file") {
      onFileSelect(node.path);
      return;
    }
    onFileSelect(node.path);
    if (!expanded && !node.loaded) {
      setLoading(true);
      try {
        const loaded = await loadDir(fs, node.path);
        setChildren(loaded);
        node.loaded = true;
        setExpanded(true);
      } finally {
        setLoading(false);
      }
    } else if (children.length > 0) {
      // Only allow collapse when folder has content; empty folders stay open
      setExpanded(!expanded);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    
    const menuItems = [
      {
        label: "Rename",
        icon: <IconPencil />,
        onClick: () => onOpenRenameModal({ name: node.name, path: node.path, type: node.type })
      },
      {
        label: "Download",
        icon: <IconDownload />,
        onClick: async () => {
          try {
            const { mount } = await import("@wwog/idbfs");
            const fs = await mount();
            const content = await fs.readFile(node.path);
            const blob = new Blob([content], { type: "application/octet-stream" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = node.name;
            a.click();
            URL.revokeObjectURL(url);
          } catch (e) {
            console.error("Download failed:", e);
          }
        }
      },
      {
        label: "Delete",
        icon: <IconTrash2 />,
        danger: true,
        onClick: async () => {
          if (!confirm(`Delete ${node.type} "${node.name}"?`)) return;
          try {
            const { mount } = await import("@wwog/idbfs");
            const fs = await mount();
            await fs.rm(node.path, node.type === "folder");
            onRefresh();
            onFileDeleted?.(node.path, node.type === "folder");
          } catch (e) {
            console.error("Delete failed:", e);
          }
        }
      }
    ];
    
    showContextMenu(e.clientX, e.clientY, menuItems);
  };

  if (node.type === "file") {
    return (
      <>
        <div
          className={`px-3 py-2 cursor-pointer text-sm flex items-center gap-2 min-w-0 transition-colors ${
            isSelected
              ? "bg-[color-mix(in_srgb,var(--accent)_18%,transparent)]"
              : "hover:bg-[color-mix(in_srgb,var(--border)_45%,transparent)]"
          }`}
          style={{ paddingLeft: `${level * 12 + 12}px` }}
          onClick={() => onFileSelect(node.path)}
          onContextMenu={handleContextMenu}
        >
          <span className="shrink-0 flex items-center">
            {getFileIcon(node.path)}
          </span>
          <span className="truncate min-w-0">{node.name}</span>
        </div>
      </>
    );
  }

  return (
    <div>
      <div
        className={`px-3 py-2 cursor-pointer text-sm flex items-center gap-2 min-w-0 transition-colors ${
          isSelected
            ? "bg-[color-mix(in_srgb,var(--accent)_18%,transparent)]"
            : "hover:bg-[color-mix(in_srgb,var(--border)_45%,transparent)]"
        }`}
        style={{ paddingLeft: `${level * 12 + 12}px` }}
        onClick={handleExpand}
        onContextMenu={handleContextMenu}
      >
        <span className="shrink-0 flex items-center">
          {loading ? <IconLoader /> : expanded ? <IconFolderOpen /> : <IconFolder />}
        </span>
        <span className="truncate min-w-0">{node.name}</span>
      </div>
      {expanded &&
        children.map((child) => (
          <TreeNodeComponent
            key={child.path}
            node={child}
            fs={fs}
            currentPath={currentPath}
            onFileSelect={onFileSelect}
            onRefresh={onRefresh}
            onOpenRenameModal={onOpenRenameModal}
            onFileDeleted={onFileDeleted}
            level={level + 1}
            refreshTrigger={refreshTrigger}
          />
        ))}
    </div>
  );
}

function filterNodes(nodes: TreeNode[], q: string): TreeNode[] {
  if (!q.trim()) return nodes;
  const lower = q.toLowerCase().trim();
  return nodes.filter((n) => n.name.toLowerCase().includes(lower));
}

export function FileTree({ fs, basePath = "/", currentPath, onFileSelect, onRefresh, refreshTrigger, onFileDeleted, searchQuery }: FileTreeProps) {
  const [rootNodes, setRootNodes] = useState<TreeNode[]>([]);
  const [renameModal, setRenameModal] = useState<{
    name: string;
    path: string;
    type: "file" | "folder";
  } | null>(null);

  useEffect(() => {
    if (!fs) return;
    loadDir(fs, basePath).then(setRootNodes);
  }, [fs, basePath, refreshTrigger]);

  const performRename = async (newName: string) => {
    if (!fs || !renameModal) return;
    const trimmed = newName.trim().replace(/^\//, "").replace(/\/$/, "");
    if (!trimmed || trimmed === renameModal.name) return;
    const parentPath = renameModal.path.substring(0, renameModal.path.lastIndexOf("/")) || "/";
    const newPath = parentPath === "/" ? `/${trimmed}` : `${parentPath}/${trimmed}`;
    try {
      if (renameModal.type === "file") {
        const data = await fs.readFile(renameModal.path);
        const stat = await fs.stat(renameModal.path).catch(() => null);
        const mimeType = stat?.mimeType || "application/octet-stream";
        const buf =
          data instanceof ArrayBuffer ? data : ((data as Uint8Array).buffer as ArrayBuffer);
        await fs.writeFile(newPath, buf, { mimeType });
        await fs.rm(renameModal.path);
      } else {
        await fs.mkdir(newPath);
        await copyDirRecursive(fs, renameModal.path, newPath);
        await fs.rm(renameModal.path, true);
      }
      onRefresh();
    } catch (e) {
      console.error("Rename failed:", e);
    }
    setRenameModal(null);
  };

  if (!fs) {
    return (
      <div className="p-3 text-sm text-[var(--muted)]">Loading filesystem…</div>
    );
  }

  const filteredNodes = filterNodes(rootNodes, searchQuery ?? "");

  return (
    <>
    <div className="overflow-auto flex-1 min-h-0 py-3">
      {filteredNodes.length === 0 ? (
        <div className="p-3 text-sm text-[var(--muted)]">
          {searchQuery?.trim() ? "No matching files." : "No files. Create a new file to get started."}
        </div>
        ) : (
          filteredNodes.map((node) => (
            <TreeNodeComponent
              key={node.path}
              node={node}
              fs={fs}
              currentPath={currentPath}
              onFileSelect={onFileSelect}
              onRefresh={onRefresh}
              onOpenRenameModal={(target) => setRenameModal(target)}
              onFileDeleted={onFileDeleted}
              level={0}
              refreshTrigger={refreshTrigger}
            />
          ))
        )}
      </div>
      <NameModal
        isOpen={!!renameModal}
        title={renameModal?.type === "folder" ? "Rename folder" : "Rename file"}
        initialValue={renameModal?.name ?? ""}
        placeholder="Enter new name"
        onClose={() => setRenameModal(null)}
        onConfirm={performRename}
      />
    </>
  );
}
