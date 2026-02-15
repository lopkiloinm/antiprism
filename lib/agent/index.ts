/**
 * Agent module: Ask (conversational) and Create (new LaTeX files) modes.
 * Model-agnostic - defines prompts and response parsing, not model execution.
 */

export type { ChatMessage, PriorMessage, AgentMode, AgentResponse } from "./types";
export { buildAskMessages, parseAskResponse } from "./ask";
export { buildCreateMessages, parseCreateResponse, type CreateParseResult } from "./create";

import type { ChatMessage, PriorMessage, AgentMode } from "./types";
import { buildAskMessages } from "./ask";
import { buildCreateMessages } from "./create";

/**
 * Build messages for a chat turn. Delegates to ask or create based on mode.
 * Both modes receive prior conversation history.
 */
export function buildMessages(
  userMessage: string,
  context?: string,
  mode: AgentMode = "ask",
  priorMessages?: PriorMessage[]
): ChatMessage[] {
  if (mode === "agent") {
    return buildCreateMessages(userMessage, priorMessages);
  }
  return buildAskMessages(userMessage, context, priorMessages);
}
