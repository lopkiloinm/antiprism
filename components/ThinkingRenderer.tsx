import React, { useState, useEffect } from "react";
import { Streamdown } from "streamdown";
import { code } from "@streamdown/code";
import { math } from "@streamdown/math";
import { mermaid } from "@streamdown/mermaid";
import { cjk } from "@streamdown/cjk";

import { IconBrain, IconChevronDown, IconChevronRight } from "./Icons";

interface ThinkingParseResult {
  hasThinking: boolean;
  thinking: string;
  remainder: string;
}

export function parseThinkingContent(content: string): ThinkingParseResult {
  const thinkStartTag = "<think>";
  const thinkEndTag = "</think>";
  const thinkStartIndex = content.indexOf(thinkStartTag);

  if (thinkStartIndex === -1) {
    // Handle outputs that emit only a closing tag; treat prefix as thinking
    const orphanEnd = content.indexOf(thinkEndTag);
    if (orphanEnd !== -1) {
      return {
        hasThinking: true,
        thinking: content.substring(0, orphanEnd).trim(),
        remainder: content.substring(orphanEnd + thinkEndTag.length).trim(),
      };
    }

    return {
      hasThinking: false,
      thinking: "",
      remainder: content,
    };
  }

  const beforeThinking = content.substring(0, thinkStartIndex);
  const thinkBodyStart = thinkStartIndex + thinkStartTag.length;
  const thinkEndIndex = content.indexOf(thinkEndTag, thinkBodyStart);

  if (thinkEndIndex === -1) {
    return {
      hasThinking: true,
      thinking: content.substring(thinkBodyStart).trim(),
      remainder: beforeThinking.trim(),
    };
  }

  return {
    hasThinking: true,
    thinking: content.substring(thinkBodyStart, thinkEndIndex).trim(),
    remainder: `${beforeThinking}${content.substring(thinkEndIndex + thinkEndTag.length)}`.trim(),
  };
}

interface ThinkingRendererProps {
  thinkingContent: string;
  isStreaming?: boolean;
  onToggleExpanded?: (expanded: boolean) => void;
  initialExpanded?: boolean;
  startedAt?: number;
  durationMs?: number;
}

export function ThinkingRenderer({ thinkingContent, isStreaming = false, onToggleExpanded, initialExpanded = true, startedAt, durationMs }: ThinkingRendererProps) {
  const [isExpanded, setIsExpanded] = useState(initialExpanded);
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    if (typeof durationMs === "number" && !isStreaming) {
      setElapsedMs(durationMs);
      return;
    }

    if (!startedAt) {
      setElapsedMs(0);
      return;
    }

    const updateElapsed = () => {
      setElapsedMs(Date.now() - startedAt);
    };

    updateElapsed();

    if (!isStreaming) {
      return;
    }

    const interval = window.setInterval(updateElapsed, 200);
    return () => window.clearInterval(interval);
  }, [durationMs, isStreaming, startedAt]);

  if (!thinkingContent) {
    return null;
  }

  const elapsedSeconds = Math.max(1, Math.round(elapsedMs / 1000));
  const statusLabel = `${isStreaming ? "Thinking" : "Thought"} for ${elapsedSeconds} second${elapsedSeconds === 1 ? "" : "s"}`;
  const bodyClasses = "max-w-none prose-headings:text-[var(--foreground)] prose-p:text-[var(--foreground)] prose-li:text-[var(--foreground)] prose-strong:text-[var(--foreground)] prose-code:text-[var(--foreground)] prose-pre:bg-[color-mix(in_srgb,var(--border)_35%,transparent)] prose-pre:text-[var(--foreground)] prose-a:text-[var(--accent)] [&_p]:my-1.5 [&_ul]:my-1.5 [&_ol]:my-1.5 [&_li]:my-0.5 text-sm";

  const handleToggle = () => {
    const newExpanded = !isExpanded;
    setIsExpanded(newExpanded);
    onToggleExpanded?.(newExpanded);
  };

  return (
    <div
      className={`mb-2 flex flex-col overflow-hidden rounded-md border border-[var(--border)] bg-[var(--background)] ${
        isExpanded ? "w-full" : "w-fit max-w-full"
      }`}
    >
      <button
        onClick={handleToggle}
        className={`inline-flex max-w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-[var(--foreground)] hover:bg-[color-mix(in_srgb,var(--border)_35%,transparent)] transition-colors ${isExpanded ? "w-full" : "w-fit"}`}
      >
        <span className="flex h-4 w-4 items-center justify-center text-[var(--muted)]">
          {isExpanded ? <IconChevronDown /> : <IconChevronRight />}
        </span>
        <span className="flex h-4 w-4 items-center justify-center text-[var(--muted)]">
          <IconBrain />
        </span>
        <span className={`truncate ${isStreaming ? "animate-pulse" : ""}`}>{statusLabel}</span>
      </button>
      
      {isExpanded && (
        <div className="border-t border-[var(--border)] px-3 py-2">
          <div className={bodyClasses}>
            <Streamdown 
              plugins={{ code, math, mermaid, cjk }}
              animated={false}
            >
              {thinkingContent}
            </Streamdown>
          </div>
        </div>
      )}
    </div>
  );
}

export function stripThinkingTags(content: string): string {
  return parseThinkingContent(content).remainder;
}
