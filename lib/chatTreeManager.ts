import * as Y from 'yjs';
// @ts-ignore - yjs-orderedtree types are not properly resolved
import { checkForYTree, YTree } from 'yjs-orderedtree';
import './yjsOrderedTreePatch';
import type { ChatSession } from './chatStore';

export interface ChatTreeItem extends ChatSession {
  id: string;
  children: string[]; // Empty for flat structure, but required by YTree
}

export interface ChatNodeValue {
  title: string;
  createdAt: number;
  modelId: string;
  children: string[];
}

export type SortCriteria = 'title-asc' | 'title-desc' | 'created' | 'created-oldest' | 'model';

/**
 * Manages chat tree using YJS Ordered Tree (matching FileTreeManager pattern exactly)
 */
export class ChatTreeManager {
  private yTree: YTree;
  private rootNodeId: string;
  private yMap: Y.Map<any>;
  private projectId: string;
  private whenLoaded: Promise<void>;

  constructor(yMap: Y.Map<any>, projectId: string) {
    // Ensure yMap is properly set (matching FileTreeManager pattern exactly)
    if (!yMap) {
      console.error('🚨 ChatTreeManager constructor: yMap is undefined!');
      throw new Error('ChatTreeManager requires a valid Y.Map');
    }
    
    console.log('🌳 ChatTreeManager constructor received yMap:', yMap);
    console.log('🌳 yMap type:', typeof yMap);
    console.log('🌳 yMap constructor:', yMap.constructor.name);
    console.log('🌳 yMap has set method:', typeof yMap.set);
    console.log('🌳 yMap has get method:', typeof yMap.get);
    
    this.yMap = yMap;
    this.projectId = projectId;
    console.log('🌳 ChatTreeManager constructor: yMap set successfully');
    
    // Initialize YTree - check if it exists first (matching FileTreeManager pattern exactly)
    if (checkForYTree(yMap)) {
      console.log('🌳 Loading existing chat tree');
      this.yTree = new YTree(yMap);
    } else {
      console.log('🌳 Creating new chat tree');
      this.yTree = new YTree(yMap);
      this.initializeRoot();
    }
    
    // Get root node (should always exist after initialization)
    // 🎯 CRITICAL: Use the actual YTree root, not hardcoded "root"
    const rootChildren = this.yTree.getNodeChildrenFromKey("root");
    this.rootNodeId = rootChildren[0] || this.createRootNode();
    
    // Validate the root node actually exists
    if (!this.rootNodeId || !this.yTree.getNodeValueFromKey(this.rootNodeId)) {
      console.warn('🌳 Root node validation failed, creating new one');
      this.rootNodeId = this.createRootNode();
    }
    
    console.log('🌳 ChatTreeManager root node ID:', this.rootNodeId);
    
    // Create promise for when tree is ready (no separate persistence needed)
    this.whenLoaded = new Promise<void>((resolve) => {
      // Tree is ready immediately since we're not waiting for persistence
      console.log(`� Chat tree ready for project: ${projectId}`);
      resolve();
    });
    
    console.log('🌳 ChatTreeManager initialized with yjs-orderedtree (relying on WebRTC provider persistence)');
  }

  private initializeRoot(): void {
    const rootNodeKey = this.yTree.generateNodeKey();
    this.yTree.createNode("root", rootNodeKey, {
      title: "Chat Root",
      createdAt: Date.now(),
      modelId: '',
      children: []
    });
    console.log('🌳 Created chat root node:', rootNodeKey);
  }

  private createRootNode(): string {
    try {
      // 🎯 Check if root already exists before creating (WebRTC sync safety)
      const existingRootChildren = this.yTree.getNodeChildrenFromKey("root");
      if (existingRootChildren.length > 0) {
        const existingRoot = existingRootChildren[0];
        const rootValue = this.yTree.getNodeValueFromKey(existingRoot);
        if (rootValue && rootValue.title === "Chat Root") {
          console.log('🌳 Found existing chat root node:', existingRoot);
          return existingRoot;
        }
      }
      
      const rootNodeKey = this.yTree.generateNodeKey();
      this.yTree.createNode("root", rootNodeKey, {
        title: "Chat Root", 
        createdAt: Date.now(),
        modelId: '',
        children: []
      });
      console.log('🌳 Created new chat root node:', rootNodeKey);
      return rootNodeKey;
    } catch (error) {
      console.error('🚨 Error creating chat root node:', error);
      // Fallback: try to get any existing root
      const existingRootChildren = this.yTree.getNodeChildrenFromKey("root");
      if (existingRootChildren.length > 0) {
        return existingRootChildren[0];
      }
      throw new Error('Failed to create or find chat root node');
    }
  }

