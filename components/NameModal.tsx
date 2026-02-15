"use client";

import { useState, useEffect, useRef } from "react";

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
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-md bg-black/50"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-lg border border-zinc-700 bg-zinc-900 shadow-xl p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-sm font-semibold text-zinc-100 mb-3">{title}</h2>
        <form onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded bg-zinc-800 border border-zinc-600 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 focus:border-transparent mb-3"
            placeholder={placeholder}
          />
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 rounded text-sm text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3 py-2 rounded text-sm bg-zinc-600 hover:bg-zinc-500 text-white font-medium transition-colors"
            >
              {label}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
