"use client";

import { useState, useEffect } from 'react';
import { FileTreeManager, TreeItem, SortCriteria } from '@/lib/fileTreeManager';
import { getFileIcon } from '@/components/FileTree';
import { IconFolder, IconFile, IconLoader, IconPencil, IconDownload, IconTrash2 } from './Icons';
import { useContextMenu } from '@/contexts/ContextMenuContext';
import { NameModal } from './NameModal';

interface OrderedFileTreeProps {
  fileTreeManager: FileTreeManager | null;
  onFileSelect?: (item: TreeItem) => void;
  onFileRename?: (item: TreeItem, newName: string) => void;
  onFileDelete?: (item: TreeItem) => void;
  onFolderCreate?: (name: string) => void;
  currentPath?: string;
  basePath?: string; // Add basePath to convert full paths to relative
  className?: string;
}

export function OrderedFileTree({
  fileTreeManager,
  onFileSelect,
  onFileRename,
  onFileDelete,
  onFolderCreate,
  currentPath,
  basePath,
  className = "",
}: OrderedFileTreeProps) {
  const [items, setItems] = useState<TreeItem[]>([]);
  const [sortBy, setSortBy] = useState<SortCriteria>('name-asc');
  const [isLoading, setIsLoading] = useState(true);
  const [renameModal, setRenameModal] = useState<{
    item: TreeItem;
    title: string;
  } | null>(null);
  const { showContextMenu } = useContextMenu();

  // Update items when manager changes
  useEffect(() => {
    if (!fileTreeManager) return;

    const updateItems = () => {
      const treeItems = fileTreeManager.getOrderedTreeItems();
      setItems(treeItems);
      setIsLoading(false);
    };

    // Initial load
    updateItems();

    // Listen for changes (this would need to be implemented in FileTreeManager)
    // For now, just update periodically
    const interval = setInterval(updateItems, 1000);

    return () => clearInterval(interval);
  }, [fileTreeManager]);

  // Handle sorting change
  const handleSortChange = (criteria: SortCriteria) => {
    setSortBy(criteria);
    // TODO: Implement sorting in FileTreeManager
  };

  // Handle file click
  const handleFileClick = (item: TreeItem) => {
    if (onFileSelect) {
      onFileSelect(item);
    }
  };

  // Handle context menu
  const handleContextMenu = (e: React.MouseEvent, item: TreeItem) => {
    e.preventDefault();
    
    const menuItems = [
      {
        label: "Rename",
        icon: <IconPencil />,
        onClick: () => {
          setRenameModal({
            item,
            title: `Rename ${item.isFolder ? 'folder' : 'file'}`
          });
        }
      },
      {
        label: "Download",
        icon: <IconDownload />,
        onClick: () => {
          // Trigger download via callback
          if (onFileSelect) {
            onFileSelect(item);
            // TODO: Add actual download logic
            console.log('Download:', item.path);
          }
        }
      },
      {
        label: "Delete",
        icon: <IconTrash2 />,
        danger: true,
        onClick: () => {
          if (onFileDelete) {
            if (confirm(`Delete ${item.isFolder ? 'folder' : 'file'} "${item.name}"?`)) {
              onFileDelete(item);
            }
          }
        }
      }
    ];
    
    showContextMenu(e.clientX, e.clientY, menuItems);
  };

  // Handle rename confirmation
  const handleRenameConfirm = (newName: string) => {
    if (renameModal && onFileRename) {
      onFileRename(renameModal.item, newName);
    }
    setRenameModal(null);
  };

  // Build hierarchical tree structure
  const buildTreeStructure = (flatItems: TreeItem[]): { rootItems: TreeItem[], itemMap: Map<string, TreeItem> } => {
    const itemMap = new Map<string, TreeItem>();
    const rootItems: TreeItem[] = [];

    console.log('🔍 Building tree from items:', flatItems.length);
    console.log('🔍 Items:', flatItems.map(item => ({ id: item.id, name: item.name, path: item.path, parentId: item.parentId })));

    // Create map of all items
    flatItems.forEach(item => {
      itemMap.set(item.id, item);
    });

    // Build hierarchy - find items that have no valid parent in our item list or are root
    flatItems.forEach(item => {
      const parent = itemMap.get(item.parentId);
      if (!parent || item.parentId === item.id) {
        // This is a root item (no valid parent in our current items)
        rootItems.push(item);
        console.log('🔍 Root item:', item.name, item.path);
      }
    });

    console.log('🔍 Root items found:', rootItems.length);
    console.log('🔍 Root items details:', rootItems.map(item => ({ name: item.name, path: item.path, children: item.children })));
    return { rootItems, itemMap };
  };

  // Convert full path to relative path for comparison
  const relativeCurrentPath = currentPath && basePath 
    ? currentPath.replace(basePath + '/', '') 
    : currentPath;

  // Recursive render function
  const renderTreeItems = (treeItems: TreeItem[], level: number = 0, itemMap: Map<string, TreeItem>): React.ReactNode[] => {
    return treeItems.map((item) => (
      <div key={item.id}>
        <div
          className={`px-3 py-2 cursor-pointer text-sm flex items-center gap-2 min-w-0 transition-colors ${
            item.path === relativeCurrentPath
              ? "bg-[color-mix(in_srgb,var(--accent)_18%,transparent)]"
              : "hover:bg-[color-mix(in_srgb,var(--border)_45%,transparent)]"
          }`}
          style={{ paddingLeft: `${level * 12 + 12}px` }}
          onClick={() => handleFileClick(item)}
          onContextMenu={(e) => handleContextMenu(e, item)}
        >
          <span className="shrink-0 flex items-center text-[var(--muted)]">
            {item.isFolder ? (
              <IconFolder />
            ) : (
              getFileIcon(item.path)
            )}
          </span>
          <span className="truncate min-w-0">{item.name}</span>
        </div>
        {/* Render children recursively */}
        {item.children.length > 0 && (() => {
          const childItems = item.children.map(childId => itemMap.get(childId)!).filter(Boolean);
          return renderTreeItems(childItems, level + 1, itemMap);
        })()}
      </div>
    ));
  };

  if (isLoading) {
    return (
      <div className={`flex flex-col h-full ${className}`}>
        <div className="flex-1 flex items-center justify-center">
          <IconLoader />
          <span className="ml-2 text-sm text-[var(--muted)]">Loading...</span>
        </div>
      </div>
    );
  }

  const hierarchicalData = buildTreeStructure(items);

  return (
    <>
      <div className={`h-full flex flex-col ${className}`}>
        {/* Header */}
        <div className="shrink-0 border-b border-[var(--border)] p-2 flex items-center justify-between">
          <span className="text-xs font-medium text-[var(--muted)]">Files</span>
          <select
            value={sortBy}
            onChange={(e) => handleSortChange(e.target.value as SortCriteria)}
            className="text-xs bg-[color-mix(in_srgb,var(--border)_22%,transparent)] border border-[var(--border)] rounded px-2 py-1 text-[var(--foreground)]"
          >
            <option value="name-asc">Name A-Z</option>
            <option value="name-desc">Name Z-A</option>
            <option value="modified">Last Modified</option>
            <option value="created">Last Created</option>
            <option value="type">File Type</option>
          </select>
        </div>

        {/* File Tree */}
        <div className="flex-1 overflow-auto">
          {hierarchicalData.rootItems.length === 0 ? (
            <div className="p-3 text-sm text-[var(--muted)]">
              No files. Create a new file to get started.
            </div>
          ) : (
            renderTreeItems(hierarchicalData.rootItems, 0, hierarchicalData.itemMap)
          )}
        </div>
      </div>

      {/* Rename Modal */}
      {renameModal && (
        <NameModal
          isOpen={!!renameModal}
          title={renameModal.title}
          initialValue={renameModal.item.name}
          onClose={() => setRenameModal(null)}
          onConfirm={handleRenameConfirm}
        />
      )}
    </>
  );
}

// Helper functions
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays > 7) {
    return date.toLocaleDateString();
  } else if (diffDays > 0) {
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  } else if (diffHours > 0) {
    return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  } else {
    return 'Just now';
  }
}
