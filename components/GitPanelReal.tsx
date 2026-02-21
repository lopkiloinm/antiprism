"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { NameModal } from "./NameModal";
import { IconGitBranch, IconGitCommit, IconPlus, IconTrash2, IconCheckSquare, IconSquare, IconChevronDown, IconChevronUp } from "./Icons";
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
  filePaths: string[];
  currentPath?: string;
  projectName?: string;
  onFileSelect?: (filePath: string, options?: { currentContent?: string; originalContent?: string; showDiff?: boolean }) => void;
  onCloseFile?: (filePath: string) => void;
  projectId?: string;
  bufferManager?: any; // Buffer manager instance for file content access
  refreshTrigger?: number;
  fileDocManager?: any; // FileDocumentManager instance for direct Yjs access
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
    console.log('🔍 INIT DEBUG - Checking values:', { stableRepoName, projectId });
    if (!stableRepoName || !projectId) {
      console.log('🔍 INIT DEBUG - Missing values, returning early');
      return;
    }
    
    // Prevent multiple concurrent initializations
    if (isLoading) {
      console.log('🔍 INIT DEBUG - Already initializing, skipping');
      return;
    }
    
    setIsLoading(true);
    try {
      // Check if git repository already exists
      const existingRepo = await gitStore.getRepository(stableRepoName);
      if (existingRepo) {
        console.log('🔍 Git repository already exists, skipping initialization');
        setIsGitInitialized(true);
        await loadCommitHistory();
        await detectFileChanges();
        return;
      }

      console.log('🚀 Creating initial commit with all current files...');
      
      // Create repository first with project ID
      await gitStore.createRepository(stableRepoName, projectId);
      
      // Get ALL project files for initial commit, not just open tabs
      const allProjectFiles = await getAllProjectFiles(projectId);
      console.log('🔍 INITIAL COMMIT DEBUG - All project files:', allProjectFiles);
      
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
          
          console.log(`🔍 INITIAL COMMIT DEBUG - Content length for ${filePath}: ${actualContent.length}`);
          
          if (actualContent.length > 0) {
            console.log(`🔍 INITIAL COMMIT DEBUG - Adding file to commit: ${filePath}`);
            initialChanges.push({
              path: filePath,
              status: "added" as const,
              newContent: actualContent
            });
          } else {
            console.log(`🔍 INITIAL COMMIT DEBUG - Skipping empty file: ${filePath}`);
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
        console.log(`✅ Created initial commit ${commitId} with ${initialChanges.length} files`);
        console.log('🔍 Initial commit files:', initialChanges.map(c => c.path));
        
        // Store committed files for UI display
        setInitialCommitFiles(initialChanges.map(c => c.path));
        
        // Reload commit history and detect changes
        await loadCommitHistory();
        await detectFileChanges();
      } else {
        console.log('⚠️ No files with content found for initial commit');
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
    if (!stableRepoName || isDetectingChanges) {
      if (isDetectingChanges) {
        console.log('🔍 detectFileChanges skipped - already running');
      }
      return;
    }
    
    setIsDetectingChanges(true);
    try {
      console.log('🔍 detectFileChanges called for repo:', stableRepoName);
      const currentRepo = await gitStore.getRepository(stableRepoName);
      setRepo(currentRepo); // Store repo in state
      
      if (!currentRepo || currentRepo.commits.length === 0) {
        console.log('🔍 No commits found, showing all files as new');
        // No commits yet, show all files as new
        const allProjectFiles = await getAllProjectFiles(projectId!);
        console.log('🔍 All project files:', allProjectFiles);
        const newChanges: FileChange[] = allProjectFiles.map((p) => ({
          path: p,
          status: "added" as const,
          staged: false,
        }));
        setChanges(newChanges);
        console.log('🔍 Set changes (no commits):', newChanges);
        return; // Don't return early - repo is already set
      }

      const headCommit = currentRepo.commits[0];
      console.log('🔍 Head commit found with files:', headCommit.files.map((f: any) => ({ path: f.path, hash: f.hash })));
      const detectedChanges: FileChange[] = [];

      const allFilesToScan = await getAllProjectFiles(projectId!);
      console.log('🔍 Scanning files for changes:', allFilesToScan);

      // Pre-load all text files into Yjs to ensure we have the latest content
      if (fileDocManager) {
        console.log('🔍 Pre-loading text files into Yjs...');
        const textFiles = allFilesToScan.filter(filePath => 
          filePath.endsWith('.tex') || filePath.endsWith('.typ') || filePath.endsWith('.md') || filePath.endsWith('.txt')
        );
        
        for (const filePath of textFiles) {
          try {
            // This will load the file into Yjs if not already loaded
            const doc = fileDocManager.getDocument(filePath, true); // silent=true
            if (doc && doc.text) {
              console.log(`🔍 Pre-loaded ${filePath} into Yjs, content length: ${doc.text.toString().length}`);
            }
          } catch (error) {
            console.log(`🔍 Could not pre-load ${filePath} into Yjs:`, error);
          }
        }
      }

      for (const filePath of allFilesToScan) {
        try {
          // Read current file content - always trust Yjs when available (IDBFS can be stale)
          let currentContent = "";
          try {
            // For text files, always try to get content from Yjs first (most up-to-date)
            if (filePath.endsWith('.tex') || filePath.endsWith('.typ') || filePath.endsWith('.md') || filePath.endsWith('.txt')) {
              if (fileDocManager) {
                const doc = fileDocManager.getDocument(filePath, true); // silent=true
                if (doc && doc.text && doc.text.toString().length > 0) {
                  // Always use Yjs content when available - it's the most up-to-date
                  currentContent = doc.text.toString();
                  console.log(`🔍 File ${filePath}: got content from Yjs, length ${currentContent.length}`);
                } else {
                  // Fallback to IDBFS only if Yjs document is truly empty/unavailable
                  const { mount } = await import("@wwog/idbfs");
                  const fs = await mount();
                  const contentBuffer = await fs.readFile(filePath);
                  currentContent = new TextDecoder().decode(contentBuffer);
                  console.log(`🔍 File ${filePath}: got content from IDBFS (Yjs unavailable), length ${currentContent.length}`);
                }
              } else {
                // No fileDocManager available, use IDBFS
                const { mount } = await import("@wwog/idbfs");
                const fs = await mount();
                const contentBuffer = await fs.readFile(filePath);
                currentContent = new TextDecoder().decode(contentBuffer);
                console.log(`🔍 File ${filePath}: got content from IDBFS (no manager), length ${currentContent.length}`);
              }
            } else {
              // For binary files, read from IDBFS
              const { mount } = await import("@wwog/idbfs");
              const fs = await mount();
              const contentBuffer = await fs.readFile(filePath);
              currentContent = new TextDecoder().decode(contentBuffer);
              console.log(`🔍 File ${filePath}: binary file from IDBFS, length ${currentContent.length}`);
            }
          } catch (error) {
            console.log(`Could not get content for ${filePath}:`, error);
          }

          // Check if file exists in last commit
          const lastCommit = currentRepo.commits[0];
          const fileInCommit = lastCommit.files.find((f: any) => f.path === filePath);
          
          if (!fileInCommit) {
            console.log(`🔍 File ${filePath} not in commit, marking as added`);
            detectedChanges.push({
              path: filePath,
              status: "added" as const,
              staged: false,
            });
          } else {
            // File exists - check if content changed
            const contentHash = GitStore.calculateFileHash(currentContent);
            console.log(`🔍 File ${filePath}: current hash ${contentHash}, commit hash ${fileInCommit.hash}`);
            if (contentHash !== fileInCommit.hash) {
              console.log(`🔍 File ${filePath} changed, marking as modified`);
              detectedChanges.push({
                path: filePath,
                status: "modified" as const,
                staged: false,
              });
            } else {
              console.log(`🔍 File ${filePath} unchanged`);
            }
          }
        } catch (error) {
          console.error(`Failed to check file changes for ${filePath}:`, error);
        }
      }

      console.log('🔍 Final detected changes:', detectedChanges);
      setChanges(detectedChanges);
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
      
      console.log(`Created commit ${commitId}`);
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
        // For text files, try to get content from Yjs document manager first
        if (fullPath.endsWith('.tex') || fullPath.endsWith('.typ') || fullPath.endsWith('.md') || fullPath.endsWith('.txt')) {
          if (fileDocManager) {
            const doc = fileDocManager.getDocument(fullPath, true); // silent=true
            if (doc && doc.text && doc.text.toString().length > 0) {
              currentContent = doc.text.toString();
              console.log(`🔍 handleFileClick - got content from Yjs for ${fullPath}, length ${currentContent.length}`);
            } else {
              // Fallback to IDBFS if Yjs is empty
              const { mount } = await import("@wwog/idbfs");
              const fs = await mount();
              const contentBuffer = await fs.readFile(fullPath);
              currentContent = new TextDecoder().decode(contentBuffer);
              console.log(`🔍 handleFileClick - got content from IDBFS (Yjs empty) for ${fullPath}, length ${currentContent.length}`);
            }
          } else {
            // Fallback to IDBFS if manager not available
            const { mount } = await import("@wwog/idbfs");
            const fs = await mount();
            const contentBuffer = await fs.readFile(fullPath);
            currentContent = new TextDecoder().decode(contentBuffer);
            console.log(`🔍 handleFileClick - got content from IDBFS (no manager) for ${fullPath}, length ${currentContent.length}`);
          }
        } else {
          // For binary files, read from IDBFS
          const { mount } = await import("@wwog/idbfs");
          const fs = await mount();
          const contentBuffer = await fs.readFile(fullPath);
          currentContent = new TextDecoder().decode(contentBuffer);
          console.log(`🔍 handleFileClick - binary file from IDBFS for ${fullPath}, length ${currentContent.length}`);
        }
      } catch (error) {
        console.log(`Could not get content for ${fullPath}:`, error);
      }

      // Get original content from last commit
      let originalContent = "";
      let showDiff = true;
      
      try {
        const repo = await gitStore.getRepository(stableRepoName!);
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
          
          const fileInCommit = lastCommit.files.find((f: any) => f.path === fullPath);
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
            className="flex items-center gap-1 text-xs bg-[color-mix(in_srgb,var(--border)_22%,transparent)] border border-[var(--border)] text-[var(--foreground)] px-2 py-1 rounded hover:bg-[color-mix(in_srgb,var(--border)_35%,transparent)] transition-colors"
          >
            {branch}
            <span className="w-3 h-3 flex items-center">
              {showBranchDropdown ? <IconChevronUp /> : <IconChevronDown />}
            </span>
          </button>
          {showBranchDropdown && (
            <div className="absolute left-0 top-full mt-1 z-50 min-w-[120px] rounded border border-[var(--border)] bg-[var(--background)] py-1">
              <button
                onClick={() => {
                  setBranch("main");
                  setShowBranchDropdown(false);
                }}
                className={`w-full px-3 py-1.5 text-left text-xs text-[var(--foreground)] hover:bg-[color-mix(in_srgb,var(--border)_45%,transparent)] flex items-center gap-2 ${
                  branch === "main" ? "bg-[color-mix(in_srgb,var(--accent)_18%,transparent)]" : ""
                }`}
              >
                main
              </button>
              <button
                onClick={() => {
                  setBranch("feature");
                  setShowBranchDropdown(false);
                }}
                className={`w-full px-3 py-1.5 text-left text-xs text-[var(--foreground)] hover:bg-[color-mix(in_srgb,var(--border)_45%,transparent)] flex items-center gap-2 ${
                  branch === "feature" ? "bg-[color-mix(in_srgb,var(--accent)_18%,transparent)]" : ""
                }`}
              >
                feature
              </button>
              <button
                onClick={() => {
                  setBranch("develop");
                  setShowBranchDropdown(false);
                }}
                className={`w-full px-3 py-1.5 text-left text-xs text-[var(--foreground)] hover:bg-[color-mix(in_srgb,var(--border)_45%,transparent)] flex items-center gap-2 ${
                  branch === "develop" ? "bg-[color-mix(in_srgb,var(--accent)_18%,transparent)]" : ""
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
                    currentPath === change.path
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
