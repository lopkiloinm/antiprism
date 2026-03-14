"use client";

import { IconX, IconDownload, IconTrash2, IconRotateCcw } from "./Icons";

interface BulkActionBarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onBulkDownload: () => void;
  onBulkDelete: () => void;
  onBulkRestore: () => void;
  activeNav: string;
}

export function BulkActionBar({
  selectedCount,
  onClearSelection,
  onBulkDownload,
  onBulkDelete,
  onBulkRestore,
  activeNav,
}: BulkActionBarProps) {
  return (
    <div className="flex items-center bg-[color-mix(in_srgb,var(--border)_15%,transparent)] rounded-[6px] p-0.5 shrink-0 h-full animate-in fade-in slide-in-from-left-2 duration-200">
      {/* Selection Info */}
      <div className="flex items-center gap-0.5">
        <button 
          onClick={onClearSelection}
          className="h-[26px] w-[26px] rounded-[4px] text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[color-mix(in_srgb,var(--border)_25%,transparent)] transition-colors flex items-center justify-center [&>svg]:w-3.5 [&>svg]:h-3.5 shrink-0"
          title="Clear selection"
        >
          <IconX />
        </button>
        <span className="text-xs font-medium text-[var(--foreground)]">
          {selectedCount} selected
        </span>
      </div>

      {/* Divider */}
      <div className="w-px h-3.5 bg-[color-mix(in_srgb,var(--border)_50%,transparent)] mx-0.5" />

      {/* Action Buttons */}
      <div className="flex items-center gap-0.5">
        {activeNav !== "trash" && (
          <button
            onClick={onBulkDownload}
            className="flex items-center gap-1.5 h-[26px] px-2 rounded-[4px] text-xs font-medium text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[color-mix(in_srgb,var(--border)_25%,transparent)] transition-colors [&>svg]:w-3.5 [&>svg]:h-3.5"
          >
            <IconDownload />
            <span className="hidden sm:inline">Download</span>
          </button>
        )}
        {activeNav === "trash" && (
          <button
            onClick={onBulkRestore}
            className="flex items-center gap-1.5 h-[26px] px-2 rounded-[4px] text-xs font-medium text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[color-mix(in_srgb,var(--border)_25%,transparent)] transition-colors [&>svg]:w-3.5 [&>svg]:h-3.5"
          >
            <IconRotateCcw />
            <span className="hidden sm:inline">Restore</span>
          </button>
        )}
        <button
          onClick={onBulkDelete}
          className="flex items-center gap-1.5 h-[26px] px-2 rounded-[4px] text-xs font-medium text-red-400/80 hover:text-red-400 hover:bg-red-500/10 transition-colors [&>svg]:w-3.5 [&>svg]:h-3.5"
        >
          <IconTrash2 />
          <span className="hidden sm:inline">Delete</span>
        </button>
      </div>
    </div>
  );
}
