"use client";

import { useState, useEffect, useRef } from "react";
import { IconCopy, IconToggleRight, IconCheckSquare } from "./Icons";

interface ShareModalProps {
  isOpen: boolean;
  shareUrl: string;
  projectName: string;
  onClose: () => void;
}

export function ShareModal({ isOpen, shareUrl, projectName, onClose }: ShareModalProps) {
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
