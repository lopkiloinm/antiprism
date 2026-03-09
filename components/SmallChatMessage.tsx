import React from "react";
import { Streamdown } from "streamdown";
import { code } from "@streamdown/code";
import { math } from "@streamdown/math";
import { mermaid } from "@streamdown/mermaid";
import { cjk } from "@streamdown/cjk";
import "katex/dist/katex.min.css";
import "streamdown/styles.css";
import { streamdownPlugins, chatStreamdownClasses, getShikiTheme } from "@/lib/streamdownConfig";
import { useTheme } from "@/contexts/ThemeContext";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  responseType?: "ask" | "agent";
  createdPath?: string;
  markdown?: string;
  image?: string;
}

interface SmallChatMessageProps {
  message: ChatMessage;
  isLast: boolean;
  lastMessageRef?: React.RefObject<HTMLPreElement>;
}

export function SmallChatMessage({ message, isLast, lastMessageRef }: SmallChatMessageProps) {
  const { theme } = useTheme();
  const isDarkTheme = theme === "dark";
  const streamdownClasses = chatStreamdownClasses;

  return (
    <div
      className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
    >
      {message.role === "user" ? (
        <div className="max-w-[85%] rounded-2xl px-4 py-2.5 bg-[var(--accent)] text-white rounded-br-sm">
          {message.image ? (
            <div>
              <img src={message.image} alt="Uploaded" className="max-h-32 rounded mb-2" />
              {message.content && <span className="whitespace-pre-wrap">{message.content}</span>}
            </div>
          ) : (
            <span className="whitespace-pre-wrap">{message.content}</span>
          )}
        </div>
      ) : message.role === "assistant" && message.responseType === "agent" ? (
        <pre
          ref={isLast && message.role === "assistant" ? lastMessageRef : undefined}
          className="text-sm overflow-x-auto overflow-y-auto whitespace-pre-wrap break-words font-mono bg-[color-mix(in_srgb,var(--border)_35%,transparent)] rounded p-3 max-h-64"
        >
          {message.content}
        </pre>
      ) : message.content === "Thinking..." ? (
        <span className="text-[var(--muted)] italic">Thinking…</span>
      ) : message.role === "assistant" ? (
        <div className={`${streamdownClasses} ${theme === 'light' ? 'theme-light' : ''}`}>
          <Streamdown 
            plugins={streamdownPlugins}
            shikiTheme={getShikiTheme(isDarkTheme)}
            animated={false}
          >
            {message.content}
          </Streamdown>
        </div>
      ) : null}
    </div>
  );
}
