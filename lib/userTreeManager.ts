import * as Y from 'yjs';
// @ts-ignore - yjs-orderedtree types are not properly resolved
import { checkForYTree, YTree } from 'yjs-orderedtree';
import './yjsOrderedTreePatch';
import { IndexeddbPersistence } from 'y-indexeddb';
import { FileTreeManager } from './fileTreeManager';
import { ChatTreeManager } from './chatTreeManager';

export interface UserProjectNode {
  id: string;
  name: string;
  createdAt: number;
  lastAccessed: number;
  type: 'project';
  children: string[];
}

export interface UserNodeValue {
  name: string;
  createdAt: number;
  type: 'user-root' | 'project';
  children: string[];
  // Project-specific data
  projectId?: string;
  lastAccessed?: number;
}

export type UserSortCriteria = 'name-asc' | 'name-desc' | 'created' | 'accessed';

/**
 * Manages the user's root tree containing all projects using yjs-orderedtree
 * Each project node contains references to project-specific managers
 */
export class UserTreeManager {
  private yTree: YTree;
  private rootNodeId: string;
  private yMap: Y.Map<any>;
  private userId: string;

  // Project managers cache for quick access
  private projectManagers: Map<string, {
    fileTreeManager: any;
    chatTreeManager: any;
    gitManager?: any;
  }> = new Map();

  constructor(yMap: Y.Map<any>, userId: string) {
    if (!yMap) {
      console.error('🚨 UserTreeManager constructor: yMap is undefined!');
      throw new Error('UserTreeManager requires a valid Y.Map');
    }
    
    console.log('👤 UserTreeManager constructor received yMap:', yMap);
    this.yMap = yMap;
    this.userId = userId;
    console.log('👤 UserTreeManager constructor: yMap set successfully');
    
    // Initialize YTree using yjs-orderedtree API
    if (checkForYTree(yMap)) {
      console.log('👤 Loading existing user tree');
      this.yTree = new YTree(yMap);
    } else {
      console.log('👤 Creating new user tree');
      this.yTree = new YTree(yMap);
      this.initializeRoot();
    }
    
    // Get root node (should always exist after initialization)
    const rootChildren = this.yTree.getNodeChildrenFromKey("root");
    this.rootNodeId = rootChildren[0] || this.createRootNode();
    
    console.log('👤 UserTreeManager root node ID:', this.rootNodeId);
    
    console.log('👤 UserTreeManager initialized with yjs-orderedtree');
  }

  private initializeRoot(): void {
    const rootNodeKey = this.yTree.generateNodeKey();
    this.yTree.createNode("root", rootNodeKey, {
      name: "User Root",
      createdAt: Date.now(),
      type: "user-root",
      children: []
    });
    console.log('👤 Created user root node:', rootNodeKey);
  }

  private createRootNode(): string {
    const rootNodeKey = this.yTree.generateNodeKey();
    this.yTree.createNode("root", rootNodeKey, {
      name: "User Root", 
      createdAt: Date.now(),
      type: "user-root",
      children: []
    });
    console.log('👤 Created user root node:', rootNodeKey);
    return rootNodeKey;
  }

  /**
   * Wait for persistence to load (deprecated, returns immediately)
   */
  async whenReady(): Promise<void> {
    return Promise.resolve();
  }

  /**
   * Add a new project to the user's tree using yjs-orderedtree
   */
  addProject(projectId: string, projectName: string): string {
    if (!this.yTree) {
      throw new Error('UserTreeManager not initialized. Call whenReady() first.');
    }
    
    // Check if project already exists
    if (this.findProjectNode(projectId)) {
      console.warn('⚠️ Project already exists in user tree:', projectId);
      return this.findProjectNode(projectId)!;
    }
    
    // Use YTree's generateNodeKey() from yjs-orderedtree
    const projectNodeId = this.yTree.generateNodeKey();
    
    const projectNode: UserNodeValue = {
      name: projectName,
      createdAt: Date.now(),
      type: 'project',
      children: [],
      projectId,
      lastAccessed: Date.now()
    };
    
    console.log('🌱 Adding project node with key:', projectNodeId, 'data:', projectNode);
    
    // Use YTree's createNode() from yjs-orderedtree
    this.yTree.createNode(this.rootNodeId, projectNodeId, projectNode);
    
    // Use YTree's setNodeOrderToStart() from yjs-orderedtree
    this.yTree.setNodeOrderToStart(projectNodeId);
    
    console.log('📁 Added project to user tree:', projectName);
    return projectNodeId;
  }

