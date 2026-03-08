import React from "react";
import { Streamdown } from "streamdown";
import { code } from "@streamdown/code";
import { math } from "@streamdown/math";
import { mermaid } from "@streamdown/mermaid";
import { cjk } from "@streamdown/cjk";
import "katex/dist/katex.min.css";
import "streamdown/styles.css";
import { ThinkingRenderer, stripThinkingTags } from "./ThinkingRenderer";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  responseType?: "ask" | "agent";
  createdPath?: string;
  markdown?: string;
  image?: string;
}

interface BigChatMessageProps {
  message: ChatMessage;
  isLast: boolean;
  lastMessageRef?: React.RefObject<HTMLPreElement>;
  isStreaming?: boolean;
}

export function BigChatMessage({ message, isLast, lastMessageRef, isStreaming = false }: BigChatMessageProps) {
  const streamdownClasses = "max-w-none prose-headings:text-[var(--foreground)] prose-p:text-[var(--foreground)] prose-li:text-[var(--foreground)] prose-strong:text-[var(--foreground)] prose-code:text-[var(--foreground)] prose-pre:bg-[color-mix(in_srgb,var(--border)_35%,transparent)] prose-pre:text-[var(--foreground)] prose-a:text-[var(--accent)] [&_p]:my-1.5 [&_ul]:my-1.5 [&_ol]:my-1.5 [&_li]:my-0.5";

  return (
    <div className={`flex ${message.role === "user" ? "justify-end" : "justify-start"} mb-4`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
          message.role === "user"
            ? "bg-[var(--accent)] text-white rounded-br-sm"
            : "bg-[color-mix(in_srgb,var(--border)_40%,transparent)] text-[var(--foreground)] rounded-bl-sm"
        }`}>
        {message.content === "Thinking..." ? (
          <span className="text-[var(--muted)] italic">Thinking…</span>
        ) : message.image ? (
          <div>
            <img src={message.image} alt="Uploaded" className="max-h-48 rounded mb-2" />
            {message.content && <span className="whitespace-pre-wrap">{message.content}</span>}
          </div>
        ) : message.role === "assistant" && message.responseType === "agent" ? (
          <pre
            ref={isLast && message.role === "assistant" ? lastMessageRef : undefined}
            className="text-sm overflow-x-auto whitespace-pre-wrap break-words font-mono"
          >
            {message.content}
          </pre>
        ) : message.role === "assistant" ? (
          <>
            {/* Render thinking content separately above the message */}
            <ThinkingRenderer content={message.content} isStreaming={isStreaming} />
            
            {/* Render main message content without thinking tags */}
            <div className={streamdownClasses}>
              <Streamdown 
                plugins={{ code, math, mermaid, cjk }}
                animated={false}
              >
                {stripThinkingTags(message.content)}
              </Streamdown>
            </div>
          </>
        ) : (
          <span className="whitespace-pre-wrap">{message.content}</span>
        )}
      </div>
    </div>
  );
}
