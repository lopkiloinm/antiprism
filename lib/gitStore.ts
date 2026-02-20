// Real Git Storage using IndexedDB
// Stores commits, file snapshots, and change history

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
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
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
    if (!this.db) await this.init();
    
    // Check if repository already exists
    const existingRepo = await this.getRepository(name);
    console.log(`🔍 GitStore.createRepository - existing repo:`, existingRepo ? 'found' : 'not found');
    if (existingRepo) {
      console.log(`Repository ${name} already exists, skipping creation`);
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
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
      
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async getRepository(name: string): Promise<GitRepository | null> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction([this.storeName], 'readonly');
      const store = tx.objectStore(this.storeName);
      const request = store.get(name);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const result = request.result;
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
    
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction([this.storeName], 'readwrite');
      const store = tx.objectStore(this.storeName);
      const request = store.put(repository);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
      
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async createCommit(
    repoName: string,
    message: string,
    changes: GitChange[],
    author?: string
  ): Promise<string> {
    console.log(`🔍 GitStore.createCommit called for repo: "${repoName}" with ${changes.length} changes`);
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
    
    return commit.id;
  }

  async getCommitHistory(repoName: string, limit = 50): Promise<GitCommit[]> {
    const repo = await this.getRepository(repoName);
    if (!repo) return [];
    
    return repo.commits.slice(0, limit);
  }

  async getFileHistory(repoName: string, filePath: string): Promise<GitCommit[]> {
    const repo = await this.getRepository(repoName);
    if (!repo) return [];
    
    return repo.commits.filter(commit => 
      commit.files.some(file => file.path === filePath)
    );
  }

  async getFileAtCommit(repoName: string, filePath: string, commitId: string): Promise<string | null> {
    const repo = await this.getRepository(repoName);
    if (!repo) return null;
    
    // Find the commit
    const commit = repo.commits.find(c => c.id === commitId);
    if (!commit) return null;
    
    // Find the file snapshot
    const snapshot = commit.files.find(f => f.path === filePath);
    return snapshot?.content || null;
  }

  async getDiff(repoName: string, filePath: string, fromCommitId?: string, toCommitId?: string): Promise<GitChange[]> {
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
    
    return changes;
  }

  async getBranches(repoName: string): Promise<string[]> {
    const repo = await this.getRepository(repoName);
    return repo?.branches || [];
  }

  async createBranch(repoName: string, branchName: string, fromCommitId?: string): Promise<void> {
    const repo = await this.getRepository(repoName);
    if (!repo) throw new Error(`Repository ${repoName} not found`);
    
    if (!repo.branches.includes(branchName)) {
      repo.branches.push(branchName);
      await this.saveRepository(repo);
    }
  }

  async switchBranch(repoName: string, branchName: string): Promise<void> {
    const repo = await this.getRepository(repoName);
    if (!repo) throw new Error(`Repository ${repoName} not found`);
    
    if (!repo.branches.includes(branchName)) {
      throw new Error(`Branch ${branchName} not found`);
    }
    
    repo.currentBranch = branchName;
    repo.headCommitId = undefined; // Reset head for new branch
    await this.saveRepository(repo);
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
