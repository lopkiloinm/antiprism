"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { NameModal } from "./NameModal";
import { IconGitBranch, IconGitCommit, IconPlus, IconTrash2, IconChevronDown, IconChevronUp, IconCheck, IconMinus } from "./Icons";
import { gitStore, GitStore, type GitChange } from "@/lib/gitStore";
import type { EditorBufferManager } from "@/lib/editorBufferManager";
import { getProjects } from "@/lib/projects";

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

// Helper function to get all project files from IDBFS recursively
export const getAllProjectFiles = async (projectId: string): Promise<string[]> => {
  try {
    const { mount } = await import("@wwog/idbfs");
    const fs = await mount();
    
    const projectPath = `/projects/${projectId}`;
    const allFiles: string[] = [];

    async function walk(dirPath: string) {
      try {
        const { dirs, files } = await fs.readdir(dirPath);
        for (const f of files) {
          allFiles.push(`${dirPath}/${f.name}`);
        }
        for (const d of dirs) {
          await walk(`${dirPath}/${d.name}`);
        }
      } catch (err) {
        console.warn(`Could not read dir ${dirPath}`, err);
      }
    }

    await walk(projectPath);
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
  filePaths: string[];
  currentPath?: string;
  projectName?: string;
  onFileSelect?: (filePath: string, options?: { currentContent?: string; originalContent?: string }) => void;
  onCloseFile?: (filePath: string) => void;
  projectId?: string;
  bufferManager?: any; // Buffer manager instance for file content access
  refreshTrigger?: number;
  fileDocManager?: any; // FileDocumentManager instance for direct Yjs access
}

function dedupeChangesByPath(items: FileChange[]): FileChange[] {
  const deduped = new Map<string, FileChange>();

  for (const item of items) {
    const existing = deduped.get(item.path);
    if (!existing) {
      deduped.set(item.path, item);
      continue;
    }

    deduped.set(item.path, {
      ...existing,
      ...item,
      staged: existing.staged || item.staged,
    });
  }

  return Array.from(deduped.values());
}

export function GitPanelReal({
  projectId,
  currentPath,
  projectName,
  bufferManager,
  fileDocManager,
  filePaths = [],
  onFileSelect,
  onCloseFile,
  refreshTrigger = 0,
}: GitPanelProps) {
  // Create a stable repository name based on the project ID to name mapping
  const getStableRepoName = () => {
    // Priority 1: Use project ID (uniquely identifies the project)
    if (projectId) {
      return `git-${projectId}`;
    }
    
    // Priority 2: Use file system path (stable fallback)
    if (filePaths.length > 0) {
      const firstPath = filePaths[0];
      const pathMatch = firstPath.match(/\/projects\/([^\/]+)/);
      if (pathMatch) {
        const projectUuid = pathMatch[1];
        return `git-${projectUuid}`;
      }
    }
    
    // Priority 3: Use project name directly (fallback)
    if (projectName) {
      // Sanitize project name for use as repository name
      const sanitizedName = projectName
        .toLowerCase()
        .replace(/[^a-z0-9-_]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
      return `git-${sanitizedName}`;
    }
    
    return `git-unknown`;
  };

  const stableRepoName = getStableRepoName();

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

  // Handle click outside for branch dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (branchDropdownRef.current && !branchDropdownRef.current.contains(e.target as Node)) {
        setShowBranchDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const [repo, setRepo] = useState<GitRepository | null>(null);

  const branchDropdownRef = useRef<HTMLDivElement>(null);

  const [branch, setBranch] = useState("main");
  const [showBranchDropdown, setShowBranchDropdown] = useState(false);
  const [changes, setChanges] = useState<FileChange[]>([]);
  const [commits, setCommits] = useState<any[]>([]);
  const [commitMessage, setCommitMessage] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDetectingChanges, setIsDetectingChanges] = useState(false);
  const [isGitInitialized, setIsGitInitialized] = useState<boolean | null>(null);
  const [initialCommitFiles, setInitialCommitFiles] = useState<string[]>([]);

  const loadCommitHistory = useCallback(async () => {
    if (!stableRepoName) return;
    try {
      const history = await gitStore.getCommitHistory(stableRepoName, 20);
      setCommits(history);
    } catch (error) {
      console.error("Failed to load commit history:", error);
    }
  }, [projectId]);

  // Check if git is already initialized
  useEffect(() => {
    checkGitInitialization();
  }, [projectId]);

  // Detect file changes by comparing with last commit
  useEffect(() => {
    if (!isGitInitialized) return;
    detectFileChanges();
  }, [projectId, isGitInitialized, refreshTrigger]);

  const checkGitInitialization = async () => {
    setIsLoading(true);
    try {
      if (!stableRepoName) return;
      const repo = await gitStore.getRepository(stableRepoName);
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
    if (!stableRepoName || !projectId) return;
    if (isLoading) return;
    
    setIsLoading(true);
    try {
      // Check if git repository already exists
      const existingRepo = await gitStore.getRepository(stableRepoName);
      if (existingRepo) {
        setIsGitInitialized(true);
        await loadCommitHistory();
        await detectFileChanges();
        return;
      }

      // Create repository first with project ID
      await gitStore.createRepository(stableRepoName, projectId);
      
      // Get ALL project files for initial commit, not just open tabs
      const allProjectFiles = await getAllProjectFiles(projectId);
      
      const initialChanges: GitChange[] = [];
      
      for (const filePath of allProjectFiles) {
        try {
          let actualContent = "";
          
          // Use fileDocManager for current content, fallback to IDBFS
          if (fileDocManager) {
            const doc = fileDocManager.getDocument(filePath, true);
            if (doc && doc.text) {
              actualContent = doc.text.toString();
            }
          }
          
          // Fallback to IDBFS if needed
          if (!actualContent) {
            const { mount } = await import("@wwog/idbfs");
            const fs = await mount();
            const contentBuffer = await fs.readFile(filePath);
            actualContent = new TextDecoder().decode(contentBuffer);
          }
          
          if (actualContent.length > 0) {
            initialChanges.push({
              path: filePath,
              status: "added" as const,
              newContent: actualContent
            });
          }
        } catch (error) {
          console.error(`Failed to read file ${filePath} for initial commit:`, error);
        }
      }
      
      if (initialChanges.length > 0) {
        const commitId = await gitStore.createCommit(
          stableRepoName,
          "Initial commit",
          initialChanges,
          "User"
        );
        setInitialCommitFiles(initialChanges.map(c => c.path));
        
        // Reload commit history and detect changes
        await loadCommitHistory();
        await detectFileChanges();
      } else {
        setInitialCommitFiles([]);
        await loadCommitHistory();
      }
    } catch (error) {
      console.error("Failed to initialize git repository:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const detectFileChanges = async () => {
    if (!stableRepoName || isDetectingChanges) return;
    
    setIsDetectingChanges(true);
    try {
      const currentRepo = await gitStore.getRepository(stableRepoName);
      setRepo(currentRepo); // Store repo in state
      
      if (!currentRepo || currentRepo.commits.length === 0) {
        const allProjectFiles = await getAllProjectFiles(projectId!);
        const newChanges: FileChange[] = allProjectFiles.map((p) => ({
          path: p,
          status: "added" as const,
          staged: false,
        }));
        const dedupedChanges = dedupeChangesByPath(newChanges);
        setChanges(dedupedChanges);
        return;
      }

      const headCommit = currentRepo.commits[0];
      const detectedChanges: FileChange[] = [];

      const allFilesToScan = await getAllProjectFiles(projectId!);

      if (fileDocManager) {
        const textFiles = allFilesToScan.filter(filePath => 
          filePath.endsWith('.tex') || filePath.endsWith('.typ') || filePath.endsWith('.md') || filePath.endsWith('.txt')
        );
        
        for (const filePath of textFiles) {
          try {
            // This will load the file into Yjs if not already loaded
            const doc = fileDocManager.getDocument(filePath, true); // silent=true
          } catch {
          }
        }
      }

      for (const filePath of allFilesToScan) {
        try {
          // Read current file content - always trust Yjs when available (IDBFS can be stale)
          let currentContent = "";
          try {
            if (fileDocManager) {
              const doc = fileDocManager.getDocument(filePath, true); // silent=true
              if (doc && doc.text && doc.text.toString().length > 0) {
                currentContent = doc.text.toString();
              } else {
                const { mount } = await import("@wwog/idbfs");
                const fs = await mount();
                const contentBuffer = await fs.readFile(filePath);
                currentContent = new TextDecoder().decode(contentBuffer);
              }
            } else {
              const { mount } = await import("@wwog/idbfs");
              const fs = await mount();
              const contentBuffer = await fs.readFile(filePath);
              currentContent = new TextDecoder().decode(contentBuffer);
            }
          } catch {
          }

          // Check if file exists in last commit
          const lastCommit = currentRepo.commits[0];
          const fileInCommit = lastCommit.files.find((f: any) => f.path === filePath);
          
          if (!fileInCommit) {
            detectedChanges.push({
              path: filePath,
              status: "added" as const,
              staged: false,
            });
          } else {
            // File exists - check if content changed
            const contentHash = GitStore.calculateFileHash(currentContent);
            if (contentHash !== fileInCommit.hash) {
              detectedChanges.push({
                path: filePath,
                status: "modified" as const,
                staged: false,
              });
            }
          }
        } catch (error) {
          console.error(`Failed to check file changes for ${filePath}:`, error);
        }
      }

      const dedupedChanges = dedupeChangesByPath(detectedChanges);
      setChanges(dedupedChanges);
    } catch (error) {
      console.error("Failed to detect file changes:", error);
    } finally {
      setIsDetectingChanges(false);
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
        const fullPath = change.path;
        try {
          if (bufferManager) {
            bufferManager.saveActiveToCache();
            actualContent = bufferManager.getCachedContent(fullPath) || bufferManager.getBufferContent() || "";
          }
        } catch {
          actualContent = `// Error getting content for ${change.path}`;
        }

        return {
          path: change.path, // Keep full filename with extension
          status: change.status,
          newContent: actualContent
        };
      });

      const commitId = await gitStore.createCommit(
        stableRepoName!,
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
        if (onCloseFile) {
          onCloseFile(change.path);
        }
      });
      
    } catch (error) {
      console.error("Failed to create commit:", error);
    } finally {
      setIsLoading(false);
    }
  }, [commitMessage, changes, projectId, filePaths, onCloseFile]);

  const handleFileClick = useCallback(async (filePath: string) => {
    if (!stableRepoName) return;
    const fullPath = filePath;
    const fileName = filePath.split("/").pop() || filePath;
    
    if (fullPath && onFileSelect) {
      // Get current content from Yjs first (most up-to-date source)
      let currentContent = "";
      try {
        if (fileDocManager) {
          const doc = fileDocManager.getDocument(fullPath, true); // silent=true
          if (doc && doc.text && doc.text.toString().length > 0) {
            currentContent = doc.text.toString();
          } else {
            const { mount } = await import("@wwog/idbfs");
            const fs = await mount();
            const contentBuffer = await fs.readFile(fullPath);
            currentContent = new TextDecoder().decode(contentBuffer);
          }
        } else {
          const { mount } = await import("@wwog/idbfs");
          const fs = await mount();
          const contentBuffer = await fs.readFile(fullPath);
          currentContent = new TextDecoder().decode(contentBuffer);
        }
      } catch {
      }

      // Get original content from last commit
      let originalContent = "";
      
      try {
        const repo = await gitStore.getRepository(stableRepoName!);
        if (repo && repo.commits.length > 0) {
          const lastCommit = repo.commits[0];
          const fileInCommit = lastCommit.files.find((f: any) => f.path === fullPath);
          if (fileInCommit) {
            originalContent = fileInCommit.content;
          }
        }
      } catch {
      }

      // Open file with diff data - no suffix for cleaner UI
      onFileSelect(fullPath, { currentContent, originalContent });
    }
  }, [bufferManager, fileDocManager, onFileSelect, projectId, stableRepoName]);

  const stagedCount = changes.filter((c) => c.staged).length;

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
        <div className="relative flex items-center gap-2" ref={branchDropdownRef}>
          <IconGitBranch />
          <button
            type="button"
            onClick={() => setShowBranchDropdown(!showBranchDropdown)}
            className="flex items-center gap-1 px-2 py-1 text-xs bg-[color-mix(in_srgb,var(--border)_22%,transparent)] border border-[var(--border)] rounded text-[var(--foreground)] hover:bg-[color-mix(in_srgb,var(--border)_45%,transparent)] transition-colors"
          >
            {branch}
            <span className={`transition-transform ${showBranchDropdown ? 'rotate-180' : ''}`}>
              <IconChevronDown />
            </span>
          </button>
          {showBranchDropdown && (
            <div className="absolute left-0 top-full mt-1 z-50 min-w-[120px] bg-[var(--background)] border border-[var(--border)] rounded shadow-lg overflow-hidden">
              <button
                onClick={() => {
                  setBranch("main");
                  setShowBranchDropdown(false);
                }}
                className={`w-full text-left px-2 py-1.5 text-xs hover:bg-[color-mix(in_srgb,var(--accent)_8%,transparent)] transition-colors ${
                  branch === "main" ? "bg-[color-mix(in_srgb,var(--accent)_15%,transparent)] text-[var(--accent)]" : "text-[var(--foreground)]"
                }`}
              >
                main
              </button>
              <button
                onClick={() => {
                  setBranch("feature");
                  setShowBranchDropdown(false);
                }}
                className={`w-full text-left px-2 py-1.5 text-xs hover:bg-[color-mix(in_srgb,var(--accent)_8%,transparent)] transition-colors ${
                  branch === "feature" ? "bg-[color-mix(in_srgb,var(--accent)_15%,transparent)] text-[var(--accent)]" : "text-[var(--foreground)]"
                }`}
              >
                feature
              </button>
              <button
                onClick={() => {
                  setBranch("develop");
                  setShowBranchDropdown(false);
                }}
                className={`w-full text-left px-2 py-1.5 text-xs hover:bg-[color-mix(in_srgb,var(--accent)_8%,transparent)] transition-colors ${
                  branch === "develop" ? "bg-[color-mix(in_srgb,var(--accent)_15%,transparent)] text-[var(--accent)]" : "text-[var(--foreground)]"
                }`}
              >
                develop
              </button>
            </div>
          )}
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
            
            {/* Show initial commit results */}
            {initialCommitFiles.length > 0 && (
              <div className="mt-6 w-full max-w-md">
                <div className="text-xs text-[var(--muted)] mb-2">Initial commit included:</div>
                <div className="bg-[var(--muted)]/10 rounded border border-[var(--border)] p-2 max-h-32 overflow-auto">
                  {initialCommitFiles.map((file, index) => (
                    <div key={index} className="text-xs text-[var(--foreground)] truncate">
                      {file}
                    </div>
                  ))}
                </div>
                <div className="text-xs text-[var(--muted)] mt-1">
                  {initialCommitFiles.length} file{initialCommitFiles.length !== 1 ? 's' : ''} committed
                </div>
              </div>
            )}
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
                  type="button"
                  role="checkbox"
                  aria-checked={
                    stagedCount === changes.length && changes.length > 0
                      ? true
                      : stagedCount > 0
                        ? "mixed"
                        : false
                  }
                  onClick={() => stagedCount === changes.length ? unstageAll() : stageAll()}
                  disabled={changes.length === 0}
                  className={`w-4 h-4 rounded-[4px] border flex items-center justify-center shrink-0 transition-colors ${
                    stagedCount === 0
                      ? "border-[color-mix(in_srgb,var(--border)_70%,transparent)] bg-transparent"
                      : stagedCount === changes.length
                        ? "border-[color-mix(in_srgb,var(--accent)_60%,transparent)] bg-[color-mix(in_srgb,var(--accent)_60%,transparent)]"
                        : "border-[color-mix(in_srgb,var(--accent)_60%,transparent)] bg-[color-mix(in_srgb,var(--accent)_60%,transparent)]"
                  } ${changes.length === 0 ? "opacity-50 cursor-not-allowed" : "hover:border-[color-mix(in_srgb,var(--accent)_70%,transparent)]"}`}
                  title={stagedCount === changes.length ? "Unstage all" : "Stage all"}
                >
                  {stagedCount > 0 && stagedCount < changes.length && (
                    <span className="w-3 h-3 text-white flex items-center justify-center">
                      <IconMinus />
                    </span>
                  )}
                  {stagedCount === changes.length && changes.length > 0 && (
                    <span className="w-3 h-3 text-white flex items-center justify-center">
                      <IconCheck />
                    </span>
                  )}
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
                    currentPath === change.path
                      ? "bg-[color-mix(in_srgb,var(--accent)_18%,transparent)]"
                      : "hover:bg-[color-mix(in_srgb,var(--border)_45%,transparent)]"
                  }`}
                  onClick={() => handleFileClick(change.path)}
                >
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={change.staged}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleStage(i);
                    }}
                    className={`w-4 h-4 rounded-[4px] border flex items-center justify-center shrink-0 transition-colors ${
                      change.staged
                        ? "border-[color-mix(in_srgb,var(--accent)_60%,transparent)] bg-[color-mix(in_srgb,var(--accent)_60%,transparent)]"
                        : "border-[color-mix(in_srgb,var(--border)_70%,transparent)] bg-transparent"
                    } hover:border-[color-mix(in_srgb,var(--accent)_70%,transparent)]`}
                    title={change.staged ? "Unstage" : "Stage"}
                  >
                    {change.staged && (
                      <span className="w-2.5 h-2.5 text-white flex items-center justify-center">
                        <IconCheck />
                      </span>
                    )}
                  </button>
                  <span className="truncate min-w-0 flex-1" title={change.path}>{change.path.split('/').pop() || change.path}</span>
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
