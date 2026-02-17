/**
 * Create mode: generate markdown from user requests, then convert to LaTeX via pandoc.
 */

import { convert } from "pandoc-wasm";
import type { ChatMessage } from "./types";

/** Default system prompt for Create mode. Used when user has not set a custom prompt. */
export const DEFAULT_PROMPT_CREATE = `You write markdown. Output only the document. No code fences, no extra text.

Write a short paper on the user's topic. Start with a # heading.

If the topic involves LaTeX or code examples, put them in fenced code blocks (triple backticks). Do not write raw LaTeX commands like \\documentclass or \\begin{document} in the document body—they will break the output.`;

export function buildCreateMessages(
  userMessage: string,
  priorMessages?: { role: "user" | "assistant"; content: string }[],
  systemPromptOverride?: string
): ChatMessage[] {
  const systemContent = systemPromptOverride?.trim() || DEFAULT_PROMPT_CREATE;

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

/**
 * Sanitize markdown before pandoc so LaTeX code examples become verbatim, not raw passthrough.
 * - Rewrite ```latex and ```tex to ```text so pandoc outputs verbatim blocks instead of
 *   potentially inlining raw LaTeX (which would produce invalid nested \documentclass etc.).
 * - Pandoc is called with markdown-raw_tex to prevent raw LaTeX in the body from being
 *   passed through (e.g. if the model writes \documentclass{article} in the prose).
 */
function sanitizeMarkdownForPandoc(md: string): string {
  return md.replace(/^```\s*(latex|tex)\s*$/gim, "```text");
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

  const sanitized = sanitizeMarkdownForPandoc(md);

  try {
    const result = await convert(
      { from: "markdown-raw_tex", to: "latex", standalone: true },
      sanitized,
      {}
    );
    return { latex: (result.stdout || "").trim(), title, markdown: md };
  } catch (e) {
    console.error("Pandoc md->latex failed:", e);
    return { latex: md, title, markdown: md };
  }
}
