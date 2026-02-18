"use client";

import { useEffect, useState } from "react";
import { initializeModel, setProgressCallback, checkWebGPUSupport } from "@/lib/localModel";

interface AIModelDownloadProgressProps {
  onModelReady: (ready: boolean) => void;
  /** Compact layout for input bar (model name + status only) */
  compact?: boolean;
}

/**
 * Isolated component for AI model download progress. Owns its own state so
 * progress updates don't trigger parent re-renders (which would cause the
 * editor to recalculate height).
 */
export function AIModelDownloadProgress({ onModelReady, compact }: AIModelDownloadProgressProps) {
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [modelReady, setModelReady] = useState(false);

  useEffect(() => {
    if (!checkWebGPUSupport()) return;

    let lastUpdate = 0;
    const throttleMs = 200;
    setProgressCallback((progress, stats) => {
      const now = Date.now();
      if (now - lastUpdate < throttleMs && progress < 100) return;
      lastUpdate = now;
      setDownloadProgress(progress);
    });

    (async () => {
      try {
        const ok = await initializeModel();
        setModelReady(ok);
        onModelReady(ok);
      } catch (e) {
        console.warn("Model init failed:", e);
        onModelReady(false);
      } finally {
        setProgressCallback(() => {});
      }
    })();

    return () => setProgressCallback(() => {});
  }, [onModelReady]);

  if (compact) {
    return (
      <div className="flex items-center gap-2 text-xs text-[var(--muted)] shrink-0">
        <span>LFM2.5-1.2B</span>
        {modelReady ? (
          <span className="text-[var(--accent)]">Ready</span>
        ) : (
          <span className="tabular-nums">{Math.round(downloadProgress)}%</span>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 px-3 py-1.5 text-sm text-[var(--muted)] shrink-0">
      <span>AI assistant</span>
      {modelReady ? (
        <span className="text-[var(--accent)]">Ready</span>
      ) : (
        <>
          <span className="tabular-nums text-[var(--muted)]">{Math.round(downloadProgress)}%</span>
          <div className="flex-1 min-w-[60px] h-1 rounded-full bg-[color-mix(in_srgb,var(--border)_60%,transparent)] overflow-hidden">
            <div
              className="h-full bg-[color-mix(in_srgb,var(--accent)_80%,transparent)] rounded-full transition-[width] duration-300 ease-out"
              style={{ width: `${downloadProgress}%` }}
            />
          </div>
        </>
      )}
    </div>
  );
}
