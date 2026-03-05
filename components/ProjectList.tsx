"use client";

import Link from "next/link";
import type { Project } from "@/lib/projects";
import { IconDownload, IconRestore, IconTrash2, IconPencil, IconFolder, IconFile } from "./Icons";
import { DashboardView, DashboardItemProps } from "./DashboardView";
import { useResponsive } from "@/hooks/useResponsive";

interface ProjectListProps {
  items: Project[];
  viewMode: "list" | "icons";
  onDelete?: (item: Project) => void;
  onDownload?: (item: Project) => void;
  onRestore?: (item: Project) => void;
  onRename?: (item: Project, newName: string) => void;
  deleteTitle?: string;
  downloadTitle?: string;
  restoreTitle?: string;
  selectedItems?: string[];
  onSelectionChange?: (selectedIds: string[]) => void;
}

export function ProjectList({
  items,
  viewMode,
  onDelete,
  onDownload,
  onRestore,
  onRename,
  deleteTitle = "Move to trash",
  downloadTitle = "Download",
  restoreTitle = "Restore",
  selectedItems = [],
  onSelectionChange,
}: ProjectListProps) {
  const { isMobile } = useResponsive();
  
  const dashboardItems: DashboardItemProps[] = items.map((item) => {
    const isSelected = selectedItems?.includes(item.id) || false;
    
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
            className={`${isMobile ? "opacity-100" : "opacity-0 group-hover:opacity-100"} p-1.5 text-[var(--foreground)] hover:bg-[color-mix(in_srgb,var(--border)_45%,transparent)] rounded transition-opacity cursor-pointer`}
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
            className={`${isMobile ? "opacity-100" : "opacity-0 group-hover:opacity-100"} p-1.5 text-[var(--foreground)] hover:bg-[color-mix(in_srgb,var(--border)_45%,transparent)] rounded transition-opacity cursor-pointer`}
            title="Restore"
          >
            <IconRestore />
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
            className={`${isMobile ? "opacity-100" : "opacity-0 group-hover:opacity-100"} p-1.5 text-red-300 hover:bg-red-500/10 rounded transition-opacity cursor-pointer`}
            title={deleteTitle}
          >
            <IconTrash2 />
          </div>
        )}
        {!item.isRoom && onDownload && (
          <div
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDownload(item);
            }}
            className={`${isMobile ? "opacity-100" : "opacity-0 group-hover:opacity-100"} p-1.5 text-[var(--foreground)] hover:bg-[color-mix(in_srgb,var(--border)_45%,transparent)] rounded transition-opacity cursor-pointer`}
            title={downloadTitle}
          >
            <IconDownload />
          </div>
        )}
      </>
    );

    return {
      id: item.id,
      title: item.name,
      subtitle: item.isRoom ? "Room" : `Modified ${new Date(item.createdAt).toLocaleDateString()}`,
      icon: item.isRoom ? <IconFolder /> : <IconFile />,
      href: `/project/${item.id}`,
      leftAccessory: onSelectionChange ? (
        <button
          type="button"
          role="switch"
          aria-checked={isSelected}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            // Don't navigate when clicking the toggle
            if (onSelectionChange) {
              const isSelected = selectedItems?.includes(item.id) || false;
              if (isSelected) {
                onSelectionChange(selectedItems.filter(id => id !== item.id));
              } else {
                onSelectionChange([...selectedItems, item.id]);
              }
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              e.stopPropagation();
              if (onSelectionChange) {
                const isSelected = selectedItems?.includes(item.id) || false;
                if (isSelected) {
                  onSelectionChange(selectedItems.filter(id => id !== item.id));
                } else {
                  onSelectionChange([...selectedItems, item.id]);
                }
              }
            }
          }}
          className={`relative w-10 h-6 rounded-full transition-colors shrink-0 ${
            isSelected
              ? "bg-[color-mix(in_srgb,var(--accent)_60%,transparent)]"
              : "bg-[color-mix(in_srgb,var(--border)_70%,transparent)]"
          }`}
          title={isSelected ? "Deselect" : "Select"}
        >
          <span
            className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${
              isSelected ? "left-[22px]" : "left-1"
            }`}
          />
        </button>
      ) : undefined,
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
