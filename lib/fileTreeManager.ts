import * as Y from 'yjs';
// @ts-ignore - yjs-orderedtree types are not properly resolved
import { checkForYTree, YTree } from 'yjs-orderedtree';
import { createSafeYTree } from './yjsOrderedTreePatch';

export interface FileMetadata {
  path: string;
  name: string;
  size: number;
  mimeType: string;
  type: 'text' | 'binary' | 'folder'; // ✅ Add 'folder' type
  lastModified: number;
  transferChannel: 'yjs' | 'webrtc';
  isFolder?: boolean;
  // New: Directory-specific Y.Map reference
  directoryMapId?: string;
}

export interface TreeItem extends FileMetadata {
  id: string;
  parentId: string;
  children: string[];
  fractionalIndex?: string;
  // New: Directory's Y.Map reference for nested directories
  directoryMap?: Y.Map<any>;
}

export type SortCriteria = 'name-asc' | 'name-desc' | 'modified' | 'created' | 'type';

/**
 * Manages filetree using YJS Ordered Tree with hierarchical directory support
 * Each directory gets its own Y.Map containing a Y-OrderedTree for true nested synchronization
 */
export class FileTreeManager {
  private static readonly ROOT_NODE_KEY = "project-root";
  private static readonly DIRECTORY_ROOT_KEY = "directory-root";
  private yTree: YTree;
  private rootNodeId: string = '';
  private yMap: Y.Map<any>;
  private directoryMaps: Map<string, Y.Map<any>> = new Map();
  private directoryDocs: Map<string, Y.Doc> = new Map();
  private isReady: boolean = false; // ✅ Track ready state

  constructor(yMap: Y.Map<any>, deferRootCreation: boolean = false) {
    if (!yMap) {
      throw new Error('FileTreeManager requires a valid Y.Map');
    }
    
    this.yMap = yMap;
    
    // Always create YTree wrapper — this installs event handlers on the Y.Map
    // so incoming Yjs updates (from WebRTC) are processed correctly.
    this.yTree = createSafeYTree(yMap);

    if (!deferRootCreation) {
      this.ensureRoot();
    }
  }

  /**
   * Ensure the root node exists. Call this after remote state has settled
   * (for collaborative sessions where the map may have been empty at construction).
   */
  ensureRoot(): void {
    if (this.isReady) return;

    if (!checkForYTree(this.yMap)) {
      this.initializeRoot();
    }

    let rootChildren: string[] = [];
    try {
      rootChildren = this.yTree.getNodeChildrenFromKey("root");
    } catch (e) {
      this.initializeRoot();
      rootChildren = this.yTree.getNodeChildrenFromKey("root");
    }

    if (rootChildren.length > 0) {
      this.rootNodeId = rootChildren[0];
    } else {
      this.rootNodeId = this.createRootNode();
    }
    
    this.isReady = true;
  }

  private initializeRoot(): void {
    const rootNodeKey = FileTreeManager.ROOT_NODE_KEY;
    this.yTree.createNode("root", rootNodeKey, {
      type: "project",
      name: "root",
      created: Date.now(),
    });
    this.rootNodeId = rootNodeKey;
  }

  /**
   * Initialize Y.Map for each existing directory
   */
  private initializeDirectoryMaps(): void {
    const allItems = this.getTreeItems();
    allItems.forEach(item => {
      if (item.isFolder && item.path !== '/') {
        this.getOrCreateDirectoryMap(item.path);
      }
    });
  }

  /**
   * Get or create a Y.Map for a directory (following yjs-orderedtree API)
   */
  private getOrCreateDirectoryMap(directoryPath: string): Y.Map<any> {
    if (this.directoryMaps.has(directoryPath)) {
      return this.directoryMaps.get(directoryPath)!;
    }
    
    const directoryDoc = new Y.Doc();
    const directoryMapId = `directory-${directoryPath.replace(/\//g, '-')}`;
    const directoryMap = directoryDoc.getMap(directoryMapId);
    
    if (!checkForYTree(directoryMap)) {
      try {
        const directoryYTree = createSafeYTree(directoryMap);
        const rootNodeKey = FileTreeManager.DIRECTORY_ROOT_KEY;
        directoryYTree.createNode("root", rootNodeKey, {
          type: "directory",
          path: directoryPath,
          name: directoryPath.split('/').pop() || 'root',
          created: Date.now(),
        });
      } catch {
        // Directory map was created; YTree can be initialized later
      }
    }
    
    this.directoryMaps.set(directoryPath, directoryMap);
    this.directoryDocs.set(directoryPath, directoryDoc);
    return directoryMap;
  }

