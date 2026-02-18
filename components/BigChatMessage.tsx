import React from "react";
import ReactMarkdown from "react-markdown";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  responseType?: "ask" | "agent";
  createdPath?: string;
  markdown?: string;
}

interface BigChatMessageProps {
  message: ChatMessage;
  isLast: boolean;
  lastMessageRef?: React.RefObject<HTMLPreElement>;
}

export function BigChatMessage({ message, isLast, lastMessageRef }: BigChatMessageProps) {
  const mdClasses = "prose prose-sm max-w-none prose-headings:text-[var(--foreground)] prose-p:text-[var(--foreground)] prose-li:text-[var(--foreground)] prose-strong:text-[var(--foreground)] prose-code:text-[var(--foreground)] prose-pre:bg-[color-mix(in_srgb,var(--border)_35%,transparent)] prose-pre:text-[var(--foreground)] prose-a:text-[var(--accent)] [&_p]:my-1.5 [&_ul]:my-1.5 [&_ol]:my-1.5 [&_li]:my-0.5";

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
        ) : message.role === "assistant" && message.responseType === "agent" ? (
          <pre
            ref={isLast && message.role === "assistant" ? lastMessageRef : undefined}
            className="text-sm overflow-x-auto whitespace-pre-wrap break-words font-mono"
          >
            {message.content}
          </pre>
        ) : message.role === "assistant" ? (
          <div className={mdClasses}>
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>
        ) : (
          <span className="whitespace-pre-wrap">{message.content}</span>
        )}
      </div>
    </div>
  );
}
