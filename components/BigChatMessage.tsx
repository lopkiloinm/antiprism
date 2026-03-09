import React, { useEffect, useState } from "react";
import { Streamdown } from "streamdown";
import { code } from "@streamdown/code";
import { math } from "@streamdown/math";
import { mermaid } from "@streamdown/mermaid";
import { cjk } from "@streamdown/cjk";
import "katex/dist/katex.min.css";
import "streamdown/styles.css";
import { ThinkingRenderer, parseThinkingContent, stripThinkingTags } from "./ThinkingRenderer";
import { streamdownPlugins, chatStreamdownClasses, getShikiTheme, streamdownTheme } from "@/lib/streamdownConfig";
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

interface BigChatMessageProps {
  message: ChatMessage;
  isLast: boolean;
  lastMessageRef?: React.RefObject<HTMLPreElement>;
  isStreaming?: boolean;
  onUpdateMessage?: (message: ChatMessage) => void;
}

export function BigChatMessage({
  message,
  isLast,
  lastMessageRef,
  isStreaming = false,
  onUpdateMessage,
}: BigChatMessageProps) {
  const { theme } = useTheme();
  const isDarkTheme = theme === "dark";
  const streamdownClasses = chatStreamdownClasses;
  const parsedThinking = parseThinkingContent(message.content);
  const [persistedThinkingContent, setPersistedThinkingContent] = useState(message.thinkingContent ?? parsedThinking.thinking);
  const [thinkingStartedAt, setThinkingStartedAt] = useState<number | undefined>(message.thinkingStartedAt);
  const [thinkingDurationMs, setThinkingDurationMs] = useState<number | undefined>(message.thinkingDurationMs);
  const effectiveThinkingContent = persistedThinkingContent || parsedThinking.thinking;
  const assistantDisplayContent = stripThinkingTags(message.content);
  const shouldRenderAssistantBubble =
    message.role !== "assistant" ||
    message.image ||
    message.responseType === "agent" ||
    message.content === "Thinking..." ||
    !!assistantDisplayContent;

  useEffect(() => {
    if (message.role !== "assistant") {
      return;
    }

    if (parsedThinking.thinking) {
      setPersistedThinkingContent(parsedThinking.thinking);

      if (!thinkingStartedAt) {
        setThinkingStartedAt(Date.now());
      }

      if (thinkingDurationMs !== undefined) {
        setThinkingDurationMs(undefined);
      }

      return;
    }

    if (!isStreaming && persistedThinkingContent && thinkingStartedAt && thinkingDurationMs == null) {
      setThinkingDurationMs(Date.now() - thinkingStartedAt);
      onUpdateMessage?.({ ...message, thinkingExpanded: false });
    }
  }, [isStreaming, message, onUpdateMessage, parsedThinking.thinking, persistedThinkingContent, thinkingDurationMs, thinkingStartedAt]);

  return (
    <div className={`mb-4 flex ${message.role === "user" ? "items-end" : "items-start"} flex-col`}>
      {message.role === "assistant" && !!effectiveThinkingContent && (
        <ThinkingRenderer 
          thinkingContent={effectiveThinkingContent}
          isStreaming={isStreaming}
          initialExpanded={message.thinkingExpanded !== false}
          startedAt={thinkingStartedAt}
          durationMs={thinkingDurationMs}
          onToggleExpanded={(expanded) => onUpdateMessage?.({ ...message, thinkingExpanded: expanded })}
        />
      )}
      {message.role === "user" ? (
        <div className="max-w-[85%] rounded-2xl px-4 py-2.5 bg-[var(--accent)] text-white rounded-br-sm self-end">
          {message.content === "Thinking..." ? (
            <span className="text-[var(--muted)] italic">Thinking…</span>
          ) : message.image ? (
            <div>
              <img src={message.image} alt="Uploaded" className="max-h-48 rounded mb-2" />
              {message.content && <span className="whitespace-pre-wrap">{message.content}</span>}
            </div>
          ) : (
            <span className="whitespace-pre-wrap">{message.content}</span>
          )}
        </div>
      ) : message.role === "assistant" && message.responseType === "agent" ? (
        <pre
          ref={isLast && message.role === "assistant" ? lastMessageRef : undefined}
          className="text-sm overflow-x-auto whitespace-pre-wrap break-words font-mono max-w-[85%]"
        >
          {message.content}
        </pre>
      ) : message.role === "assistant" ? (
        <div className={`${streamdownClasses} ${theme === 'light' ? 'theme-light' : ''}`}>
          <Streamdown 
            plugins={streamdownPlugins}
            shikiTheme={getShikiTheme(isDarkTheme)}
            animated={false}
          >
            {assistantDisplayContent}
          </Streamdown>
        </div>
      ) : null}
    </div>
  );
}
