import * as Y from 'yjs';
// @ts-ignore - yjs-orderedtree types are not properly resolved
import { checkForYTree, YTree } from 'yjs-orderedtree';

export interface FileMetadata {
  path: string;
  name: string;
  size: number;
  mimeType: string;
  type: 'text' | 'binary';
  lastModified: number;
  transferChannel: 'yjs' | 'webrtc';
  isFolder?: boolean;
}

export interface TreeItem extends FileMetadata {
  id: string;
  parentId: string;
  children: string[];
  fractionalIndex?: string;
}

export type SortCriteria = 'name-asc' | 'name-desc' | 'modified' | 'created' | 'type';

/**
 * Manages filetree using YJS Ordered Tree for CRDT-based collaboration
 */
export class FileTreeManager {
  private yTree: YTree;
  private rootNodeId: string;
  private yMap: Y.Map<any>;

  constructor(yMap: Y.Map<any>) {
    this.yMap = yMap;
    
    // Initialize YTree - check if it exists first
    if (checkForYTree(yMap)) {
      console.log('🌳 Loading existing filetree tree');
      this.yTree = new YTree(yMap);
    } else {
      console.log('🌳 Creating new filetree tree');
      this.yTree = new YTree(yMap);
      this.initializeRoot();
    }
    
    // Get root node (should always exist after initialization)
    const rootChildren = this.yTree.getNodeChildrenFromKey("root");
    this.rootNodeId = rootChildren[0] || this.createRootNode();
  }

  private initializeRoot(): void {
    const rootNodeKey = this.yTree.generateNodeKey();
    this.yTree.createNode("root", rootNodeKey, {
      type: "project",
      name: "root",
      created: Date.now(),
    });
  }

