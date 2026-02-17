"use client";

import Link from "next/link";
import type { Project } from "@/lib/projects";
import { IconDownload, IconFileText, IconRestore, IconUsers, IconTrash2 } from "./Icons";

interface ProjectListProps {
  items: Project[];
  viewMode: "list" | "icons";
  onDelete?: (item: Project) => void;
  onDownload?: (item: Project) => void;
  onRestore?: (item: Project) => void;
  deleteTitle?: string;
  downloadTitle?: string;
}

export function ProjectList({
  items,
  viewMode,
  onDelete,
  onDownload,
  onRestore,
  deleteTitle = "Move to trash",
  downloadTitle = "Download ZIP",
}: ProjectListProps) {
  if (items.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-zinc-500 text-sm">
        No projects yet. Create one with + New.
      </div>
    );
  }

  if (viewMode === "list") {
    return (
      <div className="flex-1 overflow-auto">
        <div className="divide-y divide-zinc-800">
          {items.map((item) => (
            <Link
              key={item.id}
              href={`/project/${item.id}`}
              className="flex items-center justify-between px-4 py-3 hover:bg-zinc-800/50 group"
            >
              <div className="flex items-center gap-3">
                <span className="text-zinc-400">{item.isRoom ? <IconUsers /> : <IconFileText />}</span>
                <div>
                  <div className="text-sm font-medium text-zinc-200">{item.name}</div>
                  <div className="text-xs text-zinc-500">
                    {item.isRoom ? "Room" : "Project"} · {new Date(item.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {!item.isRoom && onRestore && (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      onRestore(item);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1.5 text-zinc-300 hover:bg-zinc-700 rounded transition-opacity"
                    title="Restore"
                  >
                    <IconRestore />
                  </button>
                )}
                {!item.isRoom && !onRestore && onDownload && (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      onDownload(item);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1.5 text-zinc-300 hover:bg-zinc-700 rounded transition-opacity"
                    title={downloadTitle}
                  >
                    <IconDownload />
                  </button>
                )}
                {onDelete && (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      onDelete(item);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1.5 text-red-400 hover:bg-zinc-700 rounded transition-opacity"
                    title={deleteTitle}
                  >
                    <IconTrash2 />
                  </button>
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-4">
        {items.map((item) => (
          <Link
            key={item.id}
            href={`/project/${item.id}`}
            className="flex flex-col items-center p-4 rounded-lg border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800/50 hover:border-zinc-700 transition-colors group relative"
          >
            <div className="absolute top-2 right-2 flex items-center gap-1">
              {!item.isRoom && onRestore && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    onRestore(item);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1.5 rounded text-zinc-300 hover:bg-zinc-700 transition-opacity"
                  title="Restore"
                >
                  <IconRestore />
                </button>
              )}
              {!item.isRoom && !onRestore && onDownload && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    onDownload(item);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1.5 rounded text-zinc-300 hover:bg-zinc-700 transition-opacity"
                  title={downloadTitle}
                >
                  <IconDownload />
                </button>
              )}
              {onDelete && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    onDelete(item);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1.5 rounded text-red-400 hover:bg-zinc-700 transition-opacity"
                  title={deleteTitle}
                >
                  <IconTrash2 />
                </button>
              )}
            </div>
            <span className="text-zinc-400 mb-2">{item.isRoom ? <IconUsers /> : <IconFileText />}</span>
            <span className="text-sm font-medium text-zinc-200 text-center truncate w-full">
              {item.name}
            </span>
            <span className="text-xs text-zinc-500 mt-1">
              {new Date(item.createdAt).toLocaleDateString()}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
