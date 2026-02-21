"use client";

import { useState, useEffect, useRef } from "react";

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
        <div className="mb-4">
          <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
            Share Link
          </label>
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
              className="px-3 py-2 rounded text-sm bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-medium transition-colors"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>

        {/* Warning Section */}
        <div className="mb-4 p-3 rounded bg-[color-mix(in_srgb,var(--accent)_8%,transparent)] border border-[color-mix(in_srgb,var(--accent)_22%,transparent)]">
          <div className="flex items-start gap-2">
            <div className="text-[var(--accent)] mt-0.5">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="text-sm">
              <h3 className="font-semibold text-[var(--foreground)] mb-2">Important Security Notice</h3>
              <ul className="text-[var(--muted)] space-y-1">
                <li>• This is a <strong>peer-to-peer (P2P)</strong> connection</li>
                <li>• Shared users will have <strong>full read/write permissions</strong></li>
                <li>• All changes are <strong>immediately synced</strong> between participants</li>
                <li>• <strong>No access control</strong> - anyone with the link can join</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Recommendations */}
        <div className="mb-4 p-3 rounded bg-[color-mix(in_srgb,var(--border)_18%,transparent)] border border-[var(--border)]">
          <div className="flex items-start gap-2">
            <div className="text-[var(--muted)] mt-0.5">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="text-sm">
              <h3 className="font-semibold text-[var(--foreground)] mb-2">Recommendations</h3>
              <ul className="text-[var(--muted)] space-y-1">
                <li>• <strong>Use Git</strong> for version control and collaboration</li>
                <li>• <strong>Export project</strong> before sharing if you don't trust recipients</li>
                <li>• <strong>Create a backup</strong> of important work</li>
                <li>• Consider <strong>creating a separate project</strong> for collaboration</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-3 py-2 rounded text-sm text-[var(--muted)] hover:bg-[color-mix(in_srgb,var(--border)_35%,transparent)] hover:text-[var(--foreground)] transition-colors"
          >
            Close
          </button>
          <button
            onClick={handleCopy}
            className="px-3 py-2 rounded text-sm bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-medium transition-colors"
          >
            {copied ? "Copied!" : "Copy Link"}
          </button>
        </div>
      </div>
    </div>
  );
}