  private createRootNode(): string {
    const rootNodeKey = this.yTree.generateNodeKey();
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
        // Create missing directory
        const dirNodeId = this.yTree.generateNodeKey();
        
        const dirMetadata = {
          path: pathParts.slice(0, i + 1).join('/'), // Relative path within project
          name: dirName,
          size: 0,
          mimeType: 'folder',
          type: 'binary',
          lastModified: Date.now(),
          transferChannel: 'yjs',
          isFolder: true,
        };
        
        this.yTree.createNode(currentParentKey, dirNodeId, dirMetadata);
        
        currentParentKey = dirNodeId;
        console.log('📁 Created directory node:', dirName);
      }
    }

    // Create the file node in the correct parent directory
    const fileMetadata = {
      path: metadata.path, // Relative path within project
      name: metadata.name,
      size: metadata.size,
      mimeType: metadata.mimeType,
      type: metadata.type,
      lastModified: metadata.lastModified,
      transferChannel: metadata.transferChannel,
      isFolder: false,
    };
    
    this.yTree.createNode(currentParentKey, nodeId, fileMetadata);

    console.log('📄 Created file node:', metadata.path);
    return nodeId;
  }

  /**
   * Add a folder to the tree with proper hierarchy
   */
  createFolder(name: string, path: string): string {
    const nodeId = this.yTree.generateNodeKey();
    
    // Parse the path to get the directory hierarchy (relative within project)
    const pathParts = path.split('/').filter(Boolean);
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
        // Create missing directory
        const dirNodeId = this.yTree.generateNodeKey();
        
        const dirMetadata = {
          path: pathParts.slice(0, i + 1).join('/'), // Relative path within project
          name: dirName,
          size: 0,
          mimeType: 'folder',
          type: 'binary',
          lastModified: Date.now(),
          transferChannel: 'yjs',
          isFolder: true,
        };
        
        this.yTree.createNode(currentParentKey, dirNodeId, dirMetadata);
        
        currentParentKey = dirNodeId;
        console.log('📁 Created directory node:', dirName);
      }
    }

    // Create the folder node in the correct parent directory
    const folderMetadata = {
      path, // Relative path within project
      name,
      size: 0,
      mimeType: 'folder',
      type: 'binary',
      lastModified: Date.now(),
      transferChannel: 'yjs',
      isFolder: true,
    };
    
    this.yTree.createNode(currentParentKey, nodeId, folderMetadata);

    console.log('📁 Created folder node:', path);
    return nodeId;
  }

  /**
   * Delete a node and its descendants
   */
  deleteNode(nodeKey: string): void {
    this.yTree.deleteNodeAndDescendants(nodeKey);
    console.log('🗑️ Deleted node:', nodeKey);
  }

  /**
   * Update node value
   */
  updateNodeValue(nodeKey: string, value: Partial<FileMetadata>): void {
    const currentValue = this.yTree.getNodeValueFromKey(nodeKey);
    if (currentValue) {
      this.yTree.setNodeValueFromKey(nodeKey, { ...currentValue, ...value });
      console.log('✏️ Updated node value:', nodeKey, value);
    }
  }

  /**
   * Move node to new parent
   */
  moveNode(nodeKey: string, newParentKey: string): void {
    this.yTree.moveChildToParent(nodeKey, newParentKey);
    console.log('📁 Moved node:', nodeKey, 'to parent:', newParentKey);
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
    console.log('🗑️ Cleared all items');
  }

  /**
   * Move a node to a new position (for drag & drop)
   */
  moveItem(nodeId: string, targetParentId: string, targetIndex?: number): void {
    try {
      this.yTree.moveChildToParent(nodeId, targetParentId);
      
      if (targetIndex !== undefined) {
        // Use YTree's built-in ordering methods
        const children = this.yTree.getNodeChildrenFromKey(targetParentId);
        if (targetIndex === 0) {
          this.yTree.setNodeOrderToStart(nodeId);
        } else if (targetIndex >= children.length - 1) {
          this.yTree.setNodeOrderToEnd(nodeId);
        } else {
          // Insert after the node at targetIndex - 1
          const targetNode = children[targetIndex - 1];
          this.yTree.setNodeAfter(nodeId, targetNode);
        }
      }
      
      console.log('🔄 Moved node:', nodeId, 'to parent:', targetParentId);
    } catch (error) {
      console.error('Failed to move node:', nodeId, error);
    }
  }

  /**
   * Sort the tree by specified criteria
   */
  sortTreeItems(criteria: SortCriteria): void {
    const allItems = this.getTreeItems();
    const sorted = this.sortItems(
      allItems.map(item => ({ id: item.id, value: item })),
      criteria
    );
    
    // Apply the new order using YTree's built-in ordering methods
    // Note: We need to reorder based on the actual YTree structure
    const parentGroups = new Map<string, string[]>();
    
    // Group items by parent
    sorted.forEach((item, index) => {
      const parentId = item.value.parentId;
      if (!parentGroups.has(parentId)) {
        parentGroups.set(parentId, []);
      }
      parentGroups.get(parentId)!.push(item.id);
    });
    
    // Apply ordering within each parent group
    parentGroups.forEach((childIds, parentId) => {
      childIds.forEach((childId, index) => {
        if (index === 0) {
          this.yTree.setNodeOrderToStart(childId);
        } else if (index === childIds.length - 1) {
          this.yTree.setNodeOrderToEnd(childId);
        } else {
          // Insert after the previous item
          const previousChildId = childIds[index - 1];
          this.yTree.setNodeAfter(childId, previousChildId);
        }
      });
    });
    
    console.log('🔄 Sorted tree items by criteria:', criteria);
  }

  /**
   * Get all tree items as a flat array for rendering
   */
  getTreeItems(): TreeItem[] {
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
        items.push(treeItem);
        
        // Recursively collect children
        const children = this.yTree.getNodeChildrenFromKey(nodeKey);
        children.forEach((childKey: string) => {
          collectItems(childKey, nodeKey);
        });
      }
    };

    // Start from root children
    const rootChildren = this.yTree.getNodeChildrenFromKey(this.rootNodeId);
    rootChildren.forEach((childKey: string) => {
      collectItems(childKey, this.rootNodeId);
    });

    return items;
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
   * Get the underlying YMap instance
   */
  getYMap(): Y.Map<any> {
    return this.yMap;
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    // YTree and YMap are cleaned up by the Y.Doc destruction
    console.log('🧹 FileTreeManager destroyed');
  }
}