  /**
   * Get the Y.Map used by this FileTreeManager (for recreation)
   */
  getYMap(): Y.Map<any> {
    return this.yMap;
  }

  /**
   * Check if the FileTreeManager is ready
   */
  isFileTreeManagerReady(): boolean {
    return this.isReady;
  }

  /**
   * Re-evaluate rootNodeId after a CRDT merge may have introduced
   * the real authoritative root from a remote peer.
   * Handles legacy projects where the sharer used a random root key.
   */
  refreshRoot(): boolean {
    if (!this.isReady) return false;
    try {
      const rootChildren = this.yTree.getNodeChildrenFromKey("root");
      if (rootChildren.length <= 1) return false;

      const currentChildren = this.yTree.getNodeChildrenFromKey(this.rootNodeId);
      if (currentChildren.length > 0) return false;

      for (const childKey of rootChildren) {
        if (childKey === this.rootNodeId) continue;
        const children = this.yTree.getNodeChildrenFromKey(childKey);
        if (children.length > 0) {
          this.rootNodeId = childKey;
          return true;
        }
      }
      return false;
    } catch {
      return false;
    }
  }

  /**
   * Get the Y.Doc for a directory (for WebRTC provider setup)
   */
  getDirectoryDoc(directoryPath: string): Y.Doc | null {
    return this.directoryDocs.get(directoryPath) || null;
  }

  /**
   * Get the Y.Map for a directory's contents
   */
  getDirectoryMap(directoryPath: string): Y.Map<any> {
    return this.getOrCreateDirectoryMap(directoryPath);
  }

  /**
   * Get all directory maps
   */
  getAllDirectoryMaps(): Map<string, Y.Map<any>> {
    return new Map(this.directoryMaps);
  }

  private createRootNode(): string {
    const rootNodeKey = FileTreeManager.ROOT_NODE_KEY;
    this.yTree.createNode("root", rootNodeKey, {
      type: "project", 
      name: "root",
      created: Date.now(),
    });
    return rootNodeKey;
  }

