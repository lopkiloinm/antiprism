import type { ChatMessage, PriorMessage } from "./types";
import { stripThinking } from "./thinking";

const DEFAULT_FALLBACK = "";

const DEFAULT_PROMPT_EDIT = `You are editing the user's current file in Antiprism.

Return the full revised file content only.

Keep the document as close as possible to the original except for the requested edits.
Preserve structure, formatting style, and unchanged content unless a change is necessary.
Do not explain your edits.
Do not wrap the result in code fences.
Do not prepend or append commentary.

IMPORTANT: The markers <antiprism_document> and </antiprism_document> are NOT part of the document. They only mark where the document begins and ends. When editing, only modify the actual document content between these markers, never the markers themselves.`;

export function buildEditMessages(
  userMessage: string,
  context?: string,
  priorMessages?: PriorMessage[]
): ChatMessage[] {
  const originalDocument = context?.trim().length
    ? `\n\n<antiprism_document>\n${context}\n</antiprism_document>`
    : "\n\n<antiprism_document>\n\n</antiprism_document>";

  const prior: ChatMessage[] = (priorMessages ?? []).map((m) => ({ role: m.role, content: m.content }));

  return [
    { role: "system", content: `${DEFAULT_PROMPT_EDIT}${originalDocument}` },
    ...prior,
    { role: "user", content: userMessage },
  ];
}

export function parseEditResponse(rawOutput: string): string {
  const { output } = stripThinking(rawOutput);
  let result = output.trim();

  if (!result) {
    return DEFAULT_FALLBACK;
  }

  result = result.replace(/^(?:assistant)\s*:?\s*/i, "").trim();

  const fencedMatch = result.match(/^```(?:latex|tex|typst|typ|markdown|md|text)?\s*\n([\s\S]*?)```$/i);
  if (fencedMatch) {
    result = fencedMatch[1].trim();
  }

  // Extract content from antiprism_document tags if present
  const docMatch = result.match(/<antiprism_document>\s*([\s\S]*?)\s*<\/antiprism_document>/);
  if (docMatch) {
    result = docMatch[1].trim();
  }

  // Remove any ask mode markers that might have leaked in
  result = result
    .replace(/\s*<antiprism_reference_document>\s*[\s\S]*?<\/antiprism_reference_document>\s*$/i, "")
    .replace(/\s*<antiprism_reference_document>\s*/gi, "")
    .replace(/\s*<\/antiprism_reference_document>\s*/gi, "")
    .trim();

  return result;
}