  /**
   * Get the Y.Doc for collaboration
   */
  getYDoc(): Y.Doc {
    return this.yMap.doc!;
  }

  /**
   * Wait for persistence to load
   */
  async whenReady(): Promise<void> {
    return this.whenLoaded;
  }

  /**
   * Create a new chat session
   */
  createChat(chatData: Omit<ChatNodeValue, 'children'>): string {
    if (!this.yTree) {
      throw new Error('ChatTreeManager not initialized. Call whenReady() first.');
    }
    
    // Ensure root node exists before creating chats
    if (!this.rootNodeId || !this.yTree.getNodeValueFromKey(this.rootNodeId)) {
      console.warn('🌳 Root node missing, reinitializing...');
      this.rootNodeId = this.createRootNode();
    }
    
    // Use YTree's built-in key generation to avoid conflicts
    const nodeId = this.yTree.generateNodeKey();
    
    const chatItem: ChatNodeValue = {
      ...chatData,
      children: [] // Flat structure - no children
    };
    
    console.log('🌱 Creating chat node with key:', nodeId, 'data:', chatItem);
    
    // Create the chat node
    this.yTree.createNode(this.rootNodeId, nodeId, chatItem);
    
    // Position the new chat correctly based on existing order
    this.positionNewChat(nodeId);
    
    console.log('💬 Created chat node:', chatData.title);
    return nodeId;
  }

  /**
   * Delete a chat session
   */
  deleteChat(chatId: string): void {
    // Validate root node exists before operation
    if (!this.rootNodeId || !this.yTree.getNodeValueFromKey(this.rootNodeId)) {
      console.warn('🌳 Root node invalid in deleteChat, cannot delete');
      return;
    }
    
    try {
      this.yTree.deleteNodeAndDescendants(chatId);
      console.log('🗑️ Deleted chat:', chatId);
    } catch (error) {
      console.error('🚨 Failed to delete chat:', chatId, error);
      throw error;
    }
  }

  /**
   * Update chat session data
   */
  updateChat(chatId: string, updates: Partial<ChatTreeItem>): void {
    try {
      const existingChat = this.yTree.getNodeValueFromKey(chatId);
      if (!existingChat) {
        console.warn('⚠️ Chat not found for update:', chatId);
        return;
      }

      const updatedChat: ChatNodeValue = {
        ...(existingChat as ChatNodeValue),
        ...updates,
        children: [] // Keep flat structure
      };

      this.yTree.setNodeValueFromKey(chatId, updatedChat);
      console.log('✏️ Updated chat:', chatId);
    } catch (error) {
      console.error('🚨 Failed to update chat:', chatId, error);
      throw error;
    }
  }

  /**
   * Get all chat tree items (matching FileTreeManager.getTreeItems pattern exactly)
   */
  getTreeItems(): ChatTreeItem[] {
    const items: ChatTreeItem[] = [];
    
    // 🎯 CRITICAL: Validate root node exists before accessing children
    if (!this.rootNodeId || !this.yTree.getNodeValueFromKey(this.rootNodeId)) {
      console.warn('🌳 Root node invalid in getTreeItems, reinitializing...');
      this.rootNodeId = this.createRootNode();
      return []; // Return empty for new project
    }
    
    const collectItems = (nodeKey: string, parentKey?: string): void => {
      const value = this.yTree.getNodeValueFromKey(nodeKey);
      if (value && nodeKey !== this.rootNodeId) {
        // Create ChatTreeItem with YTree-managed properties
        const treeItem: ChatTreeItem = {
          ...(value as ChatNodeValue),
          id: nodeKey,
          children: this.yTree.getNodeChildrenFromKey(nodeKey)
        };
        items.push(treeItem);
      }
    };

    // Get all root children (all chats in flat structure)
    const rootChildren = this.yTree.getNodeChildrenFromKey(this.rootNodeId);
    const sortedChildren = this.yTree.sortChildrenByOrder(rootChildren, this.rootNodeId);
    
    // Collect all chat items
    sortedChildren.forEach((childKey: string) => {
      collectItems(childKey, this.rootNodeId);
    });

    return items;
  }