  /**
   * Add a file to the tree with proper hierarchy
   */
  createFile(metadata: FileMetadata): string {
    try {
      const nodeId = this.yTree.generateNodeKey();

      // Parse the path to get the directory hierarchy (relative within project)
      const pathParts = metadata.path.split('/').filter(Boolean);
      let currentParentKey = this.rootNodeId;

      // Create/find parent directories in the hierarchy
      for (let i = 0; i < pathParts.length - 1; i++) {
        const dirName = pathParts[i];
        
        // Check if this directory already exists as a child of current parent
        const existingChildren = this.yTree.getNodeChildrenFromKey(currentParentKey);
        const existingDir = existingChildren.find((childId: string) => {
          const childData = this.yTree.getNodeValueFromKey(childId);
          return childData?.name === dirName && childData?.isFolder;
        });
        
        if (existingDir) {
          currentParentKey = existingDir;
        } else {
          const dirNodeId = this.yTree.generateNodeKey();
          const dirMetadata = {
            path: pathParts.slice(0, i + 1).join('/'),
            name: dirName,
            size: 0,
            mimeType: 'folder',
            type: 'folder' as const,
            lastModified: Date.now(),
            transferChannel: 'yjs' as const,
            isFolder: true,
          };
          this.yTree.createNode(currentParentKey, dirNodeId, dirMetadata);
          currentParentKey = dirNodeId;
        }
      }

      const fileMetadata = {
        path: metadata.path,
        name: metadata.name,
        size: metadata.size,
        mimeType: metadata.mimeType,
        type: metadata.type,
        lastModified: metadata.lastModified,
        transferChannel: metadata.transferChannel,
        isFolder: false,
      };
      
      const parentExists = this.yTree.getNodeValueFromKey(currentParentKey) !== undefined;
      if (!parentExists) {
        throw new Error(`Parent node not found: ${currentParentKey}`);
      }
      
      this.yTree.createNode(currentParentKey, nodeId, fileMetadata);
      this.positionNewNode(nodeId, currentParentKey, false);
      return nodeId;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Create a folder and initialize its directory map
   */
  createFolder(name: string, path: string): string {
    try {
      const nodeId = this.yTree.generateNodeKey();
      const pathParts = path.split('/').filter(Boolean);
      let currentParentKey = this.rootNodeId;

      for (let i = 0; i < pathParts.length - 1; i++) {
        const dirName = pathParts[i];
        const existingChildren = this.yTree.getNodeChildrenFromKey(currentParentKey);
        const existingDir = existingChildren.find((childId: string) => {
          const childData = this.yTree.getNodeValueFromKey(childId);
          return childData?.name === dirName && childData?.isFolder;
        });
        if (existingDir) {
          currentParentKey = existingDir;
        } else {
          const dirNodeId = this.yTree.generateNodeKey();
          const dirMetadata = {
            path: '/' + pathParts.slice(0, i + 1).join('/'),
            name: dirName,
            size: 0,
            mimeType: 'folder',
            type: 'folder' as const,
            lastModified: Date.now(),
            transferChannel: 'yjs' as const,
            isFolder: true,
          };
          this.yTree.createNode(currentParentKey, dirNodeId, dirMetadata);
          currentParentKey = dirNodeId;
        }
      }

      const folderMetadata = {
        path,
        name,
        size: 0,
        mimeType: 'folder',
        type: 'folder' as const,
        lastModified: Date.now(),
        transferChannel: 'yjs' as const,
        isFolder: true,
      };
      
      const parentExists = this.yTree.getNodeValueFromKey(currentParentKey) !== undefined;
      if (!parentExists) {
        throw new Error(`Parent node not found: ${currentParentKey}`);
      }
      
      this.yTree.createNode(currentParentKey, nodeId, folderMetadata);
      this.positionNewNode(nodeId, currentParentKey, true);

      try {
        this.getOrCreateDirectoryMap(path);
      } catch {
        // Continue - folder was created, directory map can be initialized later
      }

      return nodeId;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Delete a node and its descendants
   */
  deleteNode(nodeKey: string): void {
    try {
      const nodeValue = this.yTree.getNodeValueFromKey(nodeKey);
      if (!nodeValue) return;
      this.yTree.deleteNodeAndDescendants(nodeKey);
    } catch {
      // Silently ignore delete errors
    }
  }

  /**
   * Update node value
   */
  updateNodeValue(nodeKey: string, value: Partial<FileMetadata>): void {
    try {
      const currentValue = this.yTree.getNodeValueFromKey(nodeKey);
      if (currentValue) {
        this.yTree.setNodeValueFromKey(nodeKey, { ...currentValue, ...value });
      }
    } catch {
      // Silently ignore update errors
    }
  }

  /**
   * Move node to new parent
   */
  moveNode(nodeKey: string, newParentKey: string): void {
    try {
      const sourceNode = this.yTree.getNodeValueFromKey(nodeKey);
      const targetParent = this.yTree.getNodeValueFromKey(newParentKey);
      if (!sourceNode || !targetParent) return;
      this.yTree.moveChildToParent(nodeKey, newParentKey);
    } catch {
      // Silently ignore move errors
    }
  }

  /**
   * Find node by path
   */
  findNodeByPath(path: string): TreeItem | null {
    const allItems = this.getTreeItems();
    return allItems.find(item => item.path === path) || null;
  }

  /**
   * Get node key by path
   */
  getNodeKeyByPath(path: string): string | null {
    const node = this.findNodeByPath(path);
    return node ? node.id : null;
  }

  /**
   * Clear all items (for testing/reset)
   */
  clearAll(): void {
    const allItems = this.getTreeItems();
    allItems.forEach(item => {
      this.yTree.deleteNodeAndDescendants(item.id);
    });
  }

  /**
   * Move a node to a new position (for drag & drop)
   */
  moveItem(nodeId: string, targetParentId: string, targetIndex?: number): void {
    try {
      const sourceNode = this.yTree.getNodeValueFromKey(nodeId);
      const targetParent = this.yTree.getNodeValueFromKey(targetParentId);
      if (!sourceNode || !targetParent || nodeId === targetParentId) return;
      
      this.yTree.moveChildToParent(nodeId, targetParentId);
      
      if (targetIndex !== undefined) {
        const children = this.yTree.getNodeChildrenFromKey(targetParentId);
        if (targetIndex === 0) {
          this.yTree.setNodeOrderToStart(nodeId);
        } else if (targetIndex >= children.length - 1) {
          this.yTree.setNodeOrderToEnd(nodeId);
        } else {
          const targetNode = children[targetIndex - 1];
          if (targetNode) this.yTree.setNodeAfter(nodeId, targetNode);
        }
      }
    } catch {
      // Silently ignore move errors
    }
  }

  /**
   * Sort tree items using yjs-orderedtree API with folder-first ordering
   * Now sorts ALL directory levels, not just root level
   */
  sortTreeItems(criteria: SortCriteria): void {
    this.sortSingleTree(this.yTree, criteria, 'root');
    this.directoryMaps.forEach((directoryMap, directoryPath) => {
      const directoryYTree = createSafeYTree(directoryMap);
      this.sortSingleTree(directoryYTree, criteria, directoryPath);
    });
  }

  /**
   * Sort a single YTree instance with the given criteria
   */
  private sortSingleTree(yTree: YTree, criteria: SortCriteria, treeContext: string): void {
    try {
      const items = this.getItemsFromTree(yTree);
      if (items.length === 0) return;
      
      const parentGroups = new Map<string, TreeItem[]>();
      items.forEach(item => {
        const parentId = item.parentId || this.rootNodeId;
        if (!parentGroups.has(parentId)) parentGroups.set(parentId, []);
        parentGroups.get(parentId)!.push(item);
      });
      
      parentGroups.forEach((items) => {
        const sortedItems = this.sortItemsWithCriteria(items, criteria);
        this.applyOrderingToTree(yTree, sortedItems);
      });
    } catch {
      // Silently ignore sort errors
    }
  }

  /**
   * Get items from a specific YTree instance
   */
  private getItemsFromTree(yTree: YTree): TreeItem[] {
    const items: TreeItem[] = [];
    
    // Get root children
    const rootChildren = yTree.getNodeChildrenFromKey(this.rootNodeId);
    const sortedRootChildren = yTree.sortChildrenByOrder(rootChildren, this.rootNodeId);
    
    const collectItems = (nodeKey: string, parentId: string) => {
      const value = yTree.getNodeValueFromKey(nodeKey);
      if (value) {
        const treeItem: TreeItem = {
          ...value as FileMetadata,
          id: nodeKey,
          parentId: parentId,
          children: yTree.getNodeChildrenFromKey(nodeKey),
        };
        items.push(treeItem);
        
        // Recursively collect children
        const children = yTree.getNodeChildrenFromKey(nodeKey);
        const sortedChildren = yTree.sortChildrenByOrder(children, nodeKey);
        sortedChildren.forEach((childKey: string) => {
          collectItems(childKey, nodeKey);
        });
      }
    };
    
    sortedRootChildren.forEach((childKey: string) => {
      collectItems(childKey, this.rootNodeId);
    });
    
    return items;
  }

  /**
   * Apply ordering to a specific YTree instance
   */
  private applyOrderingToTree(yTree: YTree, sortedItems: TreeItem[]): void {
    if (sortedItems.length === 0) return;
    
    sortedItems.forEach((item, index) => {
      if (index === 0) {
        // First item goes to start
        yTree.setNodeOrderToStart(item.id);
      } else {
        // Each subsequent item goes after the previous one
        const previousItem = sortedItems[index - 1];
        yTree.setNodeAfter(item.id, previousItem.id);
      }
    });
  }
  
  /**
   * Sort items by criteria with folders first
   */
  private sortItemsWithCriteria(items: TreeItem[], criteria: SortCriteria): TreeItem[] {
    // Separate folders and files
    const folders = items.filter(item => item.isFolder);
    const files = items.filter(item => !item.isFolder);
    
    // Sort folders
    const sortedFolders = this.sortByCriteria(folders, criteria);
    
    // Sort files  
    const sortedFiles = this.sortByCriteria(files, criteria);
    
    // Combine: folders first, then files
    return [...sortedFolders, ...sortedFiles];
  }
  
  /**
   * Sort items by specific criteria
   */
  private sortByCriteria(items: TreeItem[], criteria: SortCriteria): TreeItem[] {
    return [...items].sort((a, b) => {
      switch (criteria) {
        case 'name-asc':
          return a.name.localeCompare(b.name);
        case 'name-desc':
          return b.name.localeCompare(a.name);
        case 'modified':
          return (b.lastModified || 0) - (a.lastModified || 0);
        case 'created':
          return (b.lastModified || 0) - (a.lastModified || 0); // Use lastModified as proxy for created
        case 'type':
          return a.mimeType.localeCompare(b.mimeType);
        default:
          return 0;
      }
    });
  }
  
  /**
   * Position a new node correctly (folders first, then alphabetical)
   */
  private positionNewNode(nodeId: string, parentId: string, isFolder: boolean): void {
    const siblings = this.yTree.getNodeChildrenFromKey(parentId);
    const sortedSiblings = this.yTree.sortChildrenByOrder(siblings, parentId);
    
    const siblingItems = sortedSiblings
      .filter((id: string) => id !== nodeId)
      .map((id: string) => ({
        id,
        value: this.yTree.getNodeValueFromKey(id),
        isFolder: this.yTree.getNodeValueFromKey(id)?.isFolder || false
      }))
      .filter((item: any) => item.value);
    
    let insertAfter: string | null = null;
    
    for (const sibling of siblingItems) {
      if (isFolder && !sibling.isFolder) break;
      if (sibling.isFolder === isFolder) {
        const newNodeName = this.yTree.getNodeValueFromKey(nodeId)?.name || '';
        const siblingName = sibling.value?.name || '';
        if (newNodeName < siblingName) break;
      }
      insertAfter = sibling.id;
    }
    
    if (insertAfter) {
      this.yTree.setNodeAfter(nodeId, insertAfter);
    } else {
      this.yTree.setNodeOrderToStart(nodeId);
    }
  }

  
  /**
   * Get all tree items with directory map references
   */
  getTreeItems(): TreeItem[] {
    if (!this.isReady) return [];
    this.refreshRoot();
    const items: TreeItem[] = [];
    
    const collectItems = (nodeKey: string, parentKey?: string): void => {
      const value = this.yTree.getNodeValueFromKey(nodeKey);
      if (value) {
        // Create TreeItem with YTree-managed properties
        const treeItem: TreeItem = {
          ...value as FileMetadata,
          id: nodeKey,
          parentId: parentKey || this.rootNodeId, // Use actual parent, not self-reference
          children: this.yTree.getNodeChildrenFromKey(nodeKey), // Get children from YTree
        };

        // Add directory map reference for folders
        if (value.isFolder && value.path !== '/') {
          const directoryMap = this.directoryMaps.get(value.path);
          if (directoryMap) {
            treeItem.directoryMap = directoryMap;
            treeItem.directoryMapId = `directory-${value.path.replace(/\//g, '-')}`;
          }
        }

        items.push(treeItem);
        
        // Recursively collect children
        const children = this.yTree.getNodeChildrenFromKey(nodeKey);
        children.forEach((childKey: string) => {
          collectItems(childKey, nodeKey);
        });
      }
    };
    
    const rootChildren = this.yTree.getNodeChildrenFromKey(this.rootNodeId);
    const sortedRootChildren = this.yTree.sortChildrenByOrder(rootChildren, this.rootNodeId);
    sortedRootChildren.forEach((childKey: string) => {
      collectItems(childKey, this.rootNodeId);
    });
    return items;
  }

  /**
   * Get contents of a specific directory using its own Y.Map
   */
  getDirectoryContents(directoryPath: string): TreeItem[] {
    const directoryMap = this.getDirectoryMap(directoryPath);

    // Create a simple tree structure from the directory map
    const items: TreeItem[] = [];
    
    // Get the YTree from the directory map
    if (checkForYTree(directoryMap)) {
      const directoryYTree = createSafeYTree(directoryMap);
      
      // Get root children
      const rootChildren = directoryYTree.getNodeChildrenFromKey("root");
      const firstChild = rootChildren[0];
      
      if (firstChild) {
        const children = directoryYTree.getNodeChildrenFromKey(firstChild);
        
        children.forEach((childKey: string) => {
          const value = directoryYTree.getNodeValueFromKey(childKey);
          if (value) {
            const treeItem: TreeItem = {
              ...value as FileMetadata,
              id: childKey,
              parentId: firstChild,
              children: directoryYTree.getNodeChildrenFromKey(childKey),
            };
            items.push(treeItem);
          }
        });
      }
    }
    
    return items;
  }

  /**
   * Add a file to a specific directory's Y.Map
   */
  addFileToDirectory(directoryPath: string, metadata: FileMetadata): string {
    const directoryMap = this.getDirectoryMap(directoryPath);

    // Create YTree for this directory
    const directoryYTree = createSafeYTree(directoryMap);
    
    // Get root node
    const rootChildren = directoryYTree.getNodeChildrenFromKey("root");
    const rootNodeId = rootChildren[0];
    
    if (!rootNodeId) {
      throw new Error(`Root node not found for directory: ${directoryPath}`);
    }

    // Create file node
    const nodeId = directoryYTree.generateNodeKey();
    const fileMetadata = {
      path: metadata.path,
      name: metadata.name,
      size: metadata.size,
      mimeType: metadata.mimeType,
      type: metadata.type,
      lastModified: metadata.lastModified,
      transferChannel: metadata.transferChannel,
      isFolder: false,
    };
    
    directoryYTree.createNode(rootNodeId, nodeId, fileMetadata);
    return nodeId;
  }

  /**
   * Add a subdirectory to a specific directory's Y.Map
   */
  addSubdirectoryToDirectory(parentPath: string, name: string, path: string): string {
    const directoryMap = this.getDirectoryMap(parentPath);

    // Create YTree for this directory
    const directoryYTree = createSafeYTree(directoryMap);
    
    // Get root node
    const rootChildren = directoryYTree.getNodeChildrenFromKey("root");
    const rootNodeId = rootChildren[0];
    
    if (!rootNodeId) {
      throw new Error(`Root node not found for directory: ${parentPath}`);
    }

    // Create folder node
    const nodeId = directoryYTree.generateNodeKey();
    const folderMetadata = {
      path,
      name,
      size: 0,
      mimeType: 'folder',
      type: 'folder' as const, // ✅ Use 'folder' type
      lastModified: Date.now(),
      transferChannel: 'yjs' as const,
      isFolder: true,
    };
    
    directoryYTree.createNode(rootNodeId, nodeId, folderMetadata);
    
    // Initialize directory map for the new subdirectory
    this.getOrCreateDirectoryMap(path);
    
    return nodeId;
  }

  /**
   * Get tree items in hierarchical order
   */
  getOrderedTreeItems(): TreeItem[] {
    const allItems = this.getTreeItems();
    
    // Separate folders and files
    const folders = allItems.filter(item => item.isFolder);
    const files = allItems.filter(item => !item.isFolder);
    
    // Sort by fractional index
    const sortByIndex = (a: TreeItem, b: TreeItem) => {
      const aIndex = a.fractionalIndex || '';
      const bIndex = b.fractionalIndex || '';
      return aIndex.localeCompare(bIndex);
    };
    
    folders.sort(sortByIndex);
    files.sort(sortByIndex);
    
    // Folders first, then files
    return [...folders, ...files];
  }

  /**
   * Update file metadata
   */
  updateFileMetadata(nodeId: string, metadata: Partial<FileMetadata>): void {
    const currentValue = this.yTree.getNodeValueFromKey(nodeId);
    if (currentValue) {
      this.yTree.setNodeValueFromKey(nodeId, {
        ...currentValue,
        ...metadata,
        lastModified: Date.now(),
      });
    }
  }

  /**
   * Get node by path
   */
  getNodeByPath(path: string): TreeItem | null {
    const items = this.getTreeItems();
    return items.find(item => item.path === path) || null;
  }

  /**
   * Sort items based on criteria
   */
  private sortItems(items: Array<{ id: string; value: any }>, criteria: SortCriteria): Array<{ id: string; value: any }> {
    const sorted = [...items];
    
    switch (criteria) {
      case 'name-asc':
        sorted.sort((a, b) => a.value.name.localeCompare(b.value.name));
        break;
      case 'name-desc':
        sorted.sort((a, b) => b.value.name.localeCompare(a.value.name));
        break;
      case 'modified':
        sorted.sort((a, b) => b.value.lastModified - a.value.lastModified);
        break;
      case 'created':
        sorted.sort((a, b) => (b.value.created || 0) - (a.value.created || 0));
        break;
      case 'type':
        sorted.sort((a, b) => {
          const aIsFolder = a.value.isFolder;
          const bIsFolder = b.value.isFolder;
          if (aIsFolder !== bIsFolder) {
            return aIsFolder ? -1 : 1; // Folders first
          }
          return a.value.name.localeCompare(b.value.name);
        });
        break;
    }
    
    return sorted;
  }

  /**
   * Get the underlying YTree instance
   */
  getYTree(): YTree {
    return this.yTree;
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    // YTree and YMap are cleaned up by the Y.Doc destruction
  }
}
