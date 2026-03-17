"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { IconSend, IconImage, IconMessageSquare, IconBraces, IconPencil } from "@/components/Icons";
import { ModelDropdown } from "@/components/ModelDropdown";

interface ChatInputProps {
  chatInput: string;
  setChatInput: (v: string) => void;
  chatMode: "ask" | "agent-latex" | "agent-typst" | "agent-beamer" | "edit";
  setChatMode: (m: "ask" | "agent-latex" | "agent-typst" | "agent-beamer" | "edit") => void;
  isGenerating: boolean;
  onSend: () => void;
  selectedModelId?: string;
  onModelChange?: (id: string) => void;
  imageDataUrl?: string | null;
  onImageChange?: (dataUrl: string | null) => void;
  isVisionModel?: boolean;
  chatContext?: "big" | "small";
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
  chatContext = "small",
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const modeButtonRef = useRef<HTMLButtonElement>(null);
  const modeMenuRef = useRef<HTMLDivElement>(null);
  const [isModeMenuOpen, setIsModeMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ bottom: 0, left: 0 });
  
  const allModeOptions = [
    { value: "ask" as const, label: "Ask", title: "Ask mode", Icon: IconMessageSquare },
    { value: "agent-latex" as const, label: "Create LaTeX", title: "Create LaTeX documents", Icon: IconBraces },
    { value: "agent-typst" as const, label: "Create Typst", title: "Create Typst documents", Icon: IconBraces },
    { value: "agent-beamer" as const, label: "Create Beamer", title: "Create Beamer slide decks", Icon: IconBraces },
    { value: "edit" as const, label: "Edit", title: "Edit mode: revise the active file and open a diff", Icon: IconPencil },
  ];
  const modeOptions = chatContext === "big" 
    ? allModeOptions.filter(option => option.value !== "edit")
    : allModeOptions;
  
  // Determine active mode
  const activeMode = modeOptions.find((option) => option.value === chatMode) ?? modeOptions[0];

  // Auto-switch to ask mode if we're in big chat and current mode is edit
  useEffect(() => {
    if (chatContext === "big" && chatMode === "edit") {
      setChatMode("ask");
    }
  }, [chatContext, chatMode, setChatMode]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onImageChange) return;
    
    // Compress image before storing
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      // Calculate new dimensions (max 800px width/height)
      const MAX_SIZE = 800;
      let { width, height } = img;
      
      if (width > MAX_SIZE || height > MAX_SIZE) {
        if (width > height) {
          height = (height * MAX_SIZE) / width;
          width = MAX_SIZE;
        } else {
          width = (width * MAX_SIZE) / height;
          height = MAX_SIZE;
        }
      }
      
      canvas.width = width;
      canvas.height = height;
      
      // Draw and compress
      ctx.drawImage(img, 0, 0, width, height);
      
      // Try JPEG first (smaller), fallback to PNG
      let dataUrl: string;
      try {
        dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      } catch {
        dataUrl = canvas.toDataURL('image/png', 0.8);
      }
      
      // Check if still too large, compress more
      if (dataUrl.length > 200_000) {
        try {
          dataUrl = canvas.toDataURL('image/jpeg', 0.6);
        } catch {
          dataUrl = canvas.toDataURL('image/png', 0.6);
        }
      }
      
      onImageChange(dataUrl);
    };
    
    img.src = URL.createObjectURL(file);
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

  useEffect(() => {
    if (!isModeMenuOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      const inButton = !!modeButtonRef.current && modeButtonRef.current.contains(target);
      const inMenu = !!modeMenuRef.current && modeMenuRef.current.contains(target);
      if (!inButton && !inMenu) {
        setIsModeMenuOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsModeMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isModeMenuOpen]);

  const recomputeMenuPosition = useCallback(() => {
    if (!modeButtonRef.current) return;
    const rect = modeButtonRef.current.getBoundingClientRect();
    const gap = 6;
    const bottom = Math.max(8, window.innerHeight - rect.top + gap);
    const left = rect.left;
    setMenuPosition({ bottom, left });
  }, []);

  useLayoutEffect(() => {
    if (!isModeMenuOpen) return;
    recomputeMenuPosition();
    requestAnimationFrame(() => recomputeMenuPosition());
  }, [isModeMenuOpen, recomputeMenuPosition]);

  useEffect(() => {
    if (!isModeMenuOpen) return;

    const onScroll = () => recomputeMenuPosition();
    const onResize = () => recomputeMenuPosition();

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
    };
  }, [isModeMenuOpen, recomputeMenuPosition]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <div className="flex flex-col shrink-0 overflow-hidden">
      {isVisionModel && imageDataUrl && (
        <div className="mx-3 mt-3 mb-2 relative inline-block">
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
      <div className="px-3 py-2">
        <textarea
          ref={textareaRef}
          className="w-full min-h-[24px] max-h-[280px] resize-none border-0 bg-transparent text-sm text-[var(--foreground)] placeholder-[var(--muted)] focus:outline-none focus:ring-0 leading-relaxed"
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            chatMode === "ask"
              ? "Ask about the current file (⌘⏎)"
              : chatMode === "edit"
                ? "Describe the edits to make to the active file (⌘⏎)"
                : chatMode === "agent-beamer"
                  ? "Describe the slide deck to create (⌘⏎)"
                  : "Describe the document to create (⌘⏎)"
          }
          rows={1}
        />
      </div>
      <div className="flex items-center justify-between gap-2 px-3 py-2 shrink-0">
        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              ref={modeButtonRef}
              type="button"
              onClick={() => setIsModeMenuOpen((open) => !open)}
              className="inline-flex h-7 w-7 items-center justify-center rounded border border-[var(--border)] bg-[color-mix(in_srgb,var(--border)_22%,transparent)] text-[var(--foreground)] transition-colors hover:bg-[color-mix(in_srgb,var(--border)_40%,transparent)]"
              title={activeMode.title}
              aria-haspopup="menu"
              aria-expanded={isModeMenuOpen}
            >
              <activeMode.Icon />
            </button>
            {isModeMenuOpen && createPortal(
              <div
                ref={modeMenuRef}
                style={{
                  position: "fixed",
                  bottom: menuPosition.bottom,
                  left: menuPosition.left,
                  zIndex: 999999,
                  minWidth: "160px",
                }}
                className="rounded border border-[var(--border)] bg-[var(--background)] shadow-xl overflow-hidden"
                onMouseDown={(e) => e.stopPropagation()}
              >
                {modeOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      setChatMode(option.value);
                      setIsModeMenuOpen(false);
                    }}
                    className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 transition-colors ${chatMode === option.value ? "bg-[color-mix(in_srgb,var(--accent)_18%,transparent)] text-[var(--accent)]" : "text-[var(--foreground)] hover:bg-[color-mix(in_srgb,var(--border)_45%,transparent)]"}`}
                    title={option.title}
                  >
                    <span className="flex h-4 w-4 items-center justify-center">
                      <option.Icon />
                    </span>
                    <span>{option.label}</span>
                  </button>
                ))}
              </div>,
              document.body
            )}
          </div>
          {selectedModelId && onModelChange && (
            <ModelDropdown
              selectedModelId={selectedModelId}
              onModelChange={onModelChange}
            />
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <div className="text-[11px] text-[var(--muted-foreground)] font-normal shrink-0">
              {chatInput.length > 0 ? chatInput.length : ''}
            </div>
            <div className="flex items-center gap-1">
              {isVisionModel && onImageChange && chatMode !== "edit" && (
                <button
                  className="w-6 h-6 rounded flex items-center justify-center text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[color-mix(in_srgb,var(--border)_45%,transparent)] transition-colors shrink-0"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isGenerating}
                  title="Attach image"
                >
                  <IconImage />
                </button>
              )}
              <button
                className="w-6 h-6 rounded flex items-center justify-center bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white disabled:opacity-50 transition-colors shrink-0"
                onClick={onSend}
                disabled={isGenerating}
                title="Send"
              >
                <IconSend />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