  /**
   * Sort tree items using yjs-orderedtree API (matching FileTreeManager.sortTreeItems pattern exactly)
   */
  sortTreeItems(criteria: SortCriteria): void {
    console.log('🔄 Sorting chats by:', criteria);
    
    const allChats = this.getTreeItems();
    
    if (allChats.length === 0) {
      console.log('📝 No chats to sort');
      return;
    }
    
    // Sort chats based on criteria
    const sortedChats = this.sortChatsByCriteria(allChats, criteria);
    
    // Apply ordering using yjs-orderedtree positioning functions
    this.applyOrdering(sortedChats);
    
    console.log('✅ Sorted chats by', criteria);
  }

  /**
   * Sort chats by specific criteria
   */
  private sortChatsByCriteria(chats: ChatTreeItem[], criteria: SortCriteria): ChatTreeItem[] {
    return [...chats].sort((a, b) => {
      switch (criteria) {
        case 'title-asc':
          return a.title.localeCompare(b.title);
        case 'title-desc':
          return b.title.localeCompare(a.title);
        case 'created':
          return b.createdAt - a.createdAt; // Most recent first
        case 'created-oldest':
          return a.createdAt - b.createdAt; // Oldest first
        default:
          return 0;
      }
    });
  }

  /**
   * Apply ordering using yjs-orderedtree positioning functions
   */
  private applyOrdering(sortedChats: ChatTreeItem[]): void {
    sortedChats.forEach((chat: ChatTreeItem, index: number) => {
      if (index === 0) {
        // First chat goes to start
        this.yTree.setNodeOrderToStart(chat.id);
      } else {
        // Each subsequent chat goes after the previous one
        const previousChat = sortedChats[index - 1];
        this.yTree.setNodeAfter(chat.id, previousChat.id);
      }
    });
  }

  /**
   * Position a new chat correctly based on existing order (matching FileTreeManager.positionNewNode pattern exactly)
   */
  private positionNewChat(nodeId: string): void {
    const siblings = this.yTree.getNodeChildrenFromKey(this.rootNodeId);
    const sortedSiblings = this.yTree.sortChildrenByOrder(siblings, this.rootNodeId);
    
    // Get sibling metadata to determine correct position
    const siblingItems = sortedSiblings
      .filter((id: string) => id !== nodeId) // Exclude the new node
      .map((id: string) => ({
        id,
        value: this.yTree.getNodeValueFromKey(id)
      }))
      .filter((item: any) => item.value); // Only existing nodes
    
    // Find the correct position based on current sorted order
    let insertAfter: string | null = null;
    
    for (const sibling of siblingItems) {
      // Compare with the new chat to find where it should go
      const newChatValue = this.yTree.getNodeValueFromKey(nodeId);
      if (!newChatValue) break;
      
      // Use the same comparison logic as the UI sorting
      const shouldComeBefore = this.compareChats(newChatValue, sibling.value, 'created'); // Default to created sort
      
      if (shouldComeBefore) {
        break;
      }
      
      insertAfter = sibling.id;
    }
    
    // Apply the positioning using yjs-orderedtree API
    if (insertAfter) {
      this.yTree.setNodeAfter(nodeId, insertAfter);
      console.log('📍 Positioned new chat after:', insertAfter, nodeId);
    } else {
      this.yTree.setNodeOrderToStart(nodeId);
      console.log('📍 Positioned new chat at start:', nodeId);
    }
  }
  
  /**
   * Compare two chats based on sort criteria
   */
  private compareChats(chat1: ChatNodeValue, chat2: ChatNodeValue, sortBy: SortCriteria): boolean {
    switch (sortBy) {
      case 'title-asc':
        return chat1.title.toLowerCase() < chat2.title.toLowerCase();
      case 'title-desc':
        return chat1.title.toLowerCase() > chat2.title.toLowerCase();
      case 'created':
        return chat1.createdAt > chat2.createdAt; // Most recent first
      case 'model':
        return chat1.modelId < chat2.modelId;
      default:
        return chat1.createdAt > chat2.createdAt;
    }
  }

  /**
   * Get chat by ID
   */
  getChat(chatId: string): ChatTreeItem | null {
    if (!this.yTree) {
      console.warn('ChatTreeManager not initialized, cannot get chat');
      return null;
    }
    
    const chat = this.yTree.getNodeValueFromKey(chatId);
    if (!chat || chatId === this.rootNodeId) {
      return null;
    }
    
    return {
      ...(chat as ChatNodeValue),
      id: chatId,
      children: this.yTree.getNodeChildrenFromKey(chatId)
    };
  }

  /**
   * Clear all chats (for testing/reset)
   */
  clearAllChats(): void {
    const chats = this.getTreeItems();
    chats.forEach(chat => {
      this.yTree.deleteNodeAndDescendants(chat.id);
    });
    console.log('🗑️ Cleared all chats');
  }
}
