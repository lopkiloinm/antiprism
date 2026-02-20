import React from "react";
import ReactMarkdown from "react-markdown";

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
  return (
    <div
      className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
          message.role === "user"
            ? "bg-[var(--accent)] text-white rounded-br-sm"
            : "bg-[color-mix(in_srgb,var(--border)_55%,transparent)] text-[var(--foreground)] rounded-bl-sm"
        }`}
      >
        {message.image ? (
          <div>
            <img src={message.image} alt="Uploaded" className="max-h-32 rounded mb-2" />
            {message.content && <span className="whitespace-pre-wrap">{message.content}</span>}
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
        ) : message.role === "assistant" && message.responseType === "ask" ? (
          <div className="prose prose-sm max-w-none prose-headings:text-[var(--foreground)] prose-p:text-[var(--foreground)] prose-li:text-[var(--foreground)] prose-strong:text-[var(--foreground)] prose-code:text-[var(--foreground)] prose-pre:bg-[color-mix(in_srgb,var(--border)_35%,transparent)] prose-pre:text-[var(--foreground)] prose-a:text-[var(--accent)] [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0">
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>
        ) : message.role === "assistant" ? (
          <div className="prose prose-sm max-w-none prose-headings:text-[var(--foreground)] prose-p:text-[var(--foreground)] prose-li:text-[var(--foreground)] prose-strong:text-[var(--foreground)] prose-code:text-[var(--foreground)] prose-pre:bg-[color-mix(in_srgb,var(--border)_35%,transparent)] prose-pre:text-[var(--foreground)] prose-a:text-[var(--accent)] [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0">
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>
        ) : (
          <span>{message.content}</span>
        )}
      </div>
    </div>
  );
}
