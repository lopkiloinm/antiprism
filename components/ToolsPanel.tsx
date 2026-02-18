"use client";

import { useState, useMemo } from "react";
import { IconFileText, IconList, IconCode2 } from "./Icons";

interface ToolsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  summaryContent?: string;
  logsContent?: string;
  /** Raw summary content (pre-parsed TexCount output) */
  summaryRaw?: string;
  /** Raw logs content (unformatted) */
  logsRaw?: string;
}

type ToolsTab = "summary" | "logs";

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


/* ── Main component ── */

export function ToolsPanel({
  isOpen,
  onClose,
  summaryContent = "",
  logsContent = "",
  summaryRaw,
  logsRaw,
}: ToolsPanelProps) {
  const [activeTab, setActiveTab] = useState<ToolsTab>("summary");
  const [summaryRawView, setSummaryRawView] = useState(false);
  const [logsRawView, setLogsRawView] = useState(false);

  const parsedLogs = useMemo(() => parseLogs(logsContent), [logsContent]);
  const parsedSummary = useMemo(() => parseSummary(summaryContent), [summaryContent]);

  if (!isOpen) return null;

  const effectiveSummaryRaw = summaryRaw ?? summaryContent;
  const effectiveLogsRaw = logsRaw ?? logsContent;

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
          active={activeTab === "logs"}
          onClick={() => setActiveTab("logs")}
          icon={<IconList />}
          label="Logs"
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

      {/* Sub-header with toggle (for summary and logs) */}
      {(activeTab === "summary" || activeTab === "logs") && (
        <div className="h-8 shrink-0 flex items-center justify-end px-3 border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--border)_10%,transparent)]">
          <ViewToggle
            isRaw={activeTab === "summary" ? summaryRawView : logsRawView}
            onToggle={() =>
              activeTab === "summary"
                ? setSummaryRawView((v) => !v)
                : setLogsRawView((v) => !v)
            }
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

          {/* ── Logs tab ── */}
          {activeTab === "logs" && (
            <div>
              {logsRawView ? (
                logsContent ? (
                  <div className="text-sm text-[var(--foreground)] whitespace-pre-wrap font-mono">{effectiveLogsRaw}</div>
                ) : (
                  <div className="text-sm text-[var(--muted)] italic">No logs available</div>
                )
              ) : parsedLogs.length > 0 ? (
                <div className="space-y-1">
                  {parsedLogs.map((entry, i) => (
                    <div
                      key={i}
                      className={`flex gap-2 text-xs font-mono py-1 px-2 rounded ${
                        entry.level === "error"
                          ? "bg-red-500/10 text-red-400"
                          : entry.level === "warn"
                            ? "bg-yellow-500/10 text-yellow-400"
                            : "text-[var(--foreground)]"
                      }`}
                    >
                      <span className="text-[var(--muted)] shrink-0 tabular-nums text-[10px]">
                        {entry.timestamp.split("T")[1]?.slice(0, 8) || entry.timestamp}
                      </span>
                      <span
                        className={`shrink-0 uppercase text-[10px] font-semibold w-10 ${
                          entry.level === "error"
                            ? "text-red-400"
                            : entry.level === "warn"
                              ? "text-yellow-400"
                              : "text-[var(--muted)]"
                        }`}
                      >
                        {entry.level}
                      </span>
                      <span className="break-all">{entry.message}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-[var(--muted)] italic">No logs available</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
