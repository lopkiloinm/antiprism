import * as Y from 'yjs';
// @ts-ignore - yjs-orderedtree types are not properly resolved
import { checkForYTree, YTree } from 'yjs-orderedtree';

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
  private yTree: YTree;
  private rootNodeId: string = '';
  private yMap: Y.Map<any>;
  private directoryMaps: Map<string, Y.Map<any>> = new Map();
  private directoryDocs: Map<string, Y.Doc> = new Map();
  private isReady: boolean = false; // ✅ Track ready state

  constructor(yMap: Y.Map<any>) {
    // Ensure yMap is properly set
    if (!yMap) {
      console.error('🚨 FileTreeManager constructor: yMap is undefined!');
      throw new Error('FileTreeManager requires a valid Y.Map');
    }
    
    console.log('🌳 FileTreeManager constructor received yMap:', yMap);
    console.log('🌳 yMap type:', typeof yMap);
    console.log('🌳 yMap constructor:', yMap.constructor.name);
    console.log('🌳 yMap has set method:', typeof yMap.set);
    console.log('🌳 yMap has get method:', typeof yMap.get);
    
    this.yMap = yMap;
    console.log('🌳 FileTreeManager constructor: yMap set successfully');
    
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
    
    // ✅ FIXED: Initialize rootNodeId properly for both new and existing trees
    if (rootChildren.length > 0) {
      this.rootNodeId = rootChildren[0]; // Use existing root from loaded tree
      console.log('🌳 Using existing root node from loaded tree:', this.rootNodeId);
    } else {
      // For new trees, initializeRoot should have already set this.rootNodeId
      // If not, create a new root node
      if (!this.rootNodeId) {
        this.rootNodeId = this.createRootNode();
        console.log('🌳 Created new root node:', this.rootNodeId);
      } else {
        console.log('🌳 Using root node ID from initializeRoot:', this.rootNodeId);
      }
    }
    
    console.log('🌳 Final root node ID:', this.rootNodeId);
    console.log('🌳 Root children found:', rootChildren.length);
    
    // Initialize directory maps for existing directories
    this.initializeDirectoryMaps();
    
    // ✅ Set ready state when initialization is complete
    this.isReady = true;
    console.log('🌳 FileTreeManager is ready!');
  }

  private initializeRoot(): void {
    const rootNodeKey = this.yTree.generateNodeKey();
    this.yTree.createNode("root", rootNodeKey, {
      type: "project",
      name: "root",
      created: Date.now(),
    });
    // ✅ FIXED: Store the root node ID so it's available later
    this.rootNodeId = rootNodeKey;
    console.log('🌳 Initialized root node with ID:', rootNodeKey);
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
    
    console.log(`🗂️ Initialized ${this.directoryMaps.size} directory maps`);
  }

  /**
   * Get or create a Y.Map for a directory (following yjs-orderedtree API)
   */
  private getOrCreateDirectoryMap(directoryPath: string): Y.Map<any> {
    console.log(`🗂️ getOrCreateDirectoryMap called for: ${directoryPath}`);
    console.log(`🗂️ this.yMap exists: ${!!this.yMap}`);
    
    // Check if already exists
    if (this.directoryMaps.has(directoryPath)) {
      console.log(`🗂️ Directory map already exists for: ${directoryPath}`);
      return this.directoryMaps.get(directoryPath)!;
    }
    
    // Create new Y.Doc for this directory (required by yjs-orderedtree)
    const directoryDoc = new Y.Doc();
    const directoryMapId = `directory-${directoryPath.replace(/\//g, '-')}`;
    
    // Create Y.Map bound to the document (following yjs-orderedtree pattern)
    const directoryMap = directoryDoc.getMap(directoryMapId);
    
    console.log(`🗂️ Created new directory map bound to Y.Doc with ID: ${directoryMapId}`);
    
    // Don't store directory map metadata in main yMap to avoid conflicts with yjs-orderedtree
    // The directory maps are stored locally in the directoryMaps Map
    console.log(`�️ Created directory map for: ${directoryPath}`);
    
    // Initialize YTree for this directory (following yjs-orderedtree API)
    if (!checkForYTree(directoryMap)) {
      console.log(`🗂️ Initializing YTree for directory: ${directoryPath}`);
      try {
        const directoryYTree = new YTree(directoryMap);
        const rootNodeKey = directoryYTree.generateNodeKey();
        directoryYTree.createNode("root", rootNodeKey, {
          type: "directory",
          path: directoryPath,
          name: directoryPath.split('/').pop() || 'root',
          created: Date.now(),
        });
        
        console.log(`📁 Created YTree structure for directory: ${directoryPath}`);
      } catch (ytreeError) {
        console.error('🚨 Failed to create YTree structure:', ytreeError);
        // Don't throw - the directory map itself was created successfully
        // The YTree can be initialized later when needed
      }
    }
    
    // Cache the directory map and document
    this.directoryMaps.set(directoryPath, directoryMap);
    this.directoryDocs.set(directoryPath, directoryDoc);
    console.log(`🗂️ Cached directory map and document for: ${directoryPath}`);
    
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
   * Get the Y.Doc for a directory (for WebRTC provider setup)
   */
  getDirectoryDoc(directoryPath: string): Y.Doc | null {
    return this.directoryDocs.get(directoryPath) || null;
  }

  /**
   * Get the Y.Map for a directory's contents
   */
  getDirectoryMap(directoryPath: string): Y.Map<any> | null {
    return this.directoryMaps.get(directoryPath) || null;
  }

  /**
   * Get all directory maps
   */
  getAllDirectoryMaps(): Map<string, Y.Map<any>> {
    return new Map(this.directoryMaps);
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
          // Create missing directory
          const dirNodeId = this.yTree.generateNodeKey();
          
          const dirMetadata = {
            path: pathParts.slice(0, i + 1).join('/'), // Relative path within project
            name: dirName,
            size: 0,
            mimeType: 'folder',
            type: 'folder' as const, // ✅ Use 'folder' type
            lastModified: Date.now(),
            transferChannel: 'yjs' as const,
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
      
      // Validate parent exists before creating file
      const parentExists = this.yTree.getNodeValueFromKey(currentParentKey) !== undefined;
      if (!parentExists) {
        console.error('🚨 Cannot create file - parent node does not exist:', currentParentKey);
        throw new Error(`Parent node not found: ${currentParentKey}`);
      }
      
      this.yTree.createNode(currentParentKey, nodeId, fileMetadata);
      
      // Position the new file correctly (folders first, then alphabetical)
      this.positionNewNode(nodeId, currentParentKey, false);

      console.log('📄 Created file node:', metadata.path);
      return nodeId;
    } catch (error) {
      console.error('🚨 Failed to create file:', metadata.path, error);
      throw error;
    }
  }

  /**
   * Create a folder and initialize its directory map
   */
  createFolder(name: string, path: string): string {
    try {
      console.log('🔧 createFolder called with:', { name, path });
      
      const nodeId = this.yTree.generateNodeKey();
      
      // Parse the path to get the directory hierarchy
      const pathParts = path.split('/').filter(Boolean);
      let currentParentKey = this.rootNodeId;
      
      console.log('🔧 Path parts:', pathParts, 'Length:', pathParts.length);
      console.log('🔧 Initial parent key:', currentParentKey);

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
            path: '/' + pathParts.slice(0, i + 1).join('/'),
            name: dirName,
            size: 0,
            mimeType: 'folder',
            type: 'folder' as const, // ✅ Use 'folder' type
            lastModified: Date.now(),
            transferChannel: 'yjs' as const,
            isFolder: true,
          };
          
          this.yTree.createNode(currentParentKey, dirNodeId, dirMetadata);
          
          currentParentKey = dirNodeId;
          console.log('📁 Created directory node:', dirName);
        }
      }

      console.log('🔧 Final parent key for folder:', currentParentKey);

      // Create the folder node in the correct parent directory
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
      
      console.log('🔧 Creating folder with metadata:', folderMetadata);
      
      // Validate parent exists before creating folder
      const parentExists = this.yTree.getNodeValueFromKey(currentParentKey) !== undefined;
      if (!parentExists) {
        console.error('🚨 Cannot create folder - parent node does not exist:', currentParentKey);
        throw new Error(`Parent node not found: ${currentParentKey}`);
      }
      
      this.yTree.createNode(currentParentKey, nodeId, folderMetadata);
      
      console.log('🔧 Folder created in YTree with node ID:', nodeId, 'under parent:', currentParentKey);
      
      // Position the new folder correctly (folders first, then alphabetical)
      this.positionNewNode(nodeId, currentParentKey, true);

      console.log('📁 Created folder with type:', folderMetadata.type, 'path:', path);

      // Initialize directory map for this folder (with error handling)
      try {
        this.getOrCreateDirectoryMap(path);
        console.log('📁 Successfully initialized directory map for:', path);
      } catch (dirError) {
        console.warn('⚠️ Failed to initialize directory map for folder:', path, dirError);
        // Continue anyway - the folder was created, just without a directory map
      }

      console.log('📁 Created folder node with directory map:', path);
      return nodeId;
    } catch (error) {
      console.error('🚨 Failed to create folder:', path, error);
      throw error;
    }
  }

  /**
   * Delete a node and its descendants
   */
  deleteNode(nodeKey: string): void {
    try {
      // Validate node exists before deleting
      const nodeValue = this.yTree.getNodeValueFromKey(nodeKey);
      if (!nodeValue) {
        console.warn('⚠️ Cannot delete node - node not found:', nodeKey);
        return;
      }
      
      this.yTree.deleteNodeAndDescendants(nodeKey);
      console.log('🗑️ Deleted node:', nodeKey);
    } catch (error) {
      console.error('🚨 Failed to delete node:', nodeKey, error);
    }
  }

  /**
   * Update node value
   */
  updateNodeValue(nodeKey: string, value: Partial<FileMetadata>): void {
    try {
      const currentValue = this.yTree.getNodeValueFromKey(nodeKey);
      if (currentValue) {
        // Validate that the node still exists before updating
        const nodeExists = this.yTree.getNodeValueFromKey(nodeKey) !== undefined;
        if (nodeExists) {
          this.yTree.setNodeValueFromKey(nodeKey, { ...currentValue, ...value });
          console.log('✏️ Updated node value:', nodeKey, value);
        } else {
          console.warn('⚠️ Cannot update node - node no longer exists:', nodeKey);
        }
      } else {
        console.warn('⚠️ Cannot update node - current value not found:', nodeKey);
      }
    } catch (error) {
      console.error('🚨 Failed to update node value:', nodeKey, error);
    }
  }

  /**
   * Move node to new parent
   */
  moveNode(nodeKey: string, newParentKey: string): void {
    try {
      // Validate nodes exist before moving
      const sourceNode = this.yTree.getNodeValueFromKey(nodeKey);
      const targetParent = this.yTree.getNodeValueFromKey(newParentKey);
      
      if (!sourceNode) {
        console.warn('⚠️ Cannot move node - source node not found:', nodeKey);
        return;
      }
      
      if (!targetParent) {
        console.warn('⚠️ Cannot move node - target parent not found:', newParentKey);
        return;
      }
      
      this.yTree.moveChildToParent(nodeKey, newParentKey);
      console.log('📁 Moved node:', nodeKey, 'to parent:', newParentKey);
    } catch (error) {
      console.error('🚨 Failed to move node:', nodeKey, error);
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
    console.log('🗑️ Cleared all items');
  }

  /**
   * Move a node to a new position (for drag & drop)
   */
  moveItem(nodeId: string, targetParentId: string, targetIndex?: number): void {
    try {
      // Validate nodes exist before moving
      const sourceNode = this.yTree.getNodeValueFromKey(nodeId);
      const targetParent = this.yTree.getNodeValueFromKey(targetParentId);
      
      if (!sourceNode) {
        console.warn('⚠️ Cannot move item - source node not found:', nodeId);
        return;
      }
      
      if (!targetParent) {
        console.warn('⚠️ Cannot move item - target parent not found:', targetParentId);
        return;
      }
      
      // Prevent moving a node into itself
      if (nodeId === targetParentId) {
        console.warn('⚠️ Cannot move node into itself:', nodeId);
        return;
      }
      
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
          if (targetNode) {
            this.yTree.setNodeAfter(nodeId, targetNode);
          }
        }
      }
      
      console.log('🔄 Moved node:', nodeId, 'to parent:', targetParentId);
    } catch (error) {
      console.error('🚨 Failed to move node:', nodeId, error);
    }
  }

  /**
   * Sort tree items using yjs-orderedtree API with folder-first ordering
   * Now sorts ALL directory levels, not just root level
   */
  sortTreeItems(criteria: SortCriteria): void {
    console.log('🔄 Sorting ALL directory trees by criteria:', criteria);
    console.log(`📁 Found ${this.directoryMaps.size} directory maps to sort`);
    
    // ✅ Sort the main/root tree
    this.sortSingleTree(this.yTree, criteria, 'root');
    
    // ✅ Sort each directory tree individually
    this.directoryMaps.forEach((directoryMap, directoryPath) => {
      const directoryYTree = new YTree(directoryMap);
      this.sortSingleTree(directoryYTree, criteria, directoryPath);
    });
    
    console.log('✅ Completed sorting all directories');
  }

  /**
   * Sort a single YTree instance with the given criteria
   */
  private sortSingleTree(yTree: YTree, criteria: SortCriteria, treeContext: string): void {
    try {
      // Get all items in this tree
      const items = this.getItemsFromTree(yTree);
      
      if (items.length === 0) {
        console.log(`📁 No items to sort in ${treeContext}`);
        return;
      }
      
      // Group items by parent
      const parentGroups = new Map<string, TreeItem[]>();
      
      items.forEach(item => {
        const parentId = item.parentId || this.rootNodeId;
        if (!parentGroups.has(parentId)) {
          parentGroups.set(parentId, []);
        }
        parentGroups.get(parentId)!.push(item);
      });
      
      // Sort each parent group using folder-first logic
      parentGroups.forEach((items, parentId) => {
        const sortedItems = this.sortItemsWithCriteria(items, criteria);
        this.applyOrderingToTree(yTree, sortedItems, parentId);
      });
      
      console.log(`📁 Sorted ${items.length} items in ${treeContext}`);
    } catch (error) {
      console.error(`❌ Failed to sort tree ${treeContext}:`, error);
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
  private applyOrderingToTree(yTree: YTree, sortedItems: TreeItem[], parentId: string): void {
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
    
    // Get sibling metadata to determine correct position
    const siblingItems = sortedSiblings
      .filter((id: string) => id !== nodeId) // Exclude the new node
      .map((id: string) => ({
        id,
        value: this.yTree.getNodeValueFromKey(id),
        isFolder: this.yTree.getNodeValueFromKey(id)?.isFolder || false
      }))
      .filter((item: any) => item.value); // Only existing nodes
    
    // Find the correct position
    let insertAfter: string | null = null;
    
    for (const sibling of siblingItems) {
      // If this is a file and we're inserting a folder, stop here
      if (isFolder && !sibling.isFolder) {
        break;
      }
      
      // If both are same type, compare names
      if (sibling.isFolder === isFolder) {
        const newNodeName = this.yTree.getNodeValueFromKey(nodeId)?.name || '';
        const siblingName = sibling.value?.name || '';
        
        if (newNodeName < siblingName) {
          break;
        }
      }
      
      insertAfter = sibling.id;
    }
    
    // Apply the positioning
    if (insertAfter) {
      this.yTree.setNodeAfter(nodeId, insertAfter);
    } else {
      this.yTree.setNodeOrderToStart(nodeId);
    }
    
    console.log(`📍 Positioned new ${isFolder ? 'folder' : 'file'} node:`, nodeId);
  }

  
  /**
   * Get all tree items with directory map references
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
    
    // Start from root children in sorted order
    const rootChildren = this.yTree.getNodeChildrenFromKey(this.rootNodeId);
    const sortedRootChildren = this.yTree.sortChildrenByOrder(rootChildren, this.rootNodeId);
    
    console.log('🔍 getTreeItems - Root children:', sortedRootChildren.length);
    sortedRootChildren.forEach((childKey: string) => {
      const value = this.yTree.getNodeValueFromKey(childKey);
      console.log('🔍 Root child:', value?.name, value?.type, value?.isFolder);
      collectItems(childKey, this.rootNodeId);
    });
    
    console.log('🔍 getTreeItems - Total items:', items.length);
    return items;
  }

  /**
   * Get contents of a specific directory using its own Y.Map
   */
  getDirectoryContents(directoryPath: string): TreeItem[] {
    const directoryMap = this.getDirectoryMap(directoryPath);
    if (!directoryMap) {
      console.warn(`Directory map not found for: ${directoryPath}`);
      return [];
    }

    // Create a simple tree structure from the directory map
    const items: TreeItem[] = [];
    
    // Get the YTree from the directory map
    if (checkForYTree(directoryMap)) {
      const directoryYTree = new YTree(directoryMap);
      
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
    if (!directoryMap) {
      throw new Error(`Directory map not found for: ${directoryPath}`);
    }

    // Create YTree for this directory
    const directoryYTree = new YTree(directoryMap);
    
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
    if (!directoryMap) {
      throw new Error(`Directory map not found for: ${parentPath}`);
    }

    // Create YTree for this directory
    const directoryYTree = new YTree(directoryMap);
    
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
    console.log('🧹 FileTreeManager destroyed');
  }
}
