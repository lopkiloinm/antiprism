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

type ToolsTab = "summary" | "ai-logs" | "latex-logs" | "typst-logs";

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

function LogDisplay({ logs, category }: { logs: LogEntry[]; category: string }) {
  if (logs.length === 0) {
    return (
      <div className="text-sm text-[var(--muted)] italic">
        No {category} logs available
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {logs.map((entry: LogEntry, i: number) => (
        <div
          key={i}
          className={`text-sm font-mono p-2 rounded ${
            entry.level === "error"
              ? "bg-red-500/10 text-red-400"
              : entry.level === "warn"
                ? "bg-yellow-500/10 text-yellow-400"
                : "bg-[color-mix(in_srgb,var(--border)_10%,transparent)] text-[var(--muted)]"
          }`}
        >
          <div className="flex items-start gap-2">
            <span className="text-[var(--muted)] text-xs min-w-[80px]">
              {new Date(entry.timestamp).toLocaleTimeString()}
            </span>
            <span className="flex-1">{entry.message}</span>
            {entry.data && (
              <details className="text-xs">
                <summary className="cursor-pointer text-[var(--muted)]">Data</summary>
                <pre className="mt-1 text-[var(--muted)] whitespace-pre-wrap">
                  {JSON.stringify(entry.data, null, 2)}
                </pre>
              </details>
            )}
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
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize logs when panel opens
  useEffect(() => {
    if (isOpen && !isInitialized) {
      // Load logs
      const aiEntries = logger.getLogs("ai").slice(-50);
      const latexEntries = logger.getLogs("latex").slice(-50);
      const typstEntries = logger.getLogs("typst").slice(-50);
      
      setAiLogs(aiEntries);
      setLatexLogs(latexEntries);
      setTypstLogs(typstEntries);
      setIsInitialized(true);
    }
  }, [isOpen, isInitialized]);

  // Subscribe to log updates
  useEffect(() => {
    const unsubscribe = logger.subscribe((category, logs) => {
      if (category === 'ai') {
        setAiLogs(logs.slice(-50));
      } else if (category === 'latex') {
        setLatexLogs(logs.slice(-50));
      } else if (category === 'typst') {
        setTypstLogs(logs.slice(-50));
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
            className={`group relative flex items-center px-3 py-2 cursor-pointer shrink-0 h-full ${
              activeTab === "typst-logs"
                ? "bg-[var(--background)] border-b-2 border-b-[var(--background)] -mb-px text-[var(--foreground)]"
                : "bg-[color-mix(in_srgb,var(--border)_18%,transparent)] text-[var(--muted)] hover:bg-[color-mix(in_srgb,var(--border)_35%,transparent)] hover:text-[var(--foreground)]"
            }`}
            onClick={() => setActiveTab("typst-logs")}
          >
            <span className="text-sm">Typst</span>
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
              <LogDisplay logs={aiLogs} category="AI" />
            )
          )}

          {/* ── LaTeX Logs tab ── */}
          {activeTab === "latex-logs" && (
            !isInitialized ? (
              <div className="text-sm text-[var(--muted)] italic">Loading logs...</div>
            ) : (
              <LogDisplay logs={latexLogs} category="LaTeX" />
            )
          )}

          {/* ── Typst Logs tab ── */}
          {activeTab === "typst-logs" && (
            !isInitialized ? (
              <div className="text-sm text-[var(--muted)] italic">Loading logs...</div>
            ) : (
              <LogDisplay logs={typstLogs} category="Typst" />
            )
          )}
        </div>
      </div>
    </div>
  );
}
