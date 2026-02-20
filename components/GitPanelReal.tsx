"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { NameModal } from "./NameModal";
import { IconGitBranch, IconGitCommit, IconPlus, IconTrash2, IconCheckSquare, IconSquare } from "./Icons";
import { gitStore } from "@/lib/gitStore";
import type { EditorBufferManager } from "@/lib/editorBufferManager";

// CSS styles for dashboard-like appearance
const gitPanelStyles = `
  .file-checkbox {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .file-checkbox input[type="checkbox"] {
    width: 14px;
    height: 14px;
    margin: 0;
    cursor: pointer;
  }

  .file-item {
    display: flex;
    align-items: center;
    padding: 8px 12px;
    cursor: pointer;
    font-family: ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace;
    font-size: 10px;
    color: rgb(249 250 251 / 0.8);
  }

  .file-item:hover {
    background: color-mix(in srgb, var(--border) 45%, transparent);
  }

  .file-item.selected {
    background: color-mix(in srgb, var(--accent) 18%, transparent);
  }

  .file-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .file-name {
    font-family: ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace;
    font-size: 10px;
    color: rgb(249 250 251 / 0.8);
    cursor: pointer;
    user-select: none;
  }

  .file-name:hover {
    text-decoration: underline;
  }
`;

// Define types locally since they're not exported from gitStore
interface FileChange {
  path: string;
  status: "modified" | "added" | "deleted";
  staged: boolean;
}

interface GitRepository {
  name: string;
  commits: any[];
  currentBranch: string;
  branches: string[];
  headCommitId?: string;
}

// Simple hash function for file content
const calculateFileHash = (content: string): string => {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
};

// Helper function to get all project files from IDBFS
const getAllProjectFiles = async (projectId: string): Promise<string[]> => {
  try {
    const { mount } = await import("@wwog/idbfs");
    const fs = await mount();
    const { buildFileManagerData } = await import("@/lib/idbfsAdapter");
    
    const projectPath = `/projects/${projectId}`;
    const items = await buildFileManagerData(fs, projectPath);
    
    // Include ALL files (both text and binary)
    const allFiles = items
      .filter(item => item.type === 'file')
      .map(item => item.id);
    
    console.log('🔍 PROJECT FILES DEBUG - Found all files:', allFiles);
    return allFiles;
  } catch (error) {
    console.error('Failed to get project files:', error);
    return [];
  }
};

interface FileChange {
  path: string;
  status: "modified" | "added" | "deleted";
  staged: boolean;
}

interface GitPanelProps {
  filePaths?: string[];
  currentPath?: string;
  onFileSelect?: (filePath: string, options?: { currentContent?: string; originalContent?: string; showDiff?: boolean }) => void;
  onCloseFile?: (filePath: string) => void;
  projectId?: string;
  bufferManager?: any; // Buffer manager instance for file content access
}

