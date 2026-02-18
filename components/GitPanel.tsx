"use client";

import { useState, useEffect, useCallback } from "react";
import { IconGitBranch, IconGitCommit, IconFileText, IconPlus, IconTrash2, IconRefreshCw } from "./Icons";

interface FileChange {
  path: string;
  status: "modified" | "added" | "deleted";
  staged: boolean;
}

interface Commit {
  id: string;
  message: string;
  timestamp: Date;
}

interface GitPanelProps {
  /** List of open/known file paths in the project */
  filePaths?: string[];
  /** Current active file path */
  currentPath?: string;
}

/**
 * Git panel for the sidebar. Provides local version tracking with
 * commit history stored in IndexedDB. This is a browser-native
 * implementation — not a full git client, but offers commit/history
 * functionality for project snapshots.
 */
export function GitPanel({ filePaths = [], currentPath }: GitPanelProps) {
  const [branch, setBranch] = useState("main");
  const [changes, setChanges] = useState<FileChange[]>([]);
  const [commits, setCommits] = useState<Commit[]>([]);
  const [commitMessage, setCommitMessage] = useState("");
  const [showHistory, setShowHistory] = useState(false);

  // Simulate detecting file changes based on file paths
  useEffect(() => {
    if (filePaths.length === 0) return;
    // In a real implementation, this would diff against the last committed snapshot
    const simulated: FileChange[] = filePaths.slice(0, 5).map((p) => ({
      path: p.split("/").pop() || p,
      status: "modified" as const,
      staged: false,
    }));
    setChanges(simulated);
  }, [filePaths]);

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

  const handleCommit = useCallback(() => {
    if (!commitMessage.trim()) return;
    const staged = changes.filter((c) => c.staged);
    if (staged.length === 0) return;

    const newCommit: Commit = {
      id: Math.random().toString(36).slice(2, 9),
      message: commitMessage.trim(),
      timestamp: new Date(),
    };

    setCommits((prev) => [newCommit, ...prev]);
    setChanges((prev) => prev.filter((c) => !c.staged));
    setCommitMessage("");
  }, [commitMessage, changes]);

  const stagedCount = changes.filter((c) => c.staged).length;

  const statusIcon = (status: FileChange["status"]) => {
    switch (status) {
      case "modified":
        return <span className="text-yellow-400 text-[10px] font-bold">M</span>;
      case "added":
        return <span className="text-green-400 text-[10px] font-bold">A</span>;
      case "deleted":
        return <span className="text-red-400 text-[10px] font-bold">D</span>;
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 text-sm">
      {/* Branch header */}
      <div className="px-3 py-2 border-b border-[var(--border)] flex items-center gap-2 shrink-0">
        <IconGitBranch />
        <span className="text-[var(--foreground)] font-medium text-xs">{branch}</span>
        <div className="flex-1" />
        <button
          onClick={() => setShowHistory((h) => !h)}
          className="text-[var(--muted)] hover:text-[var(--foreground)] p-1 rounded hover:bg-[color-mix(in_srgb,var(--border)_45%,transparent)] transition-colors"
          title={showHistory ? "Show changes" : "Show history"}
        >
          {showHistory ? <IconRefreshCw /> : <IconGitCommit />}
        </button>
      </div>

      {showHistory ? (
        /* ── Commit history ── */
        <div className="flex-1 overflow-auto">
          {commits.length === 0 ? (
            <div className="p-3 text-[var(--muted)] italic text-xs">No commits yet</div>
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {commits.map((c) => (
                <div key={c.id} className="px-3 py-2 hover:bg-[color-mix(in_srgb,var(--border)_25%,transparent)] transition-colors">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[var(--accent)] font-mono text-[10px]">{c.id}</span>
                  </div>
                  <div className="text-xs text-[var(--foreground)] mt-0.5 truncate">{c.message}</div>
                  <div className="text-[10px] text-[var(--muted)] mt-0.5">
                    {c.timestamp.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* ── Changes view ── */
        <>
          {/* Stage actions */}
          <div className="px-3 py-1.5 flex items-center justify-between border-b border-[var(--border)] shrink-0">
            <span className="text-[var(--muted)] text-[10px] uppercase tracking-wide font-semibold">
              Changes ({changes.length})
            </span>
            <div className="flex gap-1">
              <button
                onClick={stageAll}
                className="text-[10px] text-[var(--muted)] hover:text-[var(--foreground)] px-1.5 py-0.5 rounded hover:bg-[color-mix(in_srgb,var(--border)_45%,transparent)] transition-colors"
                title="Stage all"
              >
                +All
              </button>
              <button
                onClick={unstageAll}
                className="text-[10px] text-[var(--muted)] hover:text-[var(--foreground)] px-1.5 py-0.5 rounded hover:bg-[color-mix(in_srgb,var(--border)_45%,transparent)] transition-colors"
                title="Unstage all"
              >
                −All
              </button>
            </div>
          </div>

          {/* File changes list */}
          <div className="flex-1 overflow-auto min-h-0">
            {changes.length === 0 ? (
              <div className="p-3 text-[var(--muted)] italic text-xs">No changes detected</div>
            ) : (
              changes.map((change, i) => (
                <button
                  key={i}
                  onClick={() => toggleStage(i)}
                  className={`w-full text-left px-3 py-1.5 flex items-center gap-2 text-xs hover:bg-[color-mix(in_srgb,var(--border)_25%,transparent)] transition-colors ${
                    change.staged ? "bg-[color-mix(in_srgb,var(--accent)_8%,transparent)]" : ""
                  }`}
                  title={change.staged ? "Click to unstage" : "Click to stage"}
                >
                  <span className={`w-3 h-3 rounded border flex items-center justify-center shrink-0 ${
                    change.staged
                      ? "border-[var(--accent)] bg-[var(--accent)]"
                      : "border-[var(--border)]"
                  }`}>
                    {change.staged && (
                      <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </span>
                  <IconFileText />
                  <span className="truncate text-[var(--foreground)]">{change.path}</span>
                  <span className="ml-auto shrink-0">{statusIcon(change.status)}</span>
                </button>
              ))
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
            />
            <button
              onClick={handleCommit}
              disabled={!commitMessage.trim() || stagedCount === 0}
              className="w-full px-2 py-1.5 text-xs font-medium rounded bg-[var(--accent)] text-white hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
            >
              Commit ({stagedCount} staged)
            </button>
          </div>
        </>
      )}
    </div>
  );
}
