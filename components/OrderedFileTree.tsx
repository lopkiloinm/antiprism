"use client";

import { useState, useEffect, useRef } from 'react';
import { FileTreeManager, TreeItem, SortCriteria } from '@/lib/fileTreeManager';
import { getFileIcon } from '@/components/FileTree';
import { IconFolder, IconFile, IconLoader, IconPencil, IconDownload, IconTrash2, IconSearch, IconChevronDown } from './Icons';
import { useContextMenu } from '@/contexts/ContextMenuContext';
import { NameModal } from './NameModal';

interface OrderedFileTreeProps {
  fileTreeManager: FileTreeManager | null;
  currentPath: string;
  basePath: string;
  searchQuery?: string;
  onFileSelect?: (path: string) => void;
  onFileRename?: (item: TreeItem, newName: string) => void;
  onFileDelete?: (item: TreeItem) => void;
  onFileDownload?: (item: TreeItem) => void;
  onFolderCreate?: (path: string) => void;
  className?: string;
  refreshTrigger?: number;
  onFindFile?: () => void;
}

export function OrderedFileTree({
  fileTreeManager,
  onFileSelect,
  onFileRename,
  onFileDelete,
  onFindFile,
  currentPath = "",
  basePath = "",
  className = "",
  refreshTrigger = 0
}: OrderedFileTreeProps) {
  const [items, setItems] = useState<TreeItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortCriteria>("name-asc");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [renameModal, setRenameModal] = useState<{
    item: TreeItem;
    title: string;
  } | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { showContextMenu } = useContextMenu();

  // Update items when manager changes or refreshTrigger fires
  useEffect(() => {
    if (!fileTreeManager) return;

    const updateItems = () => {
      const treeItems = fileTreeManager.getTreeItems();
      setItems(treeItems);
      setIsLoading(false);
      console.log('🌳 Updated items from FileTreeManager:', treeItems.length, 'items');
    };

    // Initial load
    updateItems();

    // Listen for changes (this would need to be implemented in FileTreeManager)
    // For now, just update periodically
    const interval = setInterval(updateItems, 1000);

    return () => clearInterval(interval);
  }, [fileTreeManager, refreshTrigger]); // ✅ Add refreshTrigger dependency

  // Handle sorting change
  const handleSortChange = (criteria: SortCriteria) => {
    setSortBy(criteria);
    setIsDropdownOpen(false);
    
    // Apply sorting using FileTreeManager
    if (fileTreeManager) {
      fileTreeManager.sortTreeItems(criteria);
      
      // Trigger re-render by getting updated items
      const updatedItems = fileTreeManager.getTreeItems();
      setItems(updatedItems);
      
      console.log('🔄 Applied sorting:', criteria);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
            onFileSelect(item.path);
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

  // Handle file/folder click
  const handleFileClick = (item: TreeItem) => {
    if (item.isFolder) {
      // Toggle folder expansion
      setExpandedFolders(prev => {
        const newSet = new Set(prev);
        if (newSet.has(item.path)) {
          newSet.delete(item.path);
        } else {
          newSet.add(item.path);
        }
        return newSet;
      });
    }
    
    if (onFileSelect) {
      onFileSelect(item.path);
    }
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
    return treeItems.map((item) => {
      const isExpanded = item.isFolder ? expandedFolders.has(item.path) : false;
      const isActive = item.path === relativeCurrentPath;
      const hasChildren = item.children.length > 0;
      
      return (
        <div key={item.id}>
          <div
            className={`group relative px-3 py-2 cursor-pointer text-sm flex items-center gap-2 min-w-0 transition-colors ${
              isActive
                ? "bg-[color-mix(in_srgb,var(--accent)_18%,transparent)]"
                : "hover:bg-[color-mix(in_srgb,var(--border)_45%,transparent)]"
            }`}
            style={{ paddingLeft: `${level * 12 + 12}px` }}
            onClick={() => handleFileClick(item)}
            onContextMenu={(e) => handleContextMenu(e, item)}
          >
            {/* Left accent indicator with 4-level system */}
            <div className={`absolute left-0 top-1/2 -translate-y-1/2 bg-[var(--accent)] rounded-r transition-all ${
              isActive 
                ? 'h-4 w-0.5 group-hover:h-5 group-hover:w-1' // Level 2: Active, Level 3: Active + hover
                : 'h-2 w-0.5 opacity-0 group-hover:opacity-100' // Level 1: Hover only
            }`} />
            
            {/* Folder/File icon */}
            <span className="shrink-0 flex items-center">
              {item.isFolder ? (
                <IconFolder />
              ) : (
                getFileIcon(item.path)
              )}
            </span>
            
            {/* Name */}
            <span className="truncate min-w-0">{item.name}</span>
            
            {/* Expand/Collapse indicator for folders */}
            {item.isFolder && hasChildren && (
              <span className={`shrink-0 ml-auto text-[var(--muted)] transition-transform ${
                isExpanded ? 'rotate-90' : ''
              }`}>
                <IconChevronDown />
              </span>
            )}
          </div>
          
          {/* Render children recursively if folder is expanded */}
          {item.isFolder && isExpanded && hasChildren && (() => {
            const childItems = item.children.map(childId => itemMap.get(childId)!).filter(Boolean);
            return renderTreeItems(childItems, level + 1, itemMap);
          })()}
        </div>
      );
    });
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
        <div className="shrink-0 border-b border-[var(--border)] p-2 flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-[var(--muted)]">Files</span>
          <div className="flex items-center gap-2">
            {/* Find button */}
            {onFindFile && (
              <button
                onClick={onFindFile}
                className="w-7 h-7 rounded flex items-center justify-center bg-[color-mix(in_srgb,var(--border)_22%,transparent)] hover:bg-[color-mix(in_srgb,var(--border)_45%,transparent)] text-[var(--foreground)] transition-colors"
                title="Find a file"
              >
                <IconSearch />
              </button>
            )}
            
            {/* Custom sort dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-1 px-2 py-1 text-xs bg-[color-mix(in_srgb,var(--border)_22%,transparent)] border border-[var(--border)] rounded text-[var(--foreground)] hover:bg-[color-mix(in_srgb,var(--border)_45%,transparent)] transition-colors"
              >
                {sortBy === 'name-asc' && 'Name A-Z'}
                {sortBy === 'name-desc' && 'Name Z-A'}
                {sortBy === 'modified' && 'Last Modified'}
                {sortBy === 'created' && 'Last Created'}
                {sortBy === 'type' && 'File Type'}
                <span className={`transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}>
                  <IconChevronDown />
                </span>
              </button>
              
              {isDropdownOpen && (
                <div className="absolute right-0 top-full mt-1 w-32 bg-[var(--background)] border border-[var(--border)] rounded shadow-lg z-50 overflow-hidden">
                  <button
                    onClick={() => handleSortChange('name-asc')}
                    className={`w-full text-left px-2 py-1.5 text-xs hover:bg-[color-mix(in_srgb,var(--accent)_8%,transparent)] transition-colors ${
                      sortBy === 'name-asc' ? 'bg-[color-mix(in_srgb,var(--accent)_15%,transparent)] text-[var(--accent)]' : 'text-[var(--foreground)]'
                    }`}
                  >
                    Name A-Z
                  </button>
                  <button
                    onClick={() => handleSortChange('name-desc')}
                    className={`w-full text-left px-2 py-1.5 text-xs hover:bg-[color-mix(in_srgb,var(--accent)_8%,transparent)] transition-colors ${
                      sortBy === 'name-desc' ? 'bg-[color-mix(in_srgb,var(--accent)_15%,transparent)] text-[var(--accent)]' : 'text-[var(--foreground)]'
                    }`}
                  >
                    Name Z-A
                  </button>
                  <button
                    onClick={() => handleSortChange('modified')}
                    className={`w-full text-left px-2 py-1.5 text-xs hover:bg-[color-mix(in_srgb,var(--accent)_8%,transparent)] transition-colors ${
                      sortBy === 'modified' ? 'bg-[color-mix(in_srgb,var(--accent)_15%,transparent)] text-[var(--accent)]' : 'text-[var(--foreground)]'
                    }`}
                  >
                    Last Modified
                  </button>
                  <button
                    onClick={() => handleSortChange('created')}
                    className={`w-full text-left px-2 py-1.5 text-xs hover:bg-[color-mix(in_srgb,var(--accent)_8%,transparent)] transition-colors ${
                      sortBy === 'created' ? 'bg-[color-mix(in_srgb,var(--accent)_15%,transparent)] text-[var(--accent)]' : 'text-[var(--foreground)]'
                    }`}
                  >
                    Last Created
                  </button>
                  <button
                    onClick={() => handleSortChange('type')}
                    className={`w-full text-left px-2 py-1.5 text-xs hover:bg-[color-mix(in_srgb,var(--accent)_8%,transparent)] transition-colors ${
                      sortBy === 'type' ? 'bg-[color-mix(in_srgb,var(--accent)_15%,transparent)] text-[var(--accent)]' : 'text-[var(--foreground)]'
                    }`}
                  >
                    File Type
                  </button>
                </div>
              )}
            </div>
          </div>
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
