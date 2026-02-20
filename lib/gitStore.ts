// Real Git Storage using IndexedDB
// Stores commits, file snapshots, and change history
import { gitLogger } from "@/lib/logger";

interface GitCommit {
  id: string;
  message: string;
  timestamp: Date;
  files: GitFileSnapshot[];
  author?: string;
  parentIds?: string[];
}

interface GitFileSnapshot {
  path: string;
  content: string;
  timestamp: Date;
  hash: string;
}

interface GitChange {
  path: string;
  status: 'added' | 'modified' | 'deleted' | 'renamed';
  oldContent?: string;
  newContent?: string;
  oldPath?: string; // For renames
}

interface GitRepository {
  name: string;
  commits: GitCommit[];
  currentBranch: string;
  branches: string[];
  headCommitId?: string;
}

class GitStore {
  private dbName = 'GitRepository';
  private storeName = 'repositories';
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    gitLogger.info("GitStore init start", { dbName: this.dbName, storeName: this.storeName });
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);
      
      request.onerror = () => {
        gitLogger.error("GitStore init failed", { error: String(request.error) });
        reject(request.error);
      };
      request.onsuccess = () => {
        this.db = request.result;
        gitLogger.info("GitStore init success", {
          dbName: this.dbName,
          objectStores: Array.from(this.db.objectStoreNames),
        });
        resolve();
      };
      
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'name' });
          store.createIndex('timestamp', 'timestamp');
        }
      };
    });
  }

  async createRepository(name: string): Promise<void> {
    console.log(`🔍 GitStore.createRepository called with name: "${name}"`);
    gitLogger.info("createRepository called", { name });
    if (!this.db) await this.init();
    
    // Check if repository already exists
    const existingRepo = await this.getRepository(name);
    console.log(`🔍 GitStore.createRepository - existing repo:`, existingRepo ? 'found' : 'not found');
    if (existingRepo) {
      console.log(`Repository ${name} already exists, skipping creation`);
      gitLogger.info("createRepository skipped; already exists", { name });
      return;
    }
    
    console.log(`🔍 GitStore.createRepository - creating new repository: ${name}`);
    return new Promise((resolve, reject) => {
      const repository: GitRepository = {
        name,
        commits: [],
        currentBranch: 'main',
        branches: ['main'],
      };
      
      const tx = this.db!.transaction([this.storeName], 'readwrite');
      const store = tx.objectStore(this.storeName);
      const request = store.put(repository);
      
      request.onerror = () => {
        gitLogger.error("createRepository put failed", { name, error: String(request.error) });
        reject(request.error);
      };
      request.onsuccess = () => {
        gitLogger.info("createRepository success", { name });
        resolve();
      };
      
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async getAllRepositories(): Promise<GitRepository[]> {
    if (!this.db) await this.init();
    gitLogger.info("getAllRepositories called");
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();
      
      request.onerror = () => {
        gitLogger.error("getAllRepositories failed", { error: String(request.error) });
        reject(request.error);
      };
      request.onsuccess = () => {
        gitLogger.info("getAllRepositories success", { count: request.result?.length ?? 0 });
        resolve(request.result || []);
      };
    });
  }

  async getRepository(name: string): Promise<GitRepository | null> {
    if (!this.db) await this.init();
    gitLogger.info("getRepository called", { name });
    
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction([this.storeName], 'readonly');
      const store = tx.objectStore(this.storeName);
      const request = store.get(name);
      
      request.onerror = () => {
        gitLogger.error("getRepository failed", { name, error: String(request.error) });
        reject(request.error);
      };
      request.onsuccess = () => {
        const result = request.result;
        gitLogger.info("getRepository success", {
          name,
          found: !!result,
          commitCount: result?.commits?.length ?? 0,
          branchCount: result?.branches?.length ?? 0,
          currentBranch: result?.currentBranch,
        });
        resolve(result || null);
      };
      
      tx.oncomplete = () => {
        const result = request.result;
        resolve(result || null);
      };
      tx.onerror = () => reject(tx.error);
    });
  }

  async saveRepository(repository: GitRepository): Promise<void> {
    if (!this.db) await this.init();
    gitLogger.info("saveRepository called", {
      name: repository.name,
      commits: repository.commits.length,
      currentBranch: repository.currentBranch,
      headCommitId: repository.headCommitId,
    });
    
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction([this.storeName], 'readwrite');
      const store = tx.objectStore(this.storeName);
      const request = store.put(repository);
      
      request.onerror = () => {
        gitLogger.error("saveRepository put failed", {
          name: repository.name,
          error: String(request.error),
        });
        reject(request.error);
      };
      request.onsuccess = () => {
        gitLogger.info("saveRepository put success", {
          name: repository.name,
          commits: repository.commits.length,
        });
        resolve();
      };
      
      tx.oncomplete = () => {
        gitLogger.info("saveRepository transaction complete", {
          name: repository.name,
          commits: repository.commits.length,
        });
        resolve();
      };
      tx.onerror = () => {
        gitLogger.error("saveRepository transaction failed", {
          name: repository.name,
          error: String(tx.error),
        });
        reject(tx.error);
      };
    });
  }

  async createCommit(
    repoName: string,
    message: string,
    changes: GitChange[],
    author?: string
  ): Promise<string> {
    console.log(`🔍 GitStore.createCommit called for repo: "${repoName}" with ${changes.length} changes`);
    gitLogger.info("createCommit start", {
      repoName,
      message,
      changeCount: changes.length,
      changes: changes.map((c) => ({ path: c.path, status: c.status, oldPath: c.oldPath })),
      author,
    });
    const repo = await this.getRepository(repoName);
    if (!repo) throw new Error(`Repository ${repoName} not found`);
    
    console.log(`🔍 GitStore.createCommit - repo found with ${repo.commits.length} existing commits`);

    // Create file snapshots for all files (preserve unchanged files)
    let allFileSnapshots: GitFileSnapshot[] = [];
    
    if (repo.commits.length > 0) {
      // Start with all files from the previous commit
      const previousCommit = repo.commits[0];
      allFileSnapshots = [...previousCommit.files];
      
      // Update files that have changes
      for (const change of changes) {
        const snapshot: GitFileSnapshot = {
          path: change.path,
          content: change.newContent || '',
          timestamp: new Date(),
          hash: this.generateHash(change.newContent || '')
        };
        
        // Find and replace the existing file, or add if new
        const existingIndex = allFileSnapshots.findIndex(f => f.path === change.path);
        if (existingIndex >= 0) {
          allFileSnapshots[existingIndex] = snapshot;
        } else {
          allFileSnapshots.push(snapshot);
        }
      }
    } else {
      // First commit - only include the changed files
      for (const change of changes) {
        const snapshot: GitFileSnapshot = {
          path: change.path,
          content: change.newContent || '',
          timestamp: new Date(),
          hash: this.generateHash(change.newContent || '')
        };
        allFileSnapshots.push(snapshot);
      }
    }

    // Create commit
    const commit: GitCommit = {
      id: this.generateCommitId(),
      message,
      timestamp: new Date(),
      files: allFileSnapshots,
      author,
      parentIds: repo.headCommitId ? [repo.headCommitId] : undefined
    };

    // Update repository
    repo.commits.unshift(commit);
    repo.headCommitId = commit.id;
    
    await this.saveRepository(repo);
    gitLogger.info("createCommit success", {
      repoName,
      commitId: commit.id,
      parentIds: commit.parentIds,
      snapshotFileCount: commit.files.length,
      totalCommits: repo.commits.length,
      headCommitId: repo.headCommitId,
    });
    
    return commit.id;
  }

  async getCommitHistory(repoName: string, limit = 50): Promise<GitCommit[]> {
    gitLogger.info("getCommitHistory called", { repoName, limit });
    const repo = await this.getRepository(repoName);
    if (!repo) return [];
    const commits = repo.commits.slice(0, limit);
    gitLogger.info("getCommitHistory success", { repoName, returned: commits.length });
    return commits;
  }

  async getFileHistory(repoName: string, filePath: string): Promise<GitCommit[]> {
    gitLogger.info("getFileHistory called", { repoName, filePath });
    const repo = await this.getRepository(repoName);
    if (!repo) return [];
    const history = repo.commits.filter(commit => 
      commit.files.some(file => file.path === filePath)
    );
    gitLogger.info("getFileHistory success", { repoName, filePath, returned: history.length });
    return history;
  }

  async getFileAtCommit(repoName: string, filePath: string, commitId: string): Promise<string | null> {
    gitLogger.info("getFileAtCommit called", { repoName, filePath, commitId });
    const repo = await this.getRepository(repoName);
    if (!repo) return null;
    
    // Find the commit
    const commit = repo.commits.find(c => c.id === commitId);
    if (!commit) return null;
    
    // Find the file snapshot
    const snapshot = commit.files.find(f => f.path === filePath);
    gitLogger.info("getFileAtCommit resolved", {
      repoName,
      filePath,
      commitId,
      found: !!snapshot,
      contentLength: snapshot?.content?.length ?? 0,
    });
    return snapshot?.content || null;
  }

  async getDiff(repoName: string, filePath: string, fromCommitId?: string, toCommitId?: string): Promise<GitChange[]> {
    gitLogger.info("getDiff called", { repoName, filePath, fromCommitId, toCommitId });
    const repo = await this.getRepository(repoName);
    if (!repo) return [];
    
    const headCommitId = toCommitId || repo.headCommitId;
    if (!headCommitId) return [];
    
    // Find commits in range
    const headIndex = repo.commits.findIndex(c => c.id === headCommitId);
    if (headIndex === -1) return [];
    
    const fromIndex = fromCommitId 
      ? repo.commits.findIndex(c => c.id === fromCommitId)
      : Math.min(headIndex + 1, repo.commits.length - 1);
    
    if (fromIndex === -1) return [];
    
    const commitsInRange = repo.commits.slice(fromIndex, headIndex + 1);
    const changes: GitChange[] = [];
    
    // For each commit, analyze file changes
    for (let i = commitsInRange.length - 1; i >= 0; i--) {
      const commit = commitsInRange[i];
      
      for (const fileSnapshot of commit.files) {
        if (fileSnapshot.path === filePath) {
          const change: GitChange = {
            path: fileSnapshot.path,
            status: 'modified',
            newContent: fileSnapshot.content
          };
          
          // Check if this is the first occurrence (added)
          const isFirstOccurrence = !commitsInRange.slice(i + 1).some(c => 
            c.files.some(f => f.path === filePath)
          );
          
          if (isFirstOccurrence) {
            change.status = 'added';
          }
          
          changes.push(change);
          break;
        }
      }
    }
    
    gitLogger.info("getDiff success", {
      repoName,
      filePath,
      changeCount: changes.length,
      statuses: changes.map((c) => c.status),
    });
    return changes;
  }

  async getBranches(repoName: string): Promise<string[]> {
    gitLogger.info("getBranches called", { repoName });
    const repo = await this.getRepository(repoName);
    const branches = repo?.branches || [];
    gitLogger.info("getBranches success", { repoName, branches, count: branches.length });
    return branches;
  }

  async createBranch(repoName: string, branchName: string, fromCommitId?: string): Promise<void> {
    gitLogger.info("createBranch called", { repoName, branchName, fromCommitId });
    const repo = await this.getRepository(repoName);
    if (!repo) throw new Error(`Repository ${repoName} not found`);
    
    if (!repo.branches.includes(branchName)) {
      repo.branches.push(branchName);
      await this.saveRepository(repo);
      gitLogger.info("createBranch success", {
        repoName,
        branchName,
        branchCount: repo.branches.length,
      });
    }
  }

  async switchBranch(repoName: string, branchName: string): Promise<void> {
    gitLogger.info("switchBranch called", { repoName, branchName });
    const repo = await this.getRepository(repoName);
    if (!repo) throw new Error(`Repository ${repoName} not found`);
    
    if (!repo.branches.includes(branchName)) {
      throw new Error(`Branch ${branchName} not found`);
    }
    
    repo.currentBranch = branchName;
    repo.headCommitId = undefined; // Reset head for new branch
    await this.saveRepository(repo);
    gitLogger.info("switchBranch success", {
      repoName,
      branchName,
      headCommitId: repo.headCommitId,
    });
  }

  private generateCommitId(): string {
    return Math.random().toString(36).slice(2, 9) + Date.now().toString(36);
  }

  private generateHash(content: string): string {
    // Simple hash function (in production, use crypto.subtle.digest)
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  // Utility method to calculate file hash
  static calculateFileHash(content: string): string {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }
}

// Export singleton instance
export const gitStore = new GitStore();

// Export the class for static methods
export { GitStore };

// Export types
export type { GitChange, GitRepository, GitCommit, GitFileSnapshot };
