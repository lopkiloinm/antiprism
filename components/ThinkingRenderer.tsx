import React, { useState, useEffect } from "react";

interface ThinkingRendererProps {
  content: string;
  isStreaming?: boolean;
}

export function ThinkingRenderer({ content, isStreaming = false }: ThinkingRendererProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [thinkingContent, setThinkingContent] = useState("");

  // Extract thinking content from <think> tags
  useEffect(() => {
    const thinkMatch = content.match(/<think>([\s\S]*?)<\/think>/);
    if (thinkMatch) {
      setThinkingContent(thinkMatch[1].trim());
    }
  }, [content]);

  // Auto-collapse when streaming is done
  useEffect(() => {
    if (!isStreaming && thinkingContent) {
      const timer = setTimeout(() => {
        setIsExpanded(false);
      }, 2000); // Collapse after 2 seconds when done
      return () => clearTimeout(timer);
    }
  }, [isStreaming, thinkingContent]);

  if (!thinkingContent) return null;

  return (
    <div className="mb-3 border-l-2 border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_8%,transparent)]">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-3 py-2 text-left text-xs font-medium text-[var(--accent)] hover:bg-[color-mix(in_srgb,var(--accent)_15%,transparent)] transition-colors flex items-center justify-between"
      >
        <span>Thinking Process</span>
        <svg
          className={`w-3 h-3 transition-transform ${isExpanded ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      {isExpanded && (
        <div className="px-3 pb-3 text-xs text-[var(--muted)] font-mono whitespace-pre-wrap border-t border-[color-mix(in_srgb,var(--border)_30%,transparent)]">
          {thinkingContent}
        </div>
      )}
    </div>
  );
}

export function stripThinkingTags(content: string): string {
  return content.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
}