export function GitPanelReal({
  projectId,
  bufferManager,
  filePaths = [],
  currentPath,
  onFileSelect,
  onCloseFile,
}: GitPanelProps) {
  // Inject CSS styles
  useEffect(() => {
    const styleId = 'git-panel-styles';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = gitPanelStyles;
      document.head.appendChild(style);
    }
  }, []);

  const [repo, setRepo] = useState<GitRepository | null>(null);

  const [branch, setBranch] = useState("main");
  const [changes, setChanges] = useState<FileChange[]>([]);
  const [commits, setCommits] = useState<any[]>([]);
  const [commitMessage, setCommitMessage] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGitInitialized, setIsGitInitialized] = useState<boolean | null>(null);

  const loadCommitHistory = useCallback(async () => {
    if (!projectId) return;
    try {
      const history = await gitStore.getCommitHistory(projectId, 20);
      setCommits(history);
    } catch (error) {
      console.error("Failed to load commit history:", error);
    }
  }, [projectId]);

  // Check if git is already initialized
  useEffect(() => {
    checkGitInitialization();
  }, [projectId, loadCommitHistory]);

  // Detect file changes by comparing with last commit
  useEffect(() => {
    if (filePaths.length === 0 || !isGitInitialized) return;
    detectFileChanges();
  }, [filePaths, projectId, isGitInitialized]);

  const checkGitInitialization = async () => {
    setIsLoading(true);
    try {
      if (!projectId) return;
      const repo = await gitStore.getRepository(projectId);
      const wasInitialized = !!repo;
      setIsGitInitialized(wasInitialized);
      
      // Load commit history if git is already initialized
      if (wasInitialized) {
        await loadCommitHistory();
      }
    } catch (error) {
      console.error("Failed to check git initialization:", error);
      setIsGitInitialized(false);
    } finally {
      setIsLoading(false);
    }
  };

  const initializeGitRepository = async () => {
    if (!projectId) return;
    setIsLoading(true);
    try {
      await gitStore.createRepository(projectId);
      setIsGitInitialized(true);
      
      // Automatically create initial commit with all current files
      console.log('🚀 Creating initial commit with all current files...');
      
      // Get all current file contents from the actual file system
      const initialChanges = [];
      console.log('� Creating initial commit with all current files...');
      
      // Get all project files from IDBFS
      const allProjectFiles = await getAllProjectFiles(projectId);
      console.log('� INITIAL COMMIT DEBUG - All project files:', allProjectFiles);
      console.log('🔍 INITIAL COMMIT DEBUG - Buffer manager available:', !!bufferManager);
      
      // Process all project files
      for (const filePath of allProjectFiles) {
        const fileName = filePath.split("/").pop() || filePath;
        let actualContent = "";
        
        console.log(`🔍 INITIAL COMMIT DEBUG - Processing file: ${fileName} (path: ${filePath})`);
        
        try {
          // Read file content directly from IDBFS
          const { mount } = await import("@wwog/idbfs");
          const fs = await mount();
          const contentBuffer = await fs.readFile(filePath);
          actualContent = new TextDecoder().decode(contentBuffer);
          console.log(`🔍 INITIAL COMMIT DEBUG - Content length for ${fileName}: ${actualContent.length}`);
        } catch (error) {
          console.log(`Could not read ${fileName} from IDBFS, trying buffer manager:`, error);
          
          // Fallback to buffer manager
          try {
            if (bufferManager) {
              bufferManager.saveActiveToCache();
              actualContent = bufferManager.getCachedContent(filePath) || bufferManager.getBufferContent() || "";
              console.log(`🔍 INITIAL COMMIT DEBUG - Buffer manager content length for ${fileName}: ${actualContent.length}`);
            }
          } catch (bufferError) {
            console.log(`Could not get content for ${fileName} from buffer manager:`, bufferError);
            actualContent = `// Error getting content for ${fileName}`;
          }
        }
        
        // Only include files that have content
        if (actualContent.trim() !== '') {
          console.log(`🔍 INITIAL COMMIT DEBUG - Adding file to commit: ${fileName}`);
          initialChanges.push({
            path: fileName, // Store full filename with extension
            status: "added" as const,
            newContent: actualContent
          });
        } else {
          console.log(`🔍 INITIAL COMMIT DEBUG - Skipping empty file: ${fileName}`);
        }
      }
      
      if (initialChanges.length > 0) {
        const commitId = await gitStore.createCommit(
          projectId,
          "Initial commit",
          initialChanges,
          "User"
        );
        console.log(`✅ Created initial commit ${commitId} with ${initialChanges.length} files`);
        console.log('🔍 Initial commit files:', initialChanges.map(c => c.path));
        
        // Reload commit history and detect changes
        await loadCommitHistory();
        await detectFileChanges();
      } else {
        console.log('⚠️ No files with content found for initial commit');
        await loadCommitHistory();
      }
    } catch (error) {
      console.error("Failed to initialize git repository:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const detectFileChanges = async () => {
    if (!projectId) return;
    try {
      const currentRepo = await gitStore.getRepository(projectId);
      setRepo(currentRepo); // Store repo in state
      
      if (!currentRepo || currentRepo.commits.length === 0) {
        // No commits yet, show all files as new
        const newChanges: FileChange[] = filePaths.slice(0, 10).map((p) => ({
          path: p.split("/").pop() || p, // Use full filename with extension
          status: "added" as const,
          staged: false,
        }));
        setChanges(newChanges);
        return; // Don't return early - repo is already set
      }

      const headCommit = currentRepo.commits[0];
      const detectedChanges: FileChange[] = [];

      for (const filePath of filePaths.slice(0, 10)) {
        const fileName = filePath.split("/").pop() || filePath; // Use full filename with extension
        
        try {
          // Get file content from buffer manager (if available)
          let currentContent = "";
          try {
            // Try to get actual file content
            if (bufferManager) {
              bufferManager.saveActiveToCache();
              currentContent = bufferManager.getCachedContent(filePath) || bufferManager.getBufferContent() || "";
            }
          } catch (error) {
            console.log(`Could not get content for ${fileName}:`, error);
          }

          // Check if file exists in last commit
          const lastCommit = currentRepo.commits[0];
          const fileInCommit = lastCommit.files.find((f: any) => f.path === fileName);
          
          if (!fileInCommit) {
            // File doesn't exist in last commit - it's new
            detectedChanges.push({
              path: fileName, // Use full filename with extension
              status: "added" as const,
              staged: false,
            });
          } else {
            // File exists - check if content changed
            const contentHash = calculateFileHash(currentContent);
            if (contentHash !== fileInCommit.hash) {
              detectedChanges.push({
                path: fileName, // Use full filename with extension
                status: "modified" as const,
                staged: false,
              });
            }
          }
        } catch (error) {
          console.error(`Failed to check file changes for ${fileName}:`, error);
        }
      }

      setChanges(detectedChanges);
    } catch (error) {
      console.error("Failed to detect file changes:", error);
    }
  };

  const toggleStage = useCallback((index: number) => {
    setChanges((prev) =>
      prev.map((c, i) => (i === index ? { ...c, staged: !c.staged } : c))
    );
  }, []);

  const stageAll = useCallback(() => {
    setChanges((prev) => prev.map((c) => ({ ...c, staged: true })));
  }, []);

  const unstageAll = useCallback(() => {
    setChanges((prev) => prev.map((c) => ({ ...c, staged: false })));
  }, []);

  const handleCommit = useCallback(async () => {
    if (!commitMessage.trim()) return;
    const staged = changes.filter((c) => c.staged);
    if (staged.length === 0) return;

    setIsLoading(true);
    try {
      // Get actual file content for each staged change
      const gitChanges = staged.map((change) => {
        let actualContent = "";
        try {
          // Match by full filename including extension
          const fullPath = filePaths.find((p) => p.split("/").pop() === change.path);
          if (fullPath && bufferManager) {
            bufferManager.saveActiveToCache();
            actualContent = bufferManager.getCachedContent(fullPath) || bufferManager.getBufferContent() || "";
          }
        } catch (error) {
          console.log(`Could not get actual content for ${change.path}:`, error);
          actualContent = `// Error getting content for ${change.path}`;
        }

        return {
          path: change.path, // Keep full filename with extension
          status: change.status,
          newContent: actualContent
        };
      });

      const commitId = await gitStore.createCommit(
        projectId!,
        commitMessage.trim(),
        gitChanges,
        "User"
      );

      await loadCommitHistory();
      setChanges((prev) => prev.filter((c) => !c.staged));
      setCommitMessage("");
      setShowHistory(false); // Switch back to changes view after commit
      
      // Auto-close file tabs for committed files
      staged.forEach((change) => {
        const fullPath = filePaths.find((p) => p.split("/").pop() === change.path);
        if (fullPath && onCloseFile) {
          onCloseFile(fullPath);
        }
      });
      
      console.log(`Created commit ${commitId}`);
    } catch (error) {
      console.error("Failed to create commit:", error);
    } finally {
      setIsLoading(false);
    }
  }, [commitMessage, changes, projectId, filePaths, onCloseFile]);

  const handleFileClick = useCallback(async (fileName: string) => {
    if (!projectId) return;
    // Find the exact file path by matching the full filename (including extension)
    const fullPath = filePaths.find((p) => {
      const pathFileName = p.split("/").pop() || p;
      return pathFileName === fileName; // Match full filename with extension
    });
    
    if (fullPath && onFileSelect) {
      // Get current content
      let currentContent = "";
      try {
        if (bufferManager) {
          bufferManager.saveActiveToCache();
          currentContent = bufferManager.getCachedContent(fullPath) || bufferManager.getBufferContent() || "";
        }
      } catch (error) {
        console.log(`Could not get content for ${fileName}:`, error);
      }

      // Get original content from last commit
      let originalContent = "";
      let showDiff = true;
      
      try {
        const repo = await gitStore.getRepository(projectId);
        console.log('🔍 Debug - Repo data:', {
          hasRepo: !!repo,
          commitsCount: repo?.commits?.length || 0,
          fileName,
          fullPath
        });
        
        if (repo && repo.commits.length > 0) {
          const lastCommit = repo.commits[0];
          console.log('🔍 Debug - Last commit:', {
            commitId: lastCommit.id,
            filesCount: lastCommit.files?.length || 0,
            files: lastCommit.files?.map(f => ({ path: f.path, hasContent: !!f.content, contentLength: f.content?.length || 0 }))
          });
          
          const fileInCommit = lastCommit.files.find((f: any) => f.path === fileName);
          if (fileInCommit) {
            originalContent = fileInCommit.content;
            console.log('🔍 Debug - Found file in commit:', {
              originalContentLength: originalContent.length,
              originalContentPreview: originalContent.substring(0, 100)
            });
          } else {
            // File doesn't exist in last commit - it's a new file
            console.log('🔍 Debug - File not found in commit, treating as new file');
            showDiff = false;
          }
        } else {
          // No commits yet - don't show diff
          console.log('🔍 Debug - No commits found');
          showDiff = false;
        }
      } catch (error) {
        console.log(`Could not get original content for ${fileName}:`, error);
        showDiff = false;
      }

      console.log('🔍 Debug - Final diff data:', {
        fileName,
        fullPath,
        showDiff,
        currentContentLength: currentContent.length,
        originalContentLength: originalContent.length
      });

      // Open file with diff data - no suffix for cleaner UI
      onFileSelect(fullPath, { currentContent, originalContent, showDiff });
    }
  }, [onFileSelect, filePaths, projectId, bufferManager]);

  const stagedCount = changes.filter((c) => c.staged).length;

  // Debug logging for path comparison
  useEffect(() => {
    console.log('🔍 GIT PANEL DEBUG - currentPath:', currentPath);
    console.log('🔍 GIT PANEL DEBUG - changes:', changes.map(c => ({ path: c.path, isActive: currentPath === c.path })));
  }, [currentPath, changes]);

  // Extract just the filename from currentPath for comparison
  const getCurrentFileName = () => {
    if (!currentPath) return null;
    return currentPath.split('/').pop() || currentPath;
  };

  const statusIcon = (status: FileChange["status"]) => {
    switch (status) {
      case "modified":
        return <span className="text-yellow-400 text-[10px] font-bold">M</span>;
      case "added":
        return <span className="text-green-400 text-[10px] font-bold">A</span>;
      case "deleted":
        return <span className="text-red-400 text-[10px] font-bold">D</span>;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full bg-[var(--background)]">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border)] shrink-0">
        <div className="flex items-center gap-2">
          <IconGitBranch />
          <select
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
            className="text-xs bg-[color-mix(in_srgb,var(--border)_22%,transparent)] border border-[var(--border)] text-[var(--foreground)] px-2 py-1 rounded"
          >
            <option value="main">main</option>
            <option value="feature">feature</option>
            <option value="develop">develop</option>
          </select>
        </div>
        <button
          onClick={() => setShowHistory(!showHistory)}
          className={`p-1 rounded text-xs transition-colors ${
            showHistory
              ? "bg-[var(--accent)] text-white"
              : "text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[color-mix(in_srgb,var(--border)_35%,transparent)]"
          }`}
          title={showHistory ? "Hide history" : "Show history"}
        >
          <IconGitCommit />
        </button>
      </div>

      {/* Changes or History */}
      <div className="flex-1 overflow-auto min-h-0">
        {isLoading ? (
          <div className="flex items-center justify-center h-full text-[var(--muted)]">
            <div className="text-center">
              <div className="animate-spin w-4 h-4 border-2 border-[var(--accent)] border-t-transparent rounded-full mb-2"></div>
              <p className="text-sm">Loading...</p>
            </div>
          </div>
        ) : isGitInitialized === false ? (
          <div className="flex flex-col items-center justify-center h-full p-6 text-center">
            <div className="mb-6">
              <IconGitBranch />
            </div>
            <button
              onClick={initializeGitRepository}
              disabled={isLoading}
              className="px-4 py-2 text-xs font-medium rounded bg-[var(--accent)] text-white hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
            >
              {isLoading ? "Initializing..." : "Initialize Git"}
            </button>
          </div>
        ) : showHistory ? (
          <div>
            {/* Commit history header */}
            <div className="px-3 py-2 text-sm flex items-center gap-2 min-w-0">
              <IconGitCommit />
              <span className="truncate min-w-0 flex-1 text-[var(--foreground)]">Commit History</span>
              <span className="shrink-0 flex items-center text-right" style={{ minWidth: '16px' }}></span>
            </div>
            
            {/* Border separator */}
            <div className="border-b border-[var(--border)] shrink-0"></div>
            
            {/* Commit list */}
            <div className="flex-1 overflow-auto min-h-0">
              {commits.length === 0 ? (
                <div className="p-3 text-center">
                  <div className="text-xs text-[var(--muted)] italic">No commits yet</div>
                </div>
              ) : (
                <div>
                  {commits.map((commit) => (
                    <div key={commit.id} className="px-3 py-2 cursor-pointer text-sm flex items-start gap-2 min-w-0 transition-colors hover:bg-[color-mix(in_srgb,var(--border)_45%,transparent)]">
                      <IconGitCommit />
                      <div className="flex-1 min-w-0">
                        <div className="truncate text-[var(--foreground)]">
                          {commit.message}
                        </div>
                        <div className="text-xs text-[var(--muted)] truncate">
                          {commit.timestamp.toLocaleString()} · {commit.id.slice(0, 7)}
                        </div>
                      </div>
                      <span className="shrink-0 flex items-center text-right" style={{ minWidth: '16px' }}></span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div>
            {/* Staging controls */}
            <div className="shrink-0">
              <div className="flex items-center gap-2 min-w-0 text-sm px-3 py-2">
                <button
                  onClick={() => stagedCount === changes.length ? unstageAll() : stageAll()}
                  disabled={changes.length === 0}
                  className="p-1.5 -m-1.5 rounded hover:bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] text-[var(--accent)] transition-colors"
                >
                  {stagedCount === changes.length && changes.length > 0 ? <IconCheckSquare /> : <IconSquare />}
                </button>
                <span className="truncate min-w-0 flex-1 text-[var(--foreground)]">Changes ({stagedCount} staged)</span>
                <span className="shrink-0 flex items-center text-right" style={{ minWidth: '16px' }}></span>
              </div>
            </div>

            {/* Border separator */}
            <div className="border-b border-[var(--border)] shrink-0"></div>

            {/* File changes list */}
            <div className="flex-1 overflow-auto min-h-0">
              {changes.length === 0 ? (
                <div className="p-3 text-center">
                  <div className="text-xs text-[var(--muted)] italic mb-2">No changes detected</div>
                  {repo && repo.commits.length === 0 && (
                    <div className="bg-blue-50 border border-blue-200 rounded p-3">
                      <p className="text-xs text-blue-800 font-medium">📋 READY TO TRACK</p>
                      <p className="text-xs text-blue-700">Make changes to files to see them here</p>
                    </div>
                  )}
                </div>
              ) : (
                changes.map((change, i) => (
                  <div key={i} className={`px-3 py-2 cursor-pointer text-sm flex items-center gap-2 min-w-0 transition-colors ${
                    getCurrentFileName() === change.path
                      ? "bg-[color-mix(in_srgb,var(--accent)_18%,transparent)]"
                      : "hover:bg-[color-mix(in_srgb,var(--border)_45%,transparent)]"
                  }`}
                  onClick={() => handleFileClick(change.path)}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleStage(i);
                    }}
                    className="p-1.5 -m-1.5 rounded hover:bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] text-[var(--accent)] transition-colors"
                  >
                    {change.staged ? <IconCheckSquare /> : <IconSquare />}
                  </button>
                  <span className="truncate min-w-0 flex-1">{change.path}</span>
                  <span className="shrink-0 flex items-center text-right" style={{ minWidth: '16px' }}>{statusIcon(change.status)}</span>
                </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Commit input */}
      <div className="border-t border-[var(--border)] p-2 shrink-0 space-y-1.5">
        <input
          type="text"
          placeholder="Commit message…"
          value={commitMessage}
          onChange={(e) => setCommitMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleCommit();
            }
          }}
          className="w-full px-2 py-1.5 text-xs rounded bg-[color-mix(in_srgb,var(--border)_22%,transparent)] border border-[var(--border)] text-[var(--foreground)] placeholder-[var(--muted)] focus:outline-none focus:ring-1 focus:ring-[color-mix(in_srgb,var(--accent)_55%,transparent)]"
          disabled={isLoading}
        />
        <button
          onClick={handleCommit}
          disabled={!commitMessage.trim() || stagedCount === 0 || isLoading}
          className="w-full px-2 py-1.5 text-xs font-medium rounded bg-[var(--accent)] text-white hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
        >
          Commit ({stagedCount} staged)
        </button>
      </div>
    </div>
  );
}
