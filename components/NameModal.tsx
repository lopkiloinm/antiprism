"use client";

import { useState, useEffect, useRef } from "react";
import { IconPlus } from "./Icons";

interface NameModalProps {
  isOpen: boolean;
  title: string;
  initialValue: string;
  placeholder?: string;
  submitLabel?: string;
  onClose: () => void;
  onConfirm: (value: string) => void;
}

export function NameModal({
  isOpen,
  title,
  initialValue,
  placeholder = "Enter name",
  submitLabel,
  onClose,
  onConfirm,
}: NameModalProps) {
  const [value, setValue] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setValue(initialValue);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [isOpen, initialValue]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim().replace(/^\//, "").replace(/\/$/, "");
    if (!trimmed) {
      onClose();
      return;
    }
    if (initialValue && trimmed === initialValue) {
      onClose();
      return;
    }
    onConfirm(trimmed);
    onClose();
  };

  const label = submitLabel ?? (initialValue ? "Rename" : "Create");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md bg-black/50"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-lg border border-[var(--border)] bg-[var(--background)] shadow-xl p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-sm font-semibold text-[var(--foreground)] mb-3">{title}</h2>
        <form onSubmit={handleSubmit}>
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="flex-1 px-3 py-2 text-sm rounded bg-[color-mix(in_srgb,var(--border)_22%,transparent)] border border-[var(--border)] text-[var(--foreground)] placeholder-[var(--muted)] focus:outline-none focus:ring-1 focus:ring-[color-mix(in_srgb,var(--accent)_55%,transparent)] focus:border-transparent"
              placeholder={placeholder}
            />
            <button
              type="submit"
              className="w-10 h-10 rounded flex items-center justify-center bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white transition-colors"
              title={label}
            >
              <IconPlus />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
