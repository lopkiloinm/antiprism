import type { ChatMessage, PriorMessage } from "./types";
import { stripThinking } from "./thinking";

const DEFAULT_FALLBACK = "";

const DEFAULT_PROMPT_EDIT = `You are editing the user's current file in Antiprism.

Return the full revised file content only.

Keep the document as close as possible to the original except for the requested edits.
Preserve structure, formatting style, and unchanged content unless a change is necessary.
Do not explain your edits.
Do not wrap the result in code fences.
Do not prepend or append commentary.`;

export function buildEditMessages(
  userMessage: string,
  context?: string,
  priorMessages?: PriorMessage[]
): ChatMessage[] {
  const originalDocument = context?.trim().length
    ? `\n\n[CURRENT FILE]\n${context}\n[END CURRENT FILE]`
    : "\n\n[CURRENT FILE]\n\n[END CURRENT FILE]";

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

  return result;
}
