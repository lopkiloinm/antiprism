/**
 * Create mode: generate markdown from user requests, then convert to LaTeX/Beamer via pandoc or Typst via cmarker.
 */

import type { ChatMessage } from "./types";
import { stripThinking } from "./thinking";

export type CreateOutputFormat = "latex" | "typst" | "beamer";

/** Default system prompt for Create mode. Used when user has not set a custom prompt. */
export const DEFAULT_PROMPT_CREATE = `You write markdown. Output only the document. No code fences, no extra text.

Write a short paper on the user's topic. Start with a # heading.

If the topic involves LaTeX or code examples, put them in fenced code blocks (triple backticks). Do not write raw LaTeX commands like \\documentclass or \\begin{document} in the document body—they will break the output.`;

function getDefaultCreatePrompt(outputFormat: CreateOutputFormat): string {
  if (outputFormat === "beamer") {
    return `You write markdown for a slide deck. Output only the document. No code fences, no extra text.

Write concise presentation content on the user's topic.

Use normal markdown, but structure it for slides:
- Start with a # heading for the deck title.
- Use ## headings to begin new slides.
- Optionally use # headings for major sections.
- Keep slides concise, with short paragraphs and bullets.
- Use --- only when you want a new untitled slide.

Do not write YAML frontmatter. Do not write raw LaTeX commands like \\documentclass, \\begin{frame}, or \\end{frame} in the document body.`;
  }

  return DEFAULT_PROMPT_CREATE;
}

export function buildCreateMessages(
  userMessage: string,
  priorMessages?: { role: "user" | "assistant"; content: string }[],
  systemPromptOverride?: string,
  outputFormat: CreateOutputFormat = "latex"
): ChatMessage[] {
  const systemContent = systemPromptOverride?.trim() || getDefaultCreatePrompt(outputFormat);

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
  
  // Remove any antiprism markers that might have leaked in
  s = s
    .replace(/\s*<antiprism_document>\s*[\s\S]*?<\/antiprism_document>\s*$/gi, "")
    .replace(/\s*<antiprism_document>\s*/gi, "")
    .replace(/\s*<\/antiprism_document>\s*/gi, "")
    .replace(/\s*<antiprism_reference_document>\s*[\s\S]*?<\/antiprism_reference_document>\s*$/gi, "")
    .replace(/\s*<antiprism_reference_document>\s*/gi, "")
    .replace(/\s*<\/antiprism_reference_document>\s*/gi, "")
    .trim();
    
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

function stripLeadingYamlFrontmatter(md: string): string {
  return md.replace(/^---\s*\n[\s\S]*?\n---\s*\n*/m, "");
}

function buildBeamerMarkdown(md: string, title: string): string {
  const body = stripLeadingYamlFrontmatter(md).trim();
  const safeTitle = title || "Presentation";
  return `---
title: "${safeTitle.replace(/"/g, '\\"')}"
aspectratio: 169
theme: Madrid
---

${body}`;
}

/**
 * Convert Markdown to Typst using cmarker
 */
function convertMarkdownToTypst(md: string): string {
  const markdownLiteral = JSON.stringify(md);
  return `#import "@preview/cmarker:0.1.8"

#cmarker.render(${markdownLiteral}, smart-punctuation: true, math: none, h1-level: 1, raw-typst: true)`;
}

export interface CreateParseResult {
  latex: string;
  title: string;
  markdown: string;
  typst?: string;
}

export async function parseCreateResponse(rawOutput: string, outputFormat: CreateOutputFormat = 'latex'): Promise<CreateParseResult> {
  const { output } = stripThinking(rawOutput);
  const md = extractMarkdown(output);
  const title = parseTitleFromMarkdown(md);
  if (!md.trim()) return { latex: "", title: "", markdown: "", typst: "" };

  let latex = "";
  let typst = "";

  if (outputFormat === 'latex' || outputFormat === 'beamer') {
    // Generate LaTeX only
    const preparedMarkdown = outputFormat === "beamer" ? buildBeamerMarkdown(md, title) : md;
    const sanitized = sanitizeMarkdownForPandoc(preparedMarkdown);
    try {
      const { convert } = await import("pandoc-wasm");
      const result = await convert(
        { from: "markdown-raw_tex", to: outputFormat === "beamer" ? "beamer" : "latex", standalone: true },
        sanitized,
        {}
      );
      latex = (result.stdout || "").trim();
    } catch {
      latex = md;
    }
  } else if (outputFormat === 'typst') {
    // Generate Typst only
    try {
      typst = convertMarkdownToTypst(md);
    } catch {
      typst = md;
    }
  }

  return { latex, title, markdown: md, typst };
}
