import React from "react";

interface StreamingStats {
  tokensPerSec: number;
  totalTokens: number;
  elapsedSeconds: number;
  inputTokens: number;
  contextUsed: number;
}

interface ChatTelemetryProps {
  streamingStats: StreamingStats | null;
  isGenerating: boolean;
}

export function ChatTelemetry({ streamingStats, isGenerating }: ChatTelemetryProps) {
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-1.5 text-xs text-[var(--muted)] shrink-0 border-t border-[var(--border)]">
      <span className={isGenerating ? "text-[var(--muted)]" : streamingStats ? "text-[var(--accent)]" : "text-[var(--muted)]"}>
        {isGenerating ? "Streaming…" : streamingStats ? "Done!" : "—"}
      </span>
      <span className="tabular-nums">
        {streamingStats
          ? `${streamingStats.totalTokens} tokens · ${streamingStats.elapsedSeconds}s · ${streamingStats.tokensPerSec} tok/s · ${streamingStats.contextUsed.toLocaleString()} / 32K context`
          : "— tokens · — s · — tok/s · — context"}
      </span>
    </div>
  );
}
