"use client";

import { useState, useRef, useEffect } from "react";
import { NameModal } from "./NameModal";
import { IconPlus, IconFilePlus, IconFolderPlus, IconUpload } from "./Icons";

type IdbfsFs = Awaited<ReturnType<typeof import("@wwog/idbfs").mount>>;

interface FileActionsProps {
  fs: IdbfsFs | null;
  basePath?: string;
  onAction: () => void;
  expanded?: boolean;
  onToggle?: () => void;
}

export function FileActions({ fs, basePath = "/", onAction, expanded = false }: FileActionsProps) {
  const [addModalType, setAddModalType] = useState<"file" | "folder" | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dirInputRef = useRef<HTMLInputElement>(null);

  const handleAddFile = async (name: string) => {
    if (!fs) return;
    const path = basePath === "/" ? `/${name}` : `${basePath}/${name}`;
    try {
      await fs.createFile(path, { mimeType: "text/plain" });
      setAddModalType(null);
      onAction();
    } catch (e) {
      console.error("Add file failed:", e);
    }
  };

  const handleAddFolder = async (name: string) => {
    if (!fs) return;
    const path = basePath === "/" ? `/${name}` : `${basePath}/${name}`;
    try {
      await fs.mkdir(path);
      setAddModalType(null);
      onAction();
    } catch (e) {
      console.error("Add folder failed:", e);
    }
  };

  const handleUploadFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !fs) return;
    (async () => {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const path = basePath === "/" ? `/${file.name}` : `${basePath}/${file.name}`;
        try {
          const buf = await file.arrayBuffer();
          await fs.writeFile(path, buf, { mimeType: file.type || "application/octet-stream" });
        } catch (err) {
          console.error("Upload failed:", err);
        }
      }
      e.target.value = "";
      onAction();
    })();
  };

  const handleUploadDir = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !fs) return;
    (async () => {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const webPath = (file as File & { webkitRelativePath?: string }).webkitRelativePath;
        const path = basePath === "/" ? "/" + (webPath || file.name) : basePath + "/" + (webPath || file.name);
        try {
          const buf = await file.arrayBuffer();
          const dir = path.substring(0, path.lastIndexOf("/"));
          if (dir && dir !== "/") {
            const parts = dir.split("/").filter(Boolean);
            let current = "";
            for (const p of parts) {
              current += "/" + p;
              try {
                await fs.mkdir(current);
              } catch {
                // Dir may exist
              }
            }
          }
          await fs.writeFile(path, buf, { mimeType: file.type || "application/octet-stream" });
        } catch (err) {
          console.error("Upload failed:", err);
        }
      }
      e.target.value = "";
      onAction();
    })();
  };

  if (!fs || !expanded) return null;

  return (
    <>
      <div className="space-y-1">
        <button
          onClick={() => setAddModalType("file")}
          className="w-full px-2 py-1.5 text-xs text-left text-[var(--foreground)] hover:bg-[color-mix(in_srgb,var(--border)_45%,transparent)] flex items-center gap-2 rounded"
        >
          <IconFilePlus />
          Add File
        </button>
        <button
          onClick={() => setAddModalType("folder")}
          className="w-full px-2 py-1.5 text-xs text-left text-[var(--foreground)] hover:bg-[color-mix(in_srgb,var(--border)_45%,transparent)] flex items-center gap-2 rounded"
        >
          <IconFolderPlus />
          Add Folder
        </button>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-full px-2 py-1.5 text-xs text-left text-[var(--foreground)] hover:bg-[color-mix(in_srgb,var(--border)_45%,transparent)] flex items-center gap-2 rounded"
        >
          <IconUpload />
          Upload File
        </button>
        <button
          onClick={() => dirInputRef.current?.click()}
          className="w-full px-2 py-1.5 text-xs text-left text-[var(--foreground)] hover:bg-[color-mix(in_srgb,var(--border)_45%,transparent)] flex items-center gap-2 rounded"
        >
          <IconUpload />
          Upload Directory
        </button>
      </div>
      <NameModal
        isOpen={addModalType === "file"}
        title="New file"
        initialValue=""
        placeholder="filename.txt"
        submitLabel="Create"
        onClose={() => setAddModalType(null)}
        onConfirm={handleAddFile}
      />
      <NameModal
        isOpen={addModalType === "folder"}
        title="New folder"
        initialValue=""
        placeholder="folder-name"
        submitLabel="Create"
        onClose={() => setAddModalType(null)}
        onConfirm={handleAddFolder}
      />
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleUploadFile}
      />
      <input
        ref={dirInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleUploadDir}
        {...({ webkitdirectory: "" } as React.InputHTMLAttributes<HTMLInputElement>)}
      />
    </>
  );
}