  /**
   * Remove a project from the user's tree using yjs-orderedtree
   */
  removeProject(projectId: string): void {
    try {
      const projectNodeKey = this.findProjectNode(projectId);
      if (projectNodeKey) {
        // Use YTree's deleteNodeAndDescendants() from yjs-orderedtree
        this.yTree.deleteNodeAndDescendants(projectNodeKey);
        
        // Clean up project managers
        this.projectManagers.delete(projectId);
        
        console.log('🗑️ Removed project from user tree:', projectId);
      } else {
        console.warn('⚠️ Project not found in user tree:', projectId);
      }
    } catch (error) {
      console.error('🚨 Failed to remove project:', projectId, error);
      throw error;
    }
  }

  /**
   * Update project metadata using yjs-orderedtree
   */
  updateProject(projectId: string, updates: Partial<UserProjectNode>): void {
    try {
      const projectNodeKey = this.findProjectNode(projectId);
      if (!projectNodeKey) {
        console.warn('⚠️ Project not found for update:', projectId);
        return;
      }

      const existingProject = this.yTree.getNodeValueFromKey(projectNodeKey);
      if (!existingProject) return;

      const updatedProject: UserNodeValue = {
        ...(existingProject as UserNodeValue),
        ...updates,
        lastAccessed: Date.now()
      };

      // Use YTree's setNodeValueFromKey() from yjs-orderedtree
      this.yTree.setNodeValueFromKey(projectNodeKey, updatedProject);
      console.log('✏️ Updated project:', projectId);
    } catch (error) {
      console.error('🚨 Failed to update project:', projectId, error);
      throw error;
    }
  }

  /**
   * Get all user projects using yjs-orderedtree
   */
  getUserProjects(): UserProjectNode[] {
    const items: UserProjectNode[] = [];
    
    const collectProjects = (nodeKey: string): void => {
      const value = this.yTree.getNodeValueFromKey(nodeKey);
      if (value && (value as UserNodeValue).type === 'project') {
        const projectData = value as UserNodeValue;
        const projectNode: UserProjectNode = {
          id: projectData.projectId!,
          name: projectData.name,
          createdAt: projectData.createdAt,
          lastAccessed: projectData.lastAccessed || projectData.createdAt,
          type: 'project',
          children: this.yTree.getNodeChildrenFromKey(nodeKey)
        };
        items.push(projectNode);
      }
    };

    // Use YTree's getNodeChildrenFromKey() and sortChildrenByOrder() from yjs-orderedtree
    const rootChildren = this.yTree.getNodeChildrenFromKey(this.rootNodeId);
    const sortedChildren = this.yTree.sortChildrenByOrder(rootChildren, this.rootNodeId);
    
    // Collect all projects
    sortedChildren.forEach((childKey: string) => {
      collectProjects(childKey);
    });

    return items;
  }

  /**
   * Update project access time
   */
  updateProjectAccess(projectId: string): void {
    this.updateProject(projectId, { lastAccessed: Date.now() });
  }

  /**
   * Find a project node by project ID using yjs-orderedtree
   */
  private findProjectNode(projectId: string): string | null {
    // Use YTree's getNodeChildrenFromKey() from yjs-orderedtree
    const rootChildren = this.yTree.getNodeChildrenFromKey(this.rootNodeId);
    
    for (const childKey of rootChildren) {
      const value = this.yTree.getNodeValueFromKey(childKey);
      if (value && (value as UserNodeValue).projectId === projectId) {
        return childKey;
      }
    }
    
    return null;
  }

  /**
   * Register project managers for a project
   */
  registerProjectManagers(projectId: string, managers: {
    fileTreeManager: any;
    chatTreeManager: any;
    gitManager?: any;
  }): void {
    this.projectManagers.set(projectId, managers);
    console.log('📋 Registered managers for project:', projectId);
  }

  /**
   * Get project managers for a project
   */
  getProjectManagers(projectId: string): {
    fileTreeManager?: any;
    chatTreeManager?: any;
    gitManager?: any;
  } {
    return this.projectManagers.get(projectId) || {};
  }

  /**
   * Clear all projects (for testing/reset)
   */
  clearAllProjects(): void {
    const projects = this.getUserProjects();
    projects.forEach(project => {
      this.removeProject(project.id);
    });
    console.log('🗑️ Cleared all projects from user tree');
  }
}
