"use client";

import { useState, useEffect, useRef } from "react";
import JSZip from "jszip";
import { NameModal } from "./NameModal";

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
}

async function loadDir(fs: IdbfsFs, path: string): Promise<TreeNode[]> {
  const { dirs, files } = await fs.readdir(path);
  const nodes: TreeNode[] = [];

  for (const d of dirs) {
    const fullPath = path === "/" ? `/${d.name}` : `${path}/${d.name}`;
    nodes.push({ name: d.name, path: fullPath, type: "folder", children: [], loaded: false });
  }
  for (const f of files) {
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
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);

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
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    if (contextMenu) {
      document.addEventListener("click", handleClick);
      return () => document.removeEventListener("click", handleClick);
    }
  }, [contextMenu]);

  const handleRename = () => {
    setContextMenu(null);
    onOpenRenameModal({ name: node.name, path: node.path, type: "file" });
  };

  const handleDownload = async () => {
    try {
      const data = await fs.readFile(node.path);
      const blob = data instanceof ArrayBuffer ? new Blob([data]) : new Blob([data]);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = node.name;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Download failed:", e);
    }
    setContextMenu(null);
  };

  const handleDelete = async () => {
    try {
      await fs.rm(node.path);
      onFileDeleted?.(node.path, false);
      onRefresh();
    } catch (e) {
      console.error("Delete failed:", e);
    }
    setContextMenu(null);
  };

  const handleRenameFolder = () => {
    setContextMenu(null);
    onOpenRenameModal({ name: node.name, path: node.path, type: "folder" });
  };

  const handleDownloadFolder = async () => {
    setContextMenu(null);
    try {
      const zip = new JSZip();
      await zipFolderRecursive(fs, node.path, zip, node.name);
      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${node.name}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Download folder failed:", e);
    }
  };

  const handleDeleteFolder = async () => {
    setContextMenu(null);
    if (!confirm(`Delete folder "${node.name}" and all its contents?`)) return;
    try {
      await fs.rm(node.path, true);
      onFileDeleted?.(node.path, true);
      onRefresh();
    } catch (e) {
      console.error("Delete folder failed:", e);
    }
  };

  if (node.type === "file") {
    return (
      <>
        <div
          className={`px-3 py-2 cursor-pointer text-sm hover:bg-zinc-800 ${isSelected ? "bg-zinc-700" : ""}`}
          style={{ paddingLeft: `${level * 12 + 12}px` }}
          onClick={() => onFileSelect(node.path)}
          onContextMenu={handleContextMenu}
        >
          📄 {node.name}
        </div>
        {contextMenu && (
          <div
            ref={contextMenuRef}
            className="fixed z-50 w-[180px] rounded border border-zinc-700 bg-zinc-900 shadow-xl py-2"
            style={{ left: contextMenu.x, top: contextMenu.y }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={handleRename}
              className="w-full px-3 py-2 text-left text-sm text-zinc-200 hover:bg-zinc-800"
            >
              Rename file
            </button>
            <button
              onClick={handleDownload}
              className="w-full px-3 py-2 text-left text-sm text-zinc-200 hover:bg-zinc-800"
            >
              Download file
            </button>
            <button
              onClick={handleDelete}
              className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-zinc-800"
            >
              Delete file
            </button>
          </div>
        )}
      </>
    );
  }

  return (
    <div>
      <div
        className={`px-3 py-2 cursor-pointer text-sm hover:bg-zinc-800 flex items-center gap-1 ${isSelected ? "bg-zinc-700" : ""}`}
        style={{ paddingLeft: `${level * 12 + 12}px` }}
        onClick={handleExpand}
        onContextMenu={handleContextMenu}
      >
        <span className="w-4">{loading ? "⏳" : expanded ? "📂" : "📁"}</span>
        {node.name}
      </div>
      {contextMenu && (
        <div
          ref={contextMenuRef}
          className="fixed z-50 w-[180px] rounded border border-zinc-700 bg-zinc-900 shadow-xl py-2"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={handleRenameFolder}
            className="w-full px-3 py-2 text-left text-sm text-zinc-200 hover:bg-zinc-800"
          >
            Rename folder
          </button>
          <button
            onClick={handleDownloadFolder}
            className="w-full px-3 py-2 text-left text-sm text-zinc-200 hover:bg-zinc-800"
          >
            Download folder
          </button>
          <button
            onClick={handleDeleteFolder}
            className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-zinc-800"
          >
            Delete folder
          </button>
        </div>
      )}
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

export function FileTree({ fs, basePath = "/", currentPath, onFileSelect, onRefresh, refreshTrigger, onFileDeleted }: FileTreeProps) {
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
      <div className="p-3 text-sm text-zinc-500">Loading filesystem…</div>
    );
  }

  return (
    <>
    <div className="overflow-auto flex-1 min-h-0 py-3">
      {rootNodes.length === 0 ? (
        <div className="p-3 text-sm text-zinc-500">No files. Create a new file to get started.</div>
        ) : (
          rootNodes.map((node) => (
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
