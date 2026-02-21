"use client";

import Link from "next/link";
import type { Project } from "@/lib/projects";
import { IconDownload, IconRestore, IconTrash2, IconCheckSquare, IconSquare, IconPencil } from "./Icons";

interface ProjectListProps {
  items: Project[];
  viewMode: "list" | "icons";
  onDelete?: (item: Project) => void;
  onDownload?: (item: Project) => void;
  onRestore?: (item: Project) => void;
  onRename?: (item: Project, newName: string) => void;
  deleteTitle?: string;
  downloadTitle?: string;
  selectedItems: string[];
  onSelectionChange: (selectedIds: string[]) => void;
}

export function ProjectList({
  items,
  viewMode,
  onDelete,
  onDownload,
  onRestore,
  onRename,
  deleteTitle = "Move to trash",
  downloadTitle = "Download ZIP",
  selectedItems,
  onSelectionChange,
}: ProjectListProps) {
  if (items.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-[var(--muted)] text-sm">
        No projects yet. Create one with + New.
      </div>
    );
  }

  if (viewMode === "list") {
    return (
      <div className="flex-1 overflow-auto">
        <div className="divide-y divide-[var(--border)]">
          {items.map((item) => {
          const isSelected = selectedItems.includes(item.id);
          
          if (isSelected) {
            return (
              <div
                key={item.id}
                onClick={() => {
                  const next = selectedItems.filter((id) => id !== item.id);
                  onSelectionChange(next);
                }}
                className="w-full flex items-center justify-between px-4 py-3 bg-[color-mix(in_srgb,var(--accent)_8%,transparent)] hover:bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      // When item is selected, clicking checkbox should deselect it
                      const newSelection = selectedItems.filter(id => id !== item.id);
                      onSelectionChange?.(newSelection);
                    }}
                    className="p-1.5 -m-1.5 rounded hover:bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] text-[var(--accent)] transition-colors"
                  >
                    {isSelected ? <IconCheckSquare /> : <IconSquare />}
                  </button>
                  <div>
                    <div className="text-sm font-medium text-[var(--foreground)]">{item.name}</div>
                    <div className="text-xs text-[var(--muted)]">
                      {item.isRoom ? "Room" : "Project"} · {new Date(item.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {onRename && (
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onRename(item, item.name);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1.5 text-[var(--foreground)] hover:bg-[color-mix(in_srgb,var(--border)_45%,transparent)] rounded transition-opacity"
                      title="Rename"
                    >
                      <IconPencil />
                    </button>
                  )}
                  {!item.isRoom && onRestore && (
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        onRestore(item);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1.5 text-[var(--foreground)] hover:bg-[color-mix(in_srgb,var(--border)_45%,transparent)] rounded transition-opacity"
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
                      className="opacity-0 group-hover:opacity-100 p-1.5 text-[var(--foreground)] hover:bg-[color-mix(in_srgb,var(--border)_45%,transparent)] rounded transition-opacity"
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
                      className="opacity-0 group-hover:opacity-100 p-1.5 text-red-400 hover:bg-[color-mix(in_srgb,var(--border)_45%,transparent)] rounded transition-opacity"
                      title={deleteTitle}
                    >
                      <IconTrash2 />
                    </button>
                  )}
                </div>
              </div>
            );
          }
          
          return (
            <Link
              key={item.id}
              href={`/project/${item.id}`}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-[color-mix(in_srgb,var(--border)_35%,transparent)] group"
            >
              <div className="flex items-center gap-3">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    // When item is not selected, clicking checkbox should select it
                    const newSelection = [...selectedItems, item.id];
                    onSelectionChange?.(newSelection);
                  }}
                  className="p-1.5 -m-1.5 rounded hover:bg-[color-mix(in_srgb,var(--border)_35%,transparent)] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
                >
                  {selectedItems.includes(item.id) ? <IconCheckSquare /> : <IconSquare />}
                </button>
                <div>
                  <div className="text-sm font-medium text-[var(--foreground)]">{item.name}</div>
                  <div className="text-xs text-[var(--muted)]">
                    {item.isRoom ? "Room" : "Project"} · {new Date(item.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {onRename && (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onRename(item, item.name);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1.5 text-[var(--foreground)] hover:bg-[color-mix(in_srgb,var(--border)_45%,transparent)] rounded transition-opacity"
                    title="Rename"
                  >
                    <IconPencil />
                  </button>
                )}
                {!item.isRoom && onRestore && (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      onRestore(item);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1.5 text-[var(--foreground)] hover:bg-[color-mix(in_srgb,var(--border)_45%,transparent)] rounded transition-opacity"
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
                    className="opacity-0 group-hover:opacity-100 p-1.5 text-[var(--foreground)] hover:bg-[color-mix(in_srgb,var(--border)_45%,transparent)] rounded transition-opacity"
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
                    className="opacity-0 group-hover:opacity-100 p-1.5 text-red-400 hover:bg-[color-mix(in_srgb,var(--border)_45%,transparent)] rounded transition-opacity"
                    title={deleteTitle}
                  >
                    <IconTrash2 />
                  </button>
                )}
              </div>
            </Link>
          );
        })}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-4">
        {items.map((item) => {
          const isSelected = selectedItems.includes(item.id);
          
          if (isSelected) {
            return (
              <div
                key={item.id}
                onClick={() => {
                  const next = selectedItems.filter((id) => id !== item.id);
                  onSelectionChange(next);
                }}
                className="flex flex-col items-center p-4 rounded-lg border border-[color-mix(in_srgb,var(--accent)_22%,transparent)] bg-[color-mix(in_srgb,var(--accent)_8%,transparent)] hover:bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] transition-colors cursor-pointer group relative"
              >
                <div className="absolute top-2 left-2">
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      // When item is selected, clicking checkbox should deselect it
                      const newSelection = selectedItems.filter(id => id !== item.id);
                      onSelectionChange(newSelection);
                    }}
                    className="p-1.5 -m-1.5 rounded hover:bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] text-[var(--accent)] transition-colors"
                  >
                    {isSelected ? <IconCheckSquare /> : <IconSquare />}
                  </button>
                </div>
                <div className="flex flex-col items-center mt-8">
                  <span className="text-sm font-medium text-[var(--foreground)] text-center truncate w-full">
                    {item.name}
                  </span>
                  <span className="text-xs text-[var(--muted)] mt-1">
                    {new Date(item.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            );
          }
          
          return (
            <Link
              key={item.id}
              href={`/project/${item.id}`}
              className="flex flex-col items-center p-4 rounded-lg border border-[var(--border)] bg-[color-mix(in_srgb,var(--border)_18%,transparent)] hover:bg-[color-mix(in_srgb,var(--border)_30%,transparent)] transition-colors group relative"
            >
              <div className="absolute top-2 left-2">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    // When item is not selected, clicking checkbox should select it
                    const newSelection = [...selectedItems, item.id];
                    onSelectionChange(newSelection);
                  }}
                  className="p-1.5 -m-1.5 rounded hover:bg-[color-mix(in_srgb,var(--border)_35%,transparent)] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
                >
                  {selectedItems.includes(item.id) ? <IconCheckSquare /> : <IconSquare />}
                </button>
              </div>
              <div className="absolute top-2 right-2 flex items-center gap-1">
                {onRename && (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onRename(item, item.name);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded text-[var(--foreground)] hover:bg-[color-mix(in_srgb,var(--border)_45%,transparent)] transition-opacity"
                    title="Rename"
                  >
                    <IconPencil />
                  </button>
                )}
                {!item.isRoom && onRestore && (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      onRestore(item);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded text-[var(--foreground)] hover:bg-[color-mix(in_srgb,var(--border)_45%,transparent)] transition-opacity"
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
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded text-[var(--foreground)] hover:bg-[color-mix(in_srgb,var(--border)_45%,transparent)] transition-opacity"
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
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded text-red-400 hover:bg-[color-mix(in_srgb,var(--border)_45%,transparent)] transition-opacity"
                    title={deleteTitle}
                  >
                    <IconTrash2 />
                  </button>
                )}
              </div>
              <div className="flex flex-col items-center mt-8">
                <span className="text-sm font-medium text-[var(--foreground)] text-center truncate w-full">
                  {item.name}
                </span>
                <span className="text-xs text-[var(--muted)] mt-1">
                  {new Date(item.createdAt).toLocaleDateString()}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
