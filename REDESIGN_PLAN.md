# YJS Ordered Tree Implementation Plan

## Overview
Replace the current scuffed filetree solution with a clean `yjs-orderedtree` implementation for proper CRDT-based filetree management with sorting capabilities.

## Current Issues
- Scuffed JSON-based filetree with manual sync
- No proper ordering/sorting capabilities  
- Race conditions and timing issues
- Complex sync logic with multiple documents
- Hard to maintain and extend

## Solution: YJS Ordered Tree

### 1. Library Integration
- Install `yjs-orderedtree` for CRDT-based ordered tree
- Use fractional indexing for stable ordering
- Leverage Evan Wallace's CRDT tree algorithms

### 2. Tree Structure
```
root (project)
├── folders (0.0-0.5 fractional range)
└── files (0.5-1.0 fractional range)
```

### 3. Sorting Capabilities
- **A-Z**: Name ascending
- **Z-A**: Name descending  
- **Last Modified**: Modification time
- **Last Created**: Creation time
- **File Type**: Extension/category
- **Folders First**: Folders always before files

### 4. Implementation Steps

#### Step 1: Setup Ordered Tree
- Create YTree instance in project initialization
- Initialize root node with project metadata
- Set up proper refs and cleanup

#### Step 2: File Operations
- `createFileNode()` - Add file to tree
- `createFolderNode()` - Add folder to tree  
- `deleteNode()` - Remove file/folder
- `moveNode()` - Drag & drop reorganization

#### Step 3: Sorting Implementation
- `sortByName()` - A-Z/Z-A sorting
- `sortByModified()` - Last modified sorting
- `sortByCreated()` - Creation time sorting
- `sortByType()` - File type sorting
- Use fractional indexing for stable positions

#### Step 4: UI Integration
- Replace current filetree component
- Add sorting controls (dropdown/buttons)
- Implement drag & drop with YTree operations
- Real-time sync with YJS updates

#### Step 5: Migration Path
- Convert existing filetree JSON to YTree format
- Preserve file metadata and structure
- Maintain backward compatibility during transition
- Clean up old JSON-based filetree code

### 5. Key Components

#### FileTreeManager Class
```typescript
class FileTreeManager {
  private yTree: YTree;
  private rootNode: string;
  
  constructor(yMap: Y.Map) {
    this.yTree = new YTree(yMap);
    this.initializeRoot();
  }
  
  createFile(path: string, metadata: FileMetadata): void;
  createFolder(path: string): void;
  deleteItem(path: string): void;
  moveItem(from: string, to: string): void;
  sortTree(criteria: SortCriteria): void;
  getTreeItems(): TreeItem[];
}
```

#### Sorting Controls
```typescript
type SortCriteria = 'name-asc' | 'name-desc' | 'modified' | 'created' | 'type';

interface SortControlsProps {
  currentSort: SortCriteria;
  onSortChange: (criteria: SortCriteria) => void;
}
```

#### Tree Item Component
```typescript
interface TreeItemProps {
  item: TreeItem;
  level: number;
  onRename: (path: string, newName: string) => void;
  onDelete: (path: string) => void;
  onMove: (from: string, to: string) => void;
}
```

### 6. Benefits
- **Real-time Collaboration**: Proper CRDT sync
- **Stable Ordering**: Fractional indexing prevents conflicts
- **Flexible Sorting**: Multiple sort criteria
- **Clean Architecture**: Separated concerns
- **Better Performance**: Efficient tree operations
- **Extensible**: Easy to add new features

### 7. Migration Strategy
1. **Phase 1**: Implement YTree alongside existing system
2. **Phase 2**: Add file operations and sorting
3. **Phase 3**: Replace UI components
4. **Phase 4**: Remove old JSON-based code
5. **Phase 5**: Optimize and add advanced features

### 8. Files to Modify
- `/app/project/[id]/ProjectPageClient.tsx` - Main integration
- `/components/FileTree.tsx` - New tree component
- `/lib/fileTreeManager.ts` - Tree management logic
- `/types/fileTree.ts` - Type definitions

### 9. Testing Strategy
- Unit tests for FileTreeManager
- Integration tests for YJS sync
- UI tests for sorting and drag & drop
- Migration tests for existing projects

This plan provides a clean, maintainable solution for filetree management with proper CRDT capabilities and flexible sorting.
