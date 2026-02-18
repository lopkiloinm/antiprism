"use client";

import { useState, useRef, useEffect } from "react";
import { NameModal } from "./NameModal";
import { IconPlus, IconFilePlus, IconFolderPlus, IconUpload } from "./Icons";

type IdbfsFs = Awaited<ReturnType<typeof import("@wwog/idbfs").mount>>;

interface FileActionsProps {
  fs: IdbfsFs | null;
  basePath?: string;
  onAction: () => void;
}

export function FileActions({ fs, basePath = "/", onAction }: FileActionsProps) {
  const [open, setOpen] = useState(false);
  const [addModalType, setAddModalType] = useState<"file" | "folder" | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dirInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
      setOpen(false);
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
      setOpen(false);
      onAction();
    })();
  };

  if (!fs) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className="w-7 h-7 rounded bg-[color-mix(in_srgb,var(--border)_22%,transparent)] hover:bg-[color-mix(in_srgb,var(--border)_45%,transparent)] text-[var(--foreground)] flex items-center justify-center"
        title="Add"
      >
        <IconPlus />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-2 z-50 min-w-[180px] rounded border border-[var(--border)] bg-[var(--background)] shadow-xl py-2">
          <button
            onClick={() => {
              setAddModalType("file");
              setOpen(false);
            }}
            className="w-full px-3 py-2 text-left text-sm text-[var(--foreground)] hover:bg-[color-mix(in_srgb,var(--border)_45%,transparent)] flex items-center gap-2"
          >
            <IconFilePlus />
            Add File
          </button>
          <button
            onClick={() => {
              setAddModalType("folder");
              setOpen(false);
            }}
            className="w-full px-3 py-2 text-left text-sm text-[var(--foreground)] hover:bg-[color-mix(in_srgb,var(--border)_45%,transparent)] flex items-center gap-2"
          >
            <IconFolderPlus />
            Add Folder
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full px-3 py-2 text-left text-sm text-[var(--foreground)] hover:bg-[color-mix(in_srgb,var(--border)_45%,transparent)] flex items-center gap-2"
          >
            <IconUpload />
            Upload File
          </button>
          <button
            onClick={() => dirInputRef.current?.click()}
            className="w-full px-3 py-2 text-left text-sm text-[var(--foreground)] hover:bg-[color-mix(in_srgb,var(--border)_45%,transparent)] flex items-center gap-2"
          >
            <IconUpload />
            Upload Directory
          </button>
        </div>
      )}
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
    </div>
  );
}
