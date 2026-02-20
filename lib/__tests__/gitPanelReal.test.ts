import { gitStore } from '../gitStore';

// Mock IndexedDB for testing
const mockDB = {
  objectStoreNames: {
    contains: jest.fn()
  },
  transaction: jest.fn(),
  createObjectStore: jest.fn()
};

const mockRequest = {
  result: mockDB,
  onerror: null,
  onsuccess: null,
  onupgradeneeded: null
};

// Mock indexedDB
global.indexedDB = {
  open: jest.fn(() => mockRequest)
} as any;

describe('GitPanelReal Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset gitStore instance
    (gitStore as any).db = null;
  });

  describe('Git Repository Operations', () => {
    test('should create and retrieve repository', async () => {
      const projectId = 'test-project';
      
      // Create repository
      await gitStore.createRepository(projectId);
      
      // Retrieve repository
      const repo = await gitStore.getRepository(projectId);
      
      expect(repo).toBeDefined();
      expect(repo?.name).toBe(projectId);
      expect(repo?.commits).toEqual([]);
      expect(repo?.currentBranch).toBe('main');
      expect(repo?.branches).toContain('main');
    });

    test('should create commits with file changes', async () => {
      const projectId = 'test-project-commits';
      
      // Create repository
      await gitStore.createRepository(projectId);
      
      // Create commit with changes
      const changes = [
        {
          path: 'test.txt',
          status: 'added' as const,
          newContent: 'Hello World'
        },
        {
          path: 'test2.txt', 
          status: 'modified' as const,
          newContent: 'Modified content'
        }
      ];
      
      const commitId = await gitStore.createCommit(
        projectId,
        'Test commit',
        changes,
        'Test Author'
      );
      
      expect(commitId).toBeDefined();
      expect(typeof commitId).toBe('string');
      
      // Verify commit was created
      const repo = await gitStore.getRepository(projectId);
      expect(repo?.commits).toHaveLength(1);
      expect(repo?.commits[0].message).toBe('Test commit');
      expect(repo?.commits[0].author).toBe('Test Author');
      expect(repo?.commits[0].files).toHaveLength(2);
    });

    test('should maintain commit history in chronological order', async () => {
      const projectId = 'test-project-history';
      
      await gitStore.createRepository(projectId);
      
      // Create multiple commits
      const commit1Id = await gitStore.createCommit(
        projectId,
        'First commit',
        [{ path: 'file1.txt', status: 'added' as const, newContent: 'Content 1' }],
        'Author 1'
      );
      
      // Small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const commit2Id = await gitStore.createCommit(
        projectId,
        'Second commit', 
        [{ path: 'file2.txt', status: 'added' as const, newContent: 'Content 2' }],
        'Author 2'
      );
      
      const history = await gitStore.getCommitHistory(projectId, 10);
      
      expect(history).toHaveLength(2);
      expect(history[0].message).toBe('Second commit'); // Most recent first
      expect(history[1].message).toBe('First commit');
      expect(history[0].timestamp.getTime()).toBeGreaterThan(history[1].timestamp.getTime());
    });

    test('should handle file history tracking', async () => {
      const projectId = 'test-project-file-history';
      
      await gitStore.createRepository(projectId);
      
      const filePath = 'important.txt';
      
      // Create initial commit
      await gitStore.createCommit(
        projectId,
        'Add important file',
        [{ path: filePath, status: 'added' as const, newContent: 'Initial content' }],
        'Author'
      );
      
      // Create second commit modifying the file
      await gitStore.createCommit(
        projectId,
        'Update important file',
        [{ path: filePath, status: 'modified' as const, newContent: 'Updated content' }],
        'Author'
      );
      
      const fileHistory = await gitStore.getFileHistory(projectId, filePath);
      
      expect(fileHistory).toHaveLength(2);
      expect(fileHistory[0].files[0].content).toBe('Updated content');
      expect(fileHistory[1].files[0].content).toBe('Initial content');
    });

    test('should retrieve file content at specific commit', async () => {
      const projectId = 'test-project-file-content';
      
      await gitStore.createRepository(projectId);
      
      const filePath = 'versioned.txt';
      const initialContent = 'Version 1';
      const updatedContent = 'Version 2';
      
      // First commit
      const commit1Id = await gitStore.createCommit(
        projectId,
        'First version',
        [{ path: filePath, status: 'added' as const, newContent: initialContent }],
        'Author'
      );
      
      // Second commit
      const commit2Id = await gitStore.createCommit(
        projectId,
        'Second version',
        [{ path: filePath, status: 'modified' as const, newContent: updatedContent }],
        'Author'
      );
      
      // Check content at different commits
      const contentAtCommit1 = await gitStore.getFileAtCommit(projectId, filePath, commit1Id);
      const contentAtCommit2 = await gitStore.getFileAtCommit(projectId, filePath, commit2Id);
      
      expect(contentAtCommit1).toBe(initialContent);
      expect(contentAtCommit2).toBe(updatedContent);
    });

    test('should handle branch operations', async () => {
      const projectId = 'test-project-branches';
      
      await gitStore.createRepository(projectId);
      
      // Create initial commit
      await gitStore.createCommit(
        projectId,
        'Initial commit',
        [{ path: 'main.txt', status: 'added' as const, newContent: 'Main content' }],
        'Author'
      );
      
      // Create new branch
      await gitStore.createBranch(projectId, 'feature-branch');
      
      const branches = await gitStore.getBranches(projectId);
      expect(branches).toContain('main');
      expect(branches).toContain('feature-branch');
      
      // Switch to new branch
      await gitStore.switchBranch(projectId, 'feature-branch');
      
      const repo = await gitStore.getRepository(projectId);
      expect(repo?.currentBranch).toBe('feature-branch');
    });

    test('should generate consistent file hashes', async () => {
      const content = 'Test file content';
      const hash1 = gitStore.generateHash(content);
      const hash2 = gitStore.generateHash(content);
      
      expect(hash1).toBe(hash2);
      expect(typeof hash1).toBe('string');
      expect(hash1.length).toBeGreaterThan(0);
    });

    test('should generate unique commit IDs', async () => {
      const projectId = 'test-project-unique-ids';
      
      await gitStore.createRepository(projectId);
      
      const commit1Id = await gitStore.createCommit(
        projectId,
        'Commit 1',
        [{ path: 'file1.txt', status: 'added' as const, newContent: 'Content 1' }],
        'Author'
      );
      
      const commit2Id = await gitStore.createCommit(
        projectId,
        'Commit 2',
        [{ path: 'file2.txt', status: 'added' as const, newContent: 'Content 2' }],
        'Author'
      );
      
      expect(commit1Id).not.toBe(commit2Id);
      expect(typeof commit1Id).toBe('string');
      expect(typeof commit2Id).toBe('string');
    });
  });

  describe('Error Handling', () => {
    test('should handle getting non-existent repository', async () => {
      const repo = await gitStore.getRepository('non-existent-project');
      expect(repo).toBeNull();
    });

    test('should handle operations on non-existent repository', async () => {
      await expect(
        gitStore.createCommit('non-existent', 'message', [], 'author')
      ).rejects.toThrow('Repository non-existent not found');
      
      await expect(
        gitStore.switchBranch('non-existent', 'branch')
      ).rejects.toThrow('Repository non-existent not found');
    });

    test('should handle switching to non-existent branch', async () => {
      const projectId = 'test-project-branch-error';
      await gitStore.createRepository(projectId);
      
      await expect(
        gitStore.switchBranch(projectId, 'non-existent-branch')
      ).rejects.toThrow('Branch non-existent-branch not found');
    });
  });

  describe('Git Diff Operations', () => {
    test('should calculate diffs between commits', async () => {
      const projectId = 'test-project-diffs';
      
      await gitStore.createRepository(projectId);
      
      const filePath = 'diff-test.txt';
      
      // Create commits with changes
      await gitStore.createCommit(
        projectId,
        'Add file',
        [{ path: filePath, status: 'added' as const, newContent: 'Initial' }],
        'Author'
      );
      
      const commit2Id = await gitStore.createCommit(
        projectId,
        'Modify file',
        [{ path: filePath, status: 'modified' as const, newContent: 'Modified' }],
        'Author'
      );
      
      const diffs = await gitStore.getDiff(projectId, filePath);
      
      expect(diffs).toHaveLength(2); // Should show both add and modify
      expect(diffs[0].status).toBe('modified');
      expect(diffs[0].newContent).toBe('Modified');
    });
  });
});

// Static method tests
describe('GitStore Static Methods', () => {
  test('calculateFileHash should be consistent', () => {
    const content = 'Test content for hashing';
    const hash1 = gitStore.calculateFileHash(content);
    const hash2 = gitStore.calculateFileHash(content);
    
    expect(hash1).toBe(hash2);
    expect(typeof hash1).toBe('string');
  });
  
  test('calculateFileHash should produce different hashes for different content', () => {
    const content1 = 'Content 1';
    const content2 = 'Content 2';
    
    const hash1 = gitStore.calculateFileHash(content1);
    const hash2 = gitStore.calculateFileHash(content2);
    
    expect(hash1).not.toBe(hash2);
  });
});
