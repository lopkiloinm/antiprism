/**
 * Create mode: generate markdown from user requests, then convert to LaTeX via pandoc.
 */

import { convert } from "pandoc-wasm";
import type { ChatMessage } from "./types";

export function buildCreateMessages(
  userMessage: string,
  priorMessages?: { role: "user" | "assistant"; content: string }[]
): ChatMessage[] {
  const systemContent = `You write markdown. Output only the document. No code fences, no extra text.

Write a short paper on the user's topic. Start with a # heading.`;

  const prior: ChatMessage[] = (priorMessages ?? []).map((m) => ({ role: m.role, content: m.content }));

  return [
    { role: "system", content: systemContent },
    ...prior,
    { role: "user", content: userMessage },
  ];
}

function extractMarkdown(raw: string): string {
  let s = raw.trim();
  s = s.replace(/^(?:user|assistant)\s*\n?/gim, "");
  s = s.replace(/^[^\S\n]*(?:user|assistant):\s*/gim, "");
  // Only extract from fences explicitly labeled markdown/md — NOT arbitrary code fences
  const codeBlock = s.match(/```(?:markdown|md)\s*\n([\s\S]*?)```/i);
  if (codeBlock) return codeBlock[1].trim();
  return s;
}

function parseTitleFromMarkdown(md: string): string {
  const m = md.match(/^#\s+(.+)$/m);
  return m ? m[1].trim() : "";
}

export interface CreateParseResult {
  latex: string;
  title: string;
  markdown: string;
}

export async function parseCreateResponse(rawOutput: string): Promise<CreateParseResult> {
  const md = extractMarkdown(rawOutput);
  const title = parseTitleFromMarkdown(md);
  if (!md.trim()) return { latex: "", title: "", markdown: "" };

  try {
    const result = await convert(
      { from: "markdown", to: "latex", standalone: true },
      md,
      {}
    );
    return { latex: (result.stdout || "").trim(), title, markdown: md };
  } catch (e) {
    console.error("Pandoc md->latex failed:", e);
    return { latex: md, title, markdown: md };
  }
}
