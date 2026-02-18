"use client";

import { useState, useMemo, useEffect } from "react";
import { IconFileText, IconList, IconCode2, IconZap, IconType, IconFile } from "./Icons";
import { logger, type LogEntry } from "@/lib/logger";

interface ToolsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  summaryContent?: string;
  /** Raw summary content (pre-parsed TexCount output) */
  summaryRaw?: string;
}

type ToolsTab = "summary" | "ai-logs" | "latex-logs" | "typst-logs";

/* ── Parsed log helpers ── */

interface ParsedLogEntry {
  timestamp: string;
  level: "info" | "warn" | "error";
  message: string;
}

function parseLogs(raw: string): ParsedLogEntry[] {
  if (!raw) return [];
  return raw.split("\n").filter(Boolean).map((line) => {
    const level: ParsedLogEntry["level"] = line.includes("ERROR:")
      ? "error"
      : line.includes("WARN:")
        ? "warn"
        : "info";
    // Extract timestamp from [ISO] prefix
    const tsMatch = line.match(/^\[([^\]]+)\]\s*/);
    const timestamp = tsMatch ? tsMatch[1] : "";
    const message = tsMatch ? line.slice(tsMatch[0].length) : line;
    return { timestamp, level, message };
  });
}

/* ── Parsed summary helpers ── */

interface SummarySection {
  label: string;
  value: string;
}

function parseSummary(raw: string): SummarySection[] {
  if (!raw) return [];
  const sections: SummarySection[] = [];
  const lines = raw.split("\n");
  let currentKey = "";
  let currentValue: string[] = [];
  
  for (const line of lines) {
    if (line.startsWith("=")) continue;
    const colonIdx = line.indexOf(":");
    if (colonIdx > 0 && colonIdx < 40) {
      // Save previous key-value pair
      if (currentKey && currentValue.length > 0) {
        sections.push({ label: currentKey, value: currentValue.join(" ").trim() });
      }
      // Start new key-value pair
      currentKey = line.slice(0, colonIdx).trim();
      currentValue = [line.slice(colonIdx + 1).trim()];
    } else if (currentKey && line.trim()) {
      // Continuation of previous value
      currentValue.push(line.trim());
    }
  }
  
  // Save last key-value pair
  if (currentKey && currentValue.length > 0) {
    sections.push({ label: currentKey, value: currentValue.join(" ").trim() });
  }
  
  return sections;
}

/* ── Tab button ── */

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors whitespace-nowrap ${
        active
          ? "bg-[var(--background)] text-[var(--foreground)] border-b-2 border-b-[var(--accent)] -mb-px"
          : "bg-[color-mix(in_srgb,var(--border)_18%,transparent)] text-[var(--muted)] hover:bg-[color-mix(in_srgb,var(--border)_35%,transparent)] hover:text-[var(--foreground)]"
      }`}
    >
      {icon}
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
      <IconCode2 />
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
  summaryContent = "",
  summaryRaw,
}: ToolsPanelProps) {
  const [activeTab, setActiveTab] = useState<ToolsTab>("summary");
  const [summaryRawView, setSummaryRawView] = useState(false);
  const [aiLogs, setAiLogs] = useState<LogEntry[]>([]);
  const [latexLogs, setLatexLogs] = useState<LogEntry[]>([]);
  const [typstLogs, setTypstLogs] = useState<LogEntry[]>([]);

  const parsedSummary = useMemo(() => parseSummary(summaryContent), [summaryContent]);

  // Subscribe to log updates
  useEffect(() => {
    const unsubscribeAi = logger.subscribe((category, logs) => {
      if (category === 'ai') setAiLogs(logs);
    });
    const unsubscribeLatex = logger.subscribe((category, logs) => {
      if (category === 'latex') setLatexLogs(logs);
    });
    const unsubscribeTypst = logger.subscribe((category, logs) => {
      if (category === 'typst') setTypstLogs(logs);
    });

    // Initial load
    setAiLogs(logger.getLogs('ai'));
    setLatexLogs(logger.getLogs('latex'));
    setTypstLogs(logger.getLogs('typst'));

    return () => {
      unsubscribeAi();
      unsubscribeLatex();
      unsubscribeTypst();
    };
  }, []);

  if (!isOpen) return null;

  const effectiveSummaryRaw = summaryRaw ?? summaryContent;

  return (
    <div className="absolute inset-0 flex flex-col bg-[var(--background)]">
      {/* Header with tabs */}
      <div className="h-12 shrink-0 flex border-b border-[var(--border)]">
        <TabButton
          active={activeTab === "summary"}
          onClick={() => setActiveTab("summary")}
          icon={<IconFileText />}
          label="Summary"
        />
        <TabButton
          active={activeTab === "ai-logs"}
          onClick={() => setActiveTab("ai-logs")}
          icon={<IconZap />}
          label="AI"
        />
        <TabButton
          active={activeTab === "latex-logs"}
          onClick={() => setActiveTab("latex-logs")}
          icon={<IconType />}
          label="LaTeX"
        />
        <TabButton
          active={activeTab === "typst-logs"}
          onClick={() => setActiveTab("typst-logs")}
          icon={<IconFile />}
          label="Typst"
        />
        <div className="flex-1" />
        <button
          onClick={onClose}
          className="px-3 py-2 text-[var(--muted)] hover:bg-[color-mix(in_srgb,var(--border)_35%,transparent)] hover:text-[var(--foreground)] transition-colors"
          title="Close tools panel"
        >
          ×
        </button>
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
                summaryContent ? (
                  <div className="text-sm text-[var(--foreground)] whitespace-pre-wrap font-mono">{effectiveSummaryRaw}</div>
                ) : (
                  <div className="text-sm text-[var(--muted)] italic">No summary available</div>
                )
              ) : parsedSummary.length > 0 ? (
                <div className="space-y-1">
                  {parsedSummary.map((s, i) => (
                    <div key={i} className="flex gap-2 text-sm">
                      <span className="text-[var(--muted)] shrink-0 w-32 truncate" title={s.label}>{s.label}</span>
                      <span className="text-[var(--foreground)] font-medium break-words flex-1">{s.value}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-[var(--muted)] italic">No summary available</div>
              )}
            </div>
          )}

          {/* ── AI Logs tab ── */}
          {activeTab === "ai-logs" && (
            <LogDisplay logs={aiLogs} category="AI" />
          )}

          {/* ── LaTeX Logs tab ── */}
          {activeTab === "latex-logs" && (
            <LogDisplay logs={latexLogs} category="LaTeX" />
          )}

          {/* ── Typst Logs tab ── */}
          {activeTab === "typst-logs" && (
            <LogDisplay logs={typstLogs} category="Typst" />
          )}
        </div>
      </div>
    </div>
  );
}
