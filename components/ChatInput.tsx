"use client";

import { useEffect, useRef } from "react";
import { IconSend, IconImage } from "@/components/Icons";
import { ModelDropdown } from "@/components/ModelDropdown";

interface ChatInputProps {
  chatInput: string;
  setChatInput: (v: string) => void;
  chatMode: "ask" | "agent";
  setChatMode: (m: "ask" | "agent") => void;
  isGenerating: boolean;
  onSend: () => void;
  selectedModelId?: string;
  onModelChange?: (id: string) => void;
  imageDataUrl?: string | null;
  onImageChange?: (dataUrl: string | null) => void;
  isVisionModel?: boolean;
}

export function ChatInput({
  chatInput,
  setChatInput,
  chatMode,
  setChatMode,
  isGenerating,
  onSend,
  selectedModelId,
  onModelChange,
  imageDataUrl,
  onImageChange,
  isVisionModel,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onImageChange) return;
    const reader = new FileReader();
    reader.onload = () => onImageChange(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "0";
    const h = Math.min(Math.max(el.scrollHeight, 24), 280);
    el.style.height = `${h}px`;
    el.style.overflowY = h >= 280 ? "auto" : "hidden";
  }, [chatInput]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <div className="flex flex-col shrink-0 mx-3 mb-2 rounded-lg border border-[var(--border)] bg-[color-mix(in_srgb,var(--border)_18%,transparent)] overflow-hidden">
      {isVisionModel && imageDataUrl && (
        <div className="mx-3 mt-2 relative inline-block">
          <img src={imageDataUrl} alt="Upload" className="max-h-24 rounded border border-[var(--border)]" />
          <button
            onClick={() => onImageChange?.(null)}
            className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[var(--foreground)] text-[var(--background)] flex items-center justify-center text-xs leading-none hover:opacity-80"
            title="Remove image"
          >
            &times;
          </button>
        </div>
      )}
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
      <textarea
        ref={textareaRef}
        className="w-full min-h-[24px] max-h-[280px] resize-none border-0 bg-transparent px-3 pt-3 pb-1 text-sm text-[var(--foreground)] placeholder-[var(--muted)] focus:outline-none focus:ring-0"
        value={chatInput}
        onChange={(e) => setChatInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={chatMode === "ask" ? "Ask about your LaTeX…" : "Describe the document to create…"}
        rows={1}
      />
      <div className="flex items-center justify-between gap-2 px-2 py-1.5 shrink-0">
        <div className="flex items-center gap-2">
          <div className="flex rounded bg-[color-mix(in_srgb,var(--border)_22%,transparent)] border border-[var(--border)] overflow-hidden">
            <button
              onClick={() => setChatMode("ask")}
              className={`px-2 py-1 text-xs font-medium transition-colors ${chatMode === "ask" ? "bg-[color-mix(in_srgb,var(--border)_55%,transparent)] text-[var(--foreground)]" : "text-[var(--muted)] hover:text-[var(--foreground)]"}`}
              title="Ask mode"
            >
              Ask
            </button>
            <button
              onClick={() => setChatMode("agent")}
              className={`px-2 py-1 text-xs font-medium transition-colors ${chatMode === "agent" ? "bg-[color-mix(in_srgb,var(--border)_55%,transparent)] text-[var(--foreground)]" : "text-[var(--muted)] hover:text-[var(--foreground)]"}`}
              title="Agent mode: create new LaTeX files"
            >
              Agent
            </button>
          </div>
          {selectedModelId && onModelChange && (
            <ModelDropdown
              selectedModelId={selectedModelId}
              onModelChange={onModelChange}
            />
          )}
        </div>
        <div className="flex items-center gap-1">
          {isVisionModel && onImageChange && (
            <button
              className="w-8 h-8 rounded flex items-center justify-center text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[color-mix(in_srgb,var(--border)_45%,transparent)] transition-colors shrink-0"
              onClick={() => fileInputRef.current?.click()}
              disabled={isGenerating}
              title="Attach image"
            >
              <IconImage />
            </button>
          )}
          <button
            className="w-8 h-8 rounded flex items-center justify-center bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white disabled:opacity-50 transition-colors shrink-0"
            onClick={onSend}
            disabled={isGenerating}
            title="Send"
          >
            <IconSend />
          </button>
        </div>
      </div>
    </div>
  );
}
