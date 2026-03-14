import React, { useEffect, useState } from "react";
import { Streamdown } from "streamdown";
import { code } from "@streamdown/code";
import { math } from "@streamdown/math";
import { mermaid } from "@streamdown/mermaid";
import { cjk } from "@streamdown/cjk";
import "katex/dist/katex.min.css";
import "streamdown/styles.css";
import { ThinkingRenderer, parseThinkingContent, stripThinkingTags } from "./ThinkingRenderer";
import { streamdownPlugins, chatStreamdownClasses, getShikiTheme } from "@/lib/streamdownConfig";
import { useTheme } from "@/contexts/ThemeContext";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  responseType?: "ask" | "agent";
  createdPath?: string;
  markdown?: string;
  image?: string;
  thinkingExpanded?: boolean;
  thinkingContent?: string;
  thinkingStartedAt?: number;
  thinkingDurationMs?: number;
}

interface SmallChatMessageProps {
  message: ChatMessage;
  isLast: boolean;
  lastMessageRef?: React.RefObject<HTMLPreElement>;
  isStreaming?: boolean;
  onUpdateMessage?: (message: ChatMessage) => void;
}

export function SmallChatMessage({ 
  message, 
  isLast, 
  lastMessageRef, 
  isStreaming = false, 
  onUpdateMessage 
}: SmallChatMessageProps) {
  const { effectiveTheme } = useTheme();
  const isDarkTheme = effectiveTheme === "dark";
  const streamdownClasses = chatStreamdownClasses;
  const parsedThinking = parseThinkingContent(message.content);
  const [persistedThinkingContent, setPersistedThinkingContent] = useState(message.thinkingContent ?? parsedThinking.thinking);
  const [thinkingStartedAt, setThinkingStartedAt] = useState<number | undefined>(message.thinkingStartedAt);
  const [thinkingDurationMs, setThinkingDurationMs] = useState<number | undefined>(message.thinkingDurationMs);
  const effectiveThinkingContent = persistedThinkingContent || parsedThinking.thinking;
  const assistantDisplayContent = stripThinkingTags(message.content);

  const emitMessageUpdate = (overrides: Partial<ChatMessage>) => {
    onUpdateMessage?.({
      ...message,
      thinkingContent: effectiveThinkingContent || undefined,
      thinkingStartedAt,
      thinkingDurationMs,
      ...overrides,
    });
  };

  useEffect(() => {
    if (message.role !== "assistant") {
      return;
    }

    if (parsedThinking.thinking) {
      if (persistedThinkingContent !== parsedThinking.thinking) {
        setPersistedThinkingContent(parsedThinking.thinking);
        emitMessageUpdate({ thinkingContent: parsedThinking.thinking });
      }

      if (!thinkingStartedAt) {
        const startedAt = Date.now();
        setThinkingStartedAt(startedAt);
        emitMessageUpdate({
          thinkingContent: parsedThinking.thinking,
          thinkingStartedAt: startedAt,
          thinkingDurationMs: undefined,
        });
      }

      if (thinkingDurationMs !== undefined) {
        setThinkingDurationMs(undefined);
        emitMessageUpdate({
          thinkingContent: parsedThinking.thinking,
          thinkingDurationMs: undefined,
        });
      }

      return;
    }

    if (!isStreaming && persistedThinkingContent && thinkingStartedAt && thinkingDurationMs == null) {
      const durationMs = Date.now() - thinkingStartedAt;
      setThinkingDurationMs(durationMs);
      emitMessageUpdate({
        thinkingContent: persistedThinkingContent,
        thinkingStartedAt,
        thinkingDurationMs: durationMs,
        thinkingExpanded: false,
      });
    }
  }, [isStreaming, message, onUpdateMessage, parsedThinking.thinking, persistedThinkingContent, thinkingDurationMs, thinkingStartedAt]);

  return (
    <div
      className={`flex ${message.role === "user" ? "justify-end" : "justify-start"} flex-col`}
    >
      {message.role === "user" ? (
        <div className="max-w-[85%] rounded-2xl px-4 py-2.5 bg-[var(--accent)] text-white rounded-br-sm self-end">
          {message.content === "Thinking..." ? (
            <span className="text-[var(--muted)] italic">Thinking…</span>
          ) : message.image ? (
            <div>
              <img src={message.image} alt="Uploaded" className="max-h-32 rounded mb-2" />
              {message.content && <span className="whitespace-pre-wrap">{message.content}</span>}
            </div>
          ) : (
            <span className="whitespace-pre-wrap">{message.content}</span>
          )}
        </div>
      ) : (
        <>
          {message.role === "assistant" && !!effectiveThinkingContent && (
            <ThinkingRenderer 
              thinkingContent={effectiveThinkingContent}
              isStreaming={isStreaming}
              initialExpanded={message.thinkingExpanded !== false}
              startedAt={thinkingStartedAt}
              durationMs={thinkingDurationMs}
              onToggleExpanded={(expanded) => emitMessageUpdate({ thinkingExpanded: expanded })}
            />
          )}
          {message.role === "assistant" && message.responseType === "agent" ? (
            <pre
              ref={isLast && message.role === "assistant" ? lastMessageRef : undefined}
              className="text-sm overflow-x-auto overflow-y-auto whitespace-pre-wrap break-words font-mono bg-[color-mix(in_srgb,var(--border)_35%,transparent)] rounded p-3 max-h-64"
            >
              {assistantDisplayContent}
            </pre>
          ) : message.content === "Thinking..." ? (
            <span className="text-[var(--muted)] italic">Thinking…</span>
          ) : message.role === "assistant" ? (
            <div className={`${streamdownClasses} ${effectiveTheme === 'light' ? 'theme-light' : ''}`}>
              <Streamdown 
                plugins={streamdownPlugins}
                shikiTheme={getShikiTheme(isDarkTheme)}
                animated={false}
              >
                {assistantDisplayContent}
              </Streamdown>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
