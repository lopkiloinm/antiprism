"use client";

import { useState, useEffect, useMemo } from "react";
import { logger, type LogEntry } from "@/lib/logger";
import { SummaryView } from "./SummaryView";

interface ToolsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  summaryContent?: string;
  summaryData?: any;
  /** Raw summary content (pre-parsed TexCount output) */
  summaryRaw?: string;
}

/* ── Yjs Log Display component ── */

function YjsLogDisplay({ logs, category }: { logs: LogEntry[]; category: string }) {
  if (logs.length === 0) {
    return (
      <div className="text-sm text-[var(--muted)] italic">
        No {category} logs available
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {logs.map((entry: LogEntry, i: number) => (
        <div
          key={i}
          className={`text-sm font-mono p-3 rounded border ${
            entry.level === "error"
              ? "bg-red-500/10 text-red-400 border-red-500/20"
              : entry.level === "warn"
                ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                : "bg-[color-mix(in_srgb,var(--border)_10%,transparent)] text-[var(--muted)] border-[var(--border)]"
          }`}
        >
          <div className="flex items-start gap-2">
            <span className="text-[var(--muted)] text-xs min-w-[80px]">
              {new Date(entry.timestamp).toLocaleTimeString()}
            </span>
            <div className="flex-1">
              <div className="font-medium mb-1">{entry.message}</div>
              <div className="text-xs mb-1">Level: {entry.level.toUpperCase()}</div>
              {entry.data && (
                <>
                  <div className="text-xs space-y-0.5">
                    {entry.data.path && <div>Path: {entry.data.path}</div>}
                    {typeof entry.data.totalChars === "number" && <div>Total chars: {entry.data.totalChars}</div>}
                    {typeof entry.data.deltaChars === "number" && (
                      <div>
                        Delta chars: {entry.data.deltaChars > 0 ? `+${entry.data.deltaChars}` : entry.data.deltaChars}
                      </div>
                    )}
                    {typeof entry.data.deltaOps === "number" && <div>Delta ops: {entry.data.deltaOps}</div>}
                    {typeof entry.data.local === "boolean" && <div>Local: {entry.data.local ? "yes" : "no"}</div>}
                    {entry.data.docGuid && <div>Doc GUID: {entry.data.docGuid}</div>}
                    {entry.data.roomId && <div>Room ID: {entry.data.roomId}</div>}
                    {typeof entry.data.updateBytes === "number" && <div>Update bytes: {entry.data.updateBytes}</div>}
                  </div>
                  <details className="text-xs mt-2">
                    <summary className="cursor-pointer text-[var(--muted)] hover:text-[var(--foreground)]">Raw payload</summary>
                    <pre className="mt-1 text-[var(--muted)] whitespace-pre-wrap break-all">
                      {JSON.stringify(entry.data, null, 2)}
                    </pre>
                  </details>
                </>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

type ToolsTab = "summary" | "ai-logs" | "latex-logs" | "typst-logs" | "yjs-logs" | "git-logs";

/* ── Tab button ── */

function TabButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors whitespace-nowrap ${
        active
          ? "bg-[var(--background)] text-[var(--foreground)]"
          : "bg-[color-mix(in_srgb,var(--border)_18%,transparent)] text-[var(--muted)] hover:bg-[color-mix(in_srgb,var(--border)_35%,transparent)] hover:text-[var(--foreground)]"
      }`}
    >
      {label}
    </button>
  );
}

/* ── Rich/Raw toggle ── */

function ViewToggle({ isRaw, onToggle }: { isRaw: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded border border-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[color-mix(in_srgb,var(--border)_35%,transparent)] transition-colors"
      title={isRaw ? "Switch to rich view" : "Switch to raw view"}
    >
      {isRaw ? "Raw" : "Rich"}
    </button>
  );
}


/* ── Log Display component ── */

function DetailedLogDisplay({ logs, category }: { logs: LogEntry[]; category: string }) {
  if (logs.length === 0) {
    return (
      <div className="text-sm text-[var(--muted)] italic">
        No {category} logs available
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {logs.map((entry: LogEntry, i: number) => (
        <div
          key={i}
          className={`text-sm font-mono p-3 rounded border ${
            entry.level === "error"
              ? "bg-red-500/10 text-red-400 border-red-500/20"
              : entry.level === "warn"
                ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                : "bg-[color-mix(in_srgb,var(--border)_10%,transparent)] text-[var(--muted)] border-[var(--border)]"
          }`}
        >
          <div className="flex items-start gap-2">
            <span className="text-[var(--muted)] text-xs min-w-[80px]">
              {new Date(entry.timestamp).toLocaleTimeString()}
            </span>
            <div className="flex-1">
              <div className="font-medium mb-1">{entry.message}</div>
              <div className="text-xs mb-1">Level: {entry.level.toUpperCase()}</div>
              {entry.data && (
                <details className="text-xs mt-1">
                  <summary className="cursor-pointer text-[var(--muted)] hover:text-[var(--foreground)]">Raw payload</summary>
                  <pre className="mt-1 text-[var(--muted)] whitespace-pre-wrap break-all">
                    {JSON.stringify(entry.data, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── LaTeX Log Display component ── */

function LatexLogDisplay({ logs, category }: { logs: LogEntry[]; category: string }) {
  if (logs.length === 0) {
    return (
      <div className="text-sm text-[var(--muted)] italic">
        No {category} logs available
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {logs.map((entry: LogEntry, i: number) => (
        <div
          key={i}
          className={`text-sm font-mono p-3 rounded border ${
            entry.level === "error"
              ? "bg-red-500/10 text-red-400 border-red-500/20"
              : entry.level === "warn"
                ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                : "bg-[color-mix(in_srgb,var(--border)_10%,transparent)] text-[var(--muted)] border-[var(--border)]"
          }`}
        >
          <div className="flex items-start gap-2">
            <span className="text-[var(--muted)] text-xs min-w-[80px]">
              {new Date(entry.timestamp).toLocaleTimeString()}
            </span>
            <div className="flex-1">
              <div className="font-medium mb-1">{entry.message}</div>
              
              {/* 🎯 Better LaTeX log parsing */}
              {entry.data && entry.data.log && (
                <details className="text-xs">
                  <summary className="cursor-pointer text-[var(--muted)] hover:text-[var(--foreground)] mb-2">
                    LaTeX Output ({entry.data.success ? '✅ Success' : '❌ Error'})
                  </summary>
                  <div className="bg-[var(--background)] border border-[var(--border)] rounded p-2 max-h-96 overflow-x-auto overflow-y-auto">
                    <div className="font-mono text-xs text-[var(--foreground)] min-w-0">
                      {entry.data.log.split('\n').map((line: string, idx: number) => {
                        // Truncate very long paths to prevent overflow
                        const truncatedLine = line.length > 200 ? line.substring(0, 200) + '...' : line;
                        
                        // Color-code different types of lines
                        if (line.includes('EXITCODE: 0')) {
                          return <div key={idx} className="text-green-400 break-all">{truncatedLine}</div>;
                        } else if (line.includes('EXITCODE:')) {
                          return <div key={idx} className="text-red-400 break-all">{truncatedLine}</div>;
                        } else if (line.includes('Warning:')) {
                          return <div key={idx} className="text-yellow-400 break-all">{truncatedLine}</div>;
                        } else if (line.includes('Error:')) {
                          return <div key={idx} className="text-red-400 break-all">{truncatedLine}</div>;
                        } else if (line.includes('Package:')) {
                          return <div key={idx} className="text-blue-400 break-all">{truncatedLine}</div>;
                        } else if (line.includes('[') && line.includes(']')) {
                          return <div key={idx} className="text-green-300 break-all">{truncatedLine}</div>;
                        } else if (line.includes('kdebug:')) {
                          return <div key={idx} className="text-gray-500 break-all">{truncatedLine}</div>;
                        } else {
                          return <div key={idx} className="break-all">{truncatedLine}</div>;
                        }
                      })}
                    </div>
                  </div>
                  
                  {/* Show compilation stats */}
                  {entry.data.engine && (
                    <div className="mt-2 text-xs text-[var(--muted)]">
                      Engine: {entry.data.engine} | 
                      Success: {entry.data.success ? 'Yes' : 'No'} |
                      Lines: {entry.data.log.split('\n').length}
                    </div>
                  )}
                </details>
              )}
              
              {/* Fallback for other data */}
              {entry.data && !entry.data.log && (
                <details className="text-xs">
                  <summary className="cursor-pointer text-[var(--muted)]">Data</summary>
                  <pre className="mt-1 text-[var(--muted)] whitespace-pre-wrap">
                    {JSON.stringify(entry.data, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Main component ── */

export function ToolsPanel({
  isOpen,
  onClose,
  summaryContent,
  summaryData,
  summaryRaw,
}: ToolsPanelProps) {
  const [activeTab, setActiveTab] = useState<ToolsTab>("summary");
  const [summaryRawView, setSummaryRawView] = useState(false);
  const [aiLogs, setAiLogs] = useState<LogEntry[]>([]);
  const [latexLogs, setLatexLogs] = useState<LogEntry[]>([]);
  const [typstLogs, setTypstLogs] = useState<LogEntry[]>([]);
  const [yjsLogs, setYjsLogs] = useState<LogEntry[]>([]);
  const [gitLogs, setGitLogs] = useState<LogEntry[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize logs when panel opens
  useEffect(() => {
    if (isOpen && !isInitialized) {
      // Load logs
      const aiEntries = logger.getLogs("ai").slice(-200);
      const latexEntries = logger.getLogs("latex").slice(-50);
      const typstEntries = logger.getLogs("typst").slice(-200);
      const yjsEntries = logger.getLogs("yjs").slice(-200);
      
      const gitEntries = logger.getLogs("git").slice(-200);

      setAiLogs(aiEntries);
      setLatexLogs(latexEntries);
      setTypstLogs(typstEntries);
      setYjsLogs(yjsEntries);
      setGitLogs(gitEntries);
      setIsInitialized(true);
    }
  }, [isOpen, isInitialized]);

  // Subscribe to log updates
  useEffect(() => {
    const unsubscribe = logger.subscribe((category, logs) => {
      if (category === 'ai') {
        setAiLogs(logs.slice(-200));
      } else if (category === 'latex') {
        setLatexLogs(logs.slice(-50));
      } else if (category === 'typst') {
        setTypstLogs(logs.slice(-200));
      } else if (category === 'yjs') {
        setYjsLogs(logs.slice(-200));
      } else if (category === 'git') {
        setGitLogs(logs.slice(-200));
      }
    });
    
    return () => {
      // Cleanup if needed
    };
  }, []);

  // Reset state when panel closes
  useEffect(() => {
    if (!isOpen) {
      setIsInitialized(false);
    }
  }, [isOpen]);

  // Memoize effective summary content
  const effectiveSummaryRaw = useMemo(() => {
    if (summaryRawView && summaryRaw) {
      return summaryRaw;
    }
    return null;
  }, [summaryRawView, summaryRaw]);

  if (!isOpen) return null;

  return (
    <div className="relative flex flex-col h-full bg-[var(--background)] border-l border-[var(--border)]">
      {/* Header with tabs - matching FileTabs styling exactly */}
      <div className="relative h-12 shrink-0 border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--border)_18%,transparent)]">
        <div className="flex items-end h-full">
          <div
            className={`group relative flex items-center px-3 py-2 border-r border-[var(--border)] cursor-pointer shrink-0 h-full ${
              activeTab === "summary"
                ? "bg-[var(--background)] border-b-2 border-b-[var(--background)] -mb-px text-[var(--foreground)]"
                : "bg-[color-mix(in_srgb,var(--border)_18%,transparent)] text-[var(--muted)] hover:bg-[color-mix(in_srgb,var(--border)_35%,transparent)] hover:text-[var(--foreground)]"
            }`}
            onClick={() => setActiveTab("summary")}
          >
            <span className="text-sm">Summary</span>
          </div>
          <div
            className={`group relative flex items-center px-3 py-2 border-r border-[var(--border)] cursor-pointer shrink-0 h-full ${
              activeTab === "ai-logs"
                ? "bg-[var(--background)] border-b-2 border-b-[var(--background)] -mb-px text-[var(--foreground)]"
                : "bg-[color-mix(in_srgb,var(--border)_18%,transparent)] text-[var(--muted)] hover:bg-[color-mix(in_srgb,var(--border)_35%,transparent)] hover:text-[var(--foreground)]"
            }`}
            onClick={() => setActiveTab("ai-logs")}
          >
            <span className="text-sm">AI</span>
          </div>
          <div
            className={`group relative flex items-center px-3 py-2 border-r border-[var(--border)] cursor-pointer shrink-0 h-full ${
              activeTab === "latex-logs"
                ? "bg-[var(--background)] border-b-2 border-b-[var(--background)] -mb-px text-[var(--foreground)]"
                : "bg-[color-mix(in_srgb,var(--border)_18%,transparent)] text-[var(--muted)] hover:bg-[color-mix(in_srgb,var(--border)_35%,transparent)] hover:text-[var(--foreground)]"
            }`}
            onClick={() => setActiveTab("latex-logs")}
          >
            <span className="text-sm">LaTeX</span>
          </div>
          <div
            className={`group relative flex items-center px-3 py-2 border-r border-[var(--border)] cursor-pointer shrink-0 h-full ${
              activeTab === "typst-logs"
                ? "bg-[var(--background)] border-b-2 border-b-[var(--background)] -mb-px text-[var(--foreground)]"
                : "bg-[color-mix(in_srgb,var(--border)_18%,transparent)] text-[var(--muted)] hover:bg-[color-mix(in_srgb,var(--border)_35%,transparent)] hover:text-[var(--foreground)]"
            }`}
            onClick={() => setActiveTab("typst-logs")}
          >
            <span className="text-sm">Typst</span>
          </div>
          <div
            className={`group relative flex items-center px-3 py-2 border-r border-[var(--border)] cursor-pointer shrink-0 h-full ${
              activeTab === "yjs-logs"
                ? "bg-[var(--background)] border-b-2 border-b-[var(--background)] -mb-px text-[var(--foreground)]"
                : "bg-[color-mix(in_srgb,var(--border)_18%,transparent)] text-[var(--muted)] hover:bg-[color-mix(in_srgb,var(--border)_35%,transparent)] hover:text-[var(--foreground)]"
            }`}
            onClick={() => setActiveTab("yjs-logs")}
          >
            <span className="text-sm">Yjs</span>
          </div>
          <div
            className={`group relative flex items-center px-3 py-2 border-r border-[var(--border)] cursor-pointer shrink-0 h-full ${
              activeTab === "git-logs"
                ? "bg-[var(--background)] border-b-2 border-b-[var(--background)] -mb-px text-[var(--foreground)]"
                : "bg-[color-mix(in_srgb,var(--border)_18%,transparent)] text-[var(--muted)] hover:bg-[color-mix(in_srgb,var(--border)_35%,transparent)] hover:text-[var(--foreground)]"
            }`}
            onClick={() => setActiveTab("git-logs")}
          >
            <span className="text-sm">Git</span>
          </div>
          <div className="flex-1" />
          <button
            onClick={onClose}
            className="px-3 py-2 text-[var(--muted)] hover:bg-[color-mix(in_srgb,var(--border)_35%,transparent)] hover:text-[var(--foreground)] transition-colors"
            title="Close tools panel"
          >
            ×
          </button>
        </div>
      </div>

      {/* Sub-header with toggle (for summary only) */}
      {activeTab === "summary" && (
        <div className="h-8 shrink-0 flex items-center justify-end px-3 border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--border)_10%,transparent)]">
          <ViewToggle
            isRaw={summaryRawView}
            onToggle={() => setSummaryRawView((v: boolean) => !v)}
          />
        </div>
      )}

      {/* Content – absolute so it gets a real pixel height and scrolls */}
      <div className="relative flex-1">
        <div className="absolute inset-0 overflow-y-auto p-4">
          {/* ── Summary tab ── */}
          {activeTab === "summary" && (
            <div>
              {summaryRawView ? (
                effectiveSummaryRaw ? (
                  <div className="text-sm text-[var(--foreground)] whitespace-pre-wrap font-mono">{effectiveSummaryRaw}</div>
                ) : (
                  <div className="text-sm text-[var(--muted)] italic">Loading summary...</div>
                )
              ) : (
                (summaryContent || summaryData) ? (
                  <SummaryView summaryContent={summaryContent || ""} summaryData={summaryData} />
                ) : (
                  <div className="text-sm text-[var(--muted)] italic">Loading summary...</div>
                )
              )}
            </div>
          )}

          {/* ── AI Logs tab ── */}
          {activeTab === "ai-logs" && (
            !isInitialized ? (
              <div className="text-sm text-[var(--muted)] italic">Loading logs...</div>
            ) : (
              <DetailedLogDisplay logs={aiLogs} category="AI" />
            )
          )}

          {/* ── LaTeX Logs tab ── */}
          {activeTab === "latex-logs" && (
            !isInitialized ? (
              <div className="text-sm text-[var(--muted)] italic">Loading logs...</div>
            ) : (
              <LatexLogDisplay logs={latexLogs} category="LaTeX" />
            )
          )}

          {/* ── Typst Logs tab ── */}
          {activeTab === "typst-logs" && (
            !isInitialized ? (
              <div className="text-sm text-[var(--muted)] italic">Loading logs...</div>
            ) : (
              <DetailedLogDisplay logs={typstLogs} category="Typst" />
            )
          )}

          {/* ── Yjs Logs tab ── */}
          {activeTab === "yjs-logs" && (
            !isInitialized ? (
              <div className="text-sm text-[var(--muted)] italic">Loading logs...</div>
            ) : (
              <YjsLogDisplay logs={yjsLogs} category="Yjs" />
            )
          )}

          {/* ── Git Logs tab ── */}
          {activeTab === "git-logs" && (
            !isInitialized ? (
              <div className="text-sm text-[var(--muted)] italic">Loading git logs...</div>
            ) : (
              <DetailedLogDisplay logs={gitLogs} category="Git" />
            )
          )}
        </div>
      </div>
    </div>
  );
}
