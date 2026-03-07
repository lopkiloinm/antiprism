import * as Y from 'yjs';
import { IndexeddbPersistence } from 'y-indexeddb';
import { UserTreeManager } from './userTreeManager';

export interface UserInfo {
  id: string;
  email?: string;
  name?: string;
  createdAt: number;
  lastLogin: number;
  preferences: {
    theme: 'dark' | 'light';
    defaultModel: string;
    showHiddenFiles: boolean;
  };
}

/**
 * Singleton UserManager for user identification and global workspace management
 * Provides centralized access to user data and workspace operations
 */
export class UserManager {
  private static instance: UserManager | null = null;
  private currentUser: UserInfo | null = null;
  private userDoc: Y.Doc | null = null;
  private persistence: IndexeddbPersistence | null = null;
  private userTreeManager: UserTreeManager | null = null;
  private isInitialized = false;

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): UserManager {
    if (!UserManager.instance) {
      UserManager.instance = new UserManager();
    }
    return UserManager.instance;
  }

  /**
   * Initialize user system and get current user
   */
  async initializeUser(): Promise<UserInfo> {
    if (this.isInitialized && this.currentUser) {
      return this.currentUser;
    }

    try {
      // Get or create user
      this.currentUser = await this.getOrCreateUser();
      
      // Initialize user document
      await this.initializeUserDocument();
      
      // Initialize user tree manager
      await this.initializeUserTreeManager();
      
      this.isInitialized = true;
      console.log('👤 UserManager initialized for user:', this.currentUser.id);
      
      return this.currentUser;
    } catch (error) {
      console.error('🚨 Failed to initialize UserManager:', error);
      throw error;
    }
  }

  /**
   * Get current user (must be initialized first)
   */
  getCurrentUser(): UserInfo {
    if (!this.currentUser) {
      throw new Error('UserManager not initialized. Call initializeUser() first.');
    }
    return this.currentUser;
  }

  /**
   * Get user's tree manager
   */
  getUserTreeManager(): UserTreeManager {
    if (!this.userTreeManager) {
      throw new Error('User tree manager not initialized');
    }
    return this.userTreeManager;
  }

  /**
   * Get user's YJS document
   */
  getUserDoc(): Y.Doc {
    if (!this.userDoc) {
      throw new Error('User document not initialized');
    }
    return this.userDoc;
  }

  /**
   * Update user preferences
   */
  async updatePreferences(updates: Partial<UserInfo['preferences']>): Promise<void> {
    if (!this.currentUser) return;

    this.currentUser.preferences = {
      ...this.currentUser.preferences,
      ...updates
    };

    await this.saveUser();
    console.log('👤 Updated user preferences:', updates);
  }

  /**
   * Update user login time
   */
  async updateLoginTime(): Promise<void> {
    if (!this.currentUser) return;

    this.currentUser.lastLogin = Date.now();
    await this.saveUser();
  }

  /**
   * Create a new project in the user's tree
   */
  async createProjectInUserTree(projectId: string, projectName: string): Promise<void> {
    if (!this.userTreeManager) {
      throw new Error('User tree manager not initialized');
    }

    await this.userTreeManager.whenReady();
    this.userTreeManager.addProject(projectId, projectName);
    console.log('📁 Added project to user tree:', projectName);
  }

  /**
   * Remove a project from the user's tree
   */
  async removeProjectFromUserTree(projectId: string): Promise<void> {
    if (!this.userTreeManager) {
      throw new Error('User tree manager not initialized');
    }

    await this.userTreeManager.whenReady();
    this.userTreeManager.removeProject(projectId);
    console.log('🗑️ Removed project from user tree:', projectId);
  }

  /**
   * Update project access time
   */
  async updateProjectAccess(projectId: string): Promise<void> {
    if (!this.userTreeManager) {
      return;
    }

    await this.userTreeManager.whenReady();
    this.userTreeManager.updateProjectAccess(projectId);
  }

  /**
   * Get all user projects
   */
  async getUserProjects(): Promise<any[]> {
    if (!this.userTreeManager) {
      return [];
    }

    await this.userTreeManager.whenReady();
    return this.userTreeManager.getUserProjects();
  }

  /**
   * Register project managers for a project
   */
  registerProjectManagers(projectId: string, fileTreeManager: any, chatTreeManager: any, gitManager?: any): void {
    if (this.userTreeManager) {
      this.userTreeManager.registerProjectManagers(projectId, {
        fileTreeManager,
        chatTreeManager,
        gitManager
      });
    }
  }

  /**
   * Get project managers for a project
   */
  getProjectManagers(projectId: string): {
    fileTreeManager?: any;
    chatTreeManager?: any;
    gitManager?: any;
  } {
    if (this.userTreeManager) {
      return this.userTreeManager.getProjectManagers(projectId);
    }
    return {};
  }

  /**
   * Get existing user from localStorage or create new one
   */
  private async getOrCreateUser(): Promise<UserInfo> {
    // Try to get existing user
    const storedUser = this.getStoredUser();
    
    if (storedUser) {
      console.log('👤 Found existing user:', storedUser.id);
      return { ...storedUser, lastLogin: Date.now() };
    }

    // Create new user
    const newUser = this.createNewUser();
    console.log('👤 Created new user:', newUser.id);
    return newUser;
  }

  /**
   * Initialize user's YJS document and persistence
   */
  private async initializeUserDocument(): Promise<void> {
    if (!this.currentUser) {
      throw new Error('Cannot initialize user document without current user');
    }

    // Create YJS document for user data
    this.userDoc = new Y.Doc();
    
    // Initialize persistence
    const docName = `antiprism-user-${this.currentUser.id}`;
    this.persistence = new IndexeddbPersistence(docName, this.userDoc);

    // Wait for persistence to load
    await new Promise<void>((resolve, reject) => {
      let loaded = false;
      const timeout = setTimeout(() => {
        if (!loaded) {
          console.warn('⏰ User document persistence timeout, proceeding anyway');
          resolve();
        }
      }, 5000);

      this.persistence!.on('synced', () => {
        console.log('🔄 User document synced');
        if (!loaded) {
          loaded = true;
          clearTimeout(timeout);
          resolve();
        }
      });

      this.persistence!.on('load', () => {
        console.log('📥 User document loaded from IndexedDB');
        if (!loaded) {
          loaded = true;
          clearTimeout(timeout);
          resolve();
        }
      });
    });

    console.log('📄 User document initialized:', docName);
  }

  /**
   * Initialize user tree manager
   */
  private async initializeUserTreeManager(): Promise<void> {
    if (!this.userDoc || !this.currentUser) {
      throw new Error('Cannot initialize user tree manager without user document');
    }

    // Create user tree map
    const userTreeMap = this.userDoc.getMap('user-tree');
    
    // Create UserTreeManager
    this.userTreeManager = new UserTreeManager(userTreeMap, this.currentUser.id);
    
    // Wait for tree manager to be ready
    await this.userTreeManager.whenReady();
    
    console.log('🌳 User tree manager initialized');
  }

  /**
   * Create a new user
   */
  private createNewUser(): UserInfo {
    const userId = this.generateUserId();
    return {
      id: userId,
      createdAt: Date.now(),
      lastLogin: Date.now(),
      preferences: {
        theme: 'dark',
        defaultModel: 'gpt-4o-mini',
        showHiddenFiles: false
      }
    };
  }

  /**
   * Generate a unique user ID
   */
  private generateUserId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return `user-${crypto.randomUUID()}`;
    }
    return `user-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  }

  /**
   * Get stored user from localStorage
   */
  private getStoredUser(): UserInfo | null {
    if (typeof window === 'undefined') return null;
    
    try {
      const stored = localStorage.getItem('antiprism-user');
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.warn('Failed to load stored user:', error);
      return null;
    }
  }

  /**
   * Save user to localStorage
   */
  private async saveUser(): Promise<void> {
    if (!this.currentUser || typeof window === 'undefined') return;
    
    try {
      localStorage.setItem('antiprism-user', JSON.stringify(this.currentUser));
    } catch (error) {
      console.warn('Failed to save user to localStorage:', error);
    }
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    if (this.persistence) {
      this.persistence.destroy();
      this.persistence = null;
    }
    if (this.userDoc) {
      this.userDoc.destroy();
      this.userDoc = null;
    }
    this.userTreeManager = null;
    this.currentUser = null;
    this.isInitialized = false;
    console.log('👤 UserManager cleaned up');
  }
}
