"use client";

import { useState, useEffect, useRef } from "react";
import { IconCopy, IconToggleRight, IconCheckSquare } from "./Icons";

interface ShareModalProps {
  isOpen: boolean;
  shareUrl: string;
  projectName: string;
  webrtcEnabled: boolean;
  onClose: () => void;
  onEnableWebrtc?: () => void;
}

export function ShareModal({ isOpen, shareUrl, projectName, webrtcEnabled, onClose, onEnableWebrtc }: ShareModalProps) {
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy to clipboard:", error);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-md bg-black/50"
      onClick={handleBackdropClick}
    >
      <div className="w-full max-w-md rounded-lg border border-[var(--border)] bg-[var(--background)] shadow-xl p-4">
        <h2 className="text-sm font-semibold text-[var(--foreground)] mb-3">
          Share Project: {projectName}
        </h2>

        {/* WebRTC Warning */}
        {!webrtcEnabled && (
          <div className="mb-3 p-3 rounded border border-[color-mix(in_srgb,var(--accent)_22%,transparent)] bg-[color-mix(in_srgb,var(--accent)_8%,transparent)]">
            <div className="flex items-start gap-2">
              <span className="text-[var(--accent)] mt-0.5">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                </svg>
              </span>
              <div className="flex-1">
                <p className="text-sm text-[var(--foreground)] font-medium">
                  Real-time collaboration is disabled
                </p>
                <p className="text-xs text-[var(--muted)] mt-1">
                  Enable WebRTC in settings to share this project with live collaboration.
                  Without it, recipients will only see a static copy.
                </p>
                {onEnableWebrtc && (
                  <button
                    onClick={onEnableWebrtc}
                    className="mt-2 px-3 py-1.5 text-xs rounded bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] transition-colors"
                  >
                    Enable WebRTC
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Share URL Input */}
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={shareUrl}
            readOnly
            className="flex-1 px-3 py-2 text-sm rounded bg-[color-mix(in_srgb,var(--border)_22%,transparent)] border border-[var(--border)] text-[var(--foreground)] placeholder-[var(--muted)] font-mono"
          />
          <button
            onClick={handleCopy}
            className="px-3 py-2 rounded flex items-center justify-center bg-[color-mix(in_srgb,var(--accent)_8%,transparent)] border border-[var(--border)] text-[var(--foreground)] hover:bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] transition-colors"
            title={copied ? "Copied!" : "Copy"}
          >
            {copied ? <IconCheckSquare /> : <IconCopy />}
          </button>
        </div>
      </div>
    </div>
  );
}
