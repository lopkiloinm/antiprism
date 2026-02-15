"use client";

import { useEffect, useRef } from "react";
import { IconSend } from "@/components/Icons";
import { AIModelDownloadProgress } from "@/components/AIModelDownloadProgress";

interface ChatInputProps {
  chatInput: string;
  setChatInput: (v: string) => void;
  chatMode: "ask" | "agent";
  setChatMode: (m: "ask" | "agent") => void;
  modelReady: boolean;
  isGenerating: boolean;
  onModelReady: (ready: boolean) => void;
  onSend: () => void;
}

export function ChatInput({
  chatInput,
  setChatInput,
  chatMode,
  setChatMode,
  modelReady,
  isGenerating,
  onModelReady,
  onSend,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
    <div className="flex flex-col shrink-0 mx-3 mb-2 rounded-lg border border-zinc-700/80 bg-zinc-900/50 overflow-hidden">
      <textarea
        ref={textareaRef}
        className="w-full min-h-[24px] max-h-[280px] resize-none border-0 bg-transparent px-3 pt-3 pb-1 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-0"
        value={chatInput}
        onChange={(e) => setChatInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={chatMode === "ask" ? "Ask about your LaTeX…" : "Describe the document to create…"}
        rows={1}
      />
      <div className="flex items-center justify-between gap-2 px-2 py-1.5 shrink-0">
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex rounded bg-zinc-800/80 border border-zinc-700/60 overflow-hidden">
            <button
              onClick={() => setChatMode("ask")}
              className={`px-2 py-1 text-xs font-medium transition-colors ${chatMode === "ask" ? "bg-zinc-700 text-zinc-100" : "text-zinc-400 hover:text-zinc-200"}`}
              title="Ask mode"
            >
              Ask
            </button>
            <button
              onClick={() => setChatMode("agent")}
              className={`px-2 py-1 text-xs font-medium transition-colors ${chatMode === "agent" ? "bg-zinc-700 text-zinc-100" : "text-zinc-400 hover:text-zinc-200"}`}
              title="Agent mode: create new LaTeX files"
            >
              Agent
            </button>
          </div>
          <AIModelDownloadProgress onModelReady={onModelReady} compact />
        </div>
        <button
          className="w-8 h-8 rounded flex items-center justify-center bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50 transition-colors shrink-0"
          onClick={onSend}
          disabled={!modelReady || isGenerating}
          title="Send"
        >
          <IconSend />
        </button>
      </div>
    </div>
  );
}
