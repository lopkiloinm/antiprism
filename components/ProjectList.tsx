"use client";

import Link from "next/link";
import type { Project } from "@/lib/projects";
import { IconDownload, IconRestore, IconTrash2, IconCheckSquare, IconSquare, IconPencil, IconFolder, IconFile } from "./Icons";
import { DashboardView, DashboardItemProps } from "./DashboardView";

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
  const dashboardItems: DashboardItemProps[] = items.map((item) => {
    const isSelected = selectedItems.includes(item.id);
    
    const handleToggleSelect = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (isSelected) {
        onSelectionChange(selectedItems.filter(id => id !== item.id));
      } else {
        onSelectionChange([...selectedItems, item.id]);
      }
    };

    const rightAccessories = (
      <>
        {onRename && (
          <div
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onRename(item, item.name);
            }}
            className="opacity-0 group-hover:opacity-100 p-1.5 text-[var(--foreground)] hover:bg-[color-mix(in_srgb,var(--border)_45%,transparent)] rounded transition-opacity cursor-pointer"
            title="Rename"
          >
            <IconPencil />
          </div>
        )}
        {!item.isRoom && onRestore && (
          <div
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onRestore(item);
            }}
            className="opacity-0 group-hover:opacity-100 p-1.5 text-[var(--foreground)] hover:bg-[color-mix(in_srgb,var(--border)_45%,transparent)] rounded transition-opacity cursor-pointer"
            title="Restore"
          >
            <IconRestore />
          </div>
        )}
        {!item.isRoom && !onRestore && onDownload && (
          <div
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDownload(item);
            }}
            className="opacity-0 group-hover:opacity-100 p-1.5 text-[var(--foreground)] hover:bg-[color-mix(in_srgb,var(--border)_45%,transparent)] rounded transition-opacity cursor-pointer"
            title={downloadTitle}
          >
            <IconDownload />
          </div>
        )}
        {onDelete && (
          <div
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDelete(item);
            }}
            className="opacity-0 group-hover:opacity-100 p-1.5 text-red-400 hover:bg-[color-mix(in_srgb,var(--border)_45%,transparent)] rounded transition-opacity cursor-pointer"
            title={deleteTitle}
          >
            <IconTrash2 />
          </div>
        )}
      </>
    );

    return {
      id: item.id,
      title: item.name,
      subtitle: `${item.isRoom ? "Room" : "Project"} · ${new Date(item.createdAt).toLocaleDateString()}`,
      icon: item.isRoom ? <IconFolder /> : <IconFile />,
      href: isSelected ? undefined : `/project/${item.id}`,
      onClick: isSelected ? () => onSelectionChange(selectedItems.filter((id) => id !== item.id)) : undefined,
      isActive: isSelected,
      leftAccessory: (
        <div
          onClick={handleToggleSelect}
          className={`p-1.5 -m-1.5 rounded transition-colors cursor-pointer ${
            isSelected 
              ? "hover:bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] text-[var(--accent)]" 
              : "hover:bg-[color-mix(in_srgb,var(--border)_35%,transparent)] text-[var(--muted)] hover:text-[var(--foreground)]"
          }`}
        >
          {isSelected ? <IconCheckSquare /> : <IconSquare />}
        </div>
      ),
      topRightAccessory: rightAccessories,
    };
  });

  return (
    <DashboardView 
      items={dashboardItems} 
      viewMode={viewMode} 
      emptyContent="No projects yet. Create one with + New."
    />
  );
}
