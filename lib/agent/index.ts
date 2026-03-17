/**
 * Agent module: Ask (conversational) and Create (new LaTeX files) modes.
 * Model-agnostic - defines prompts and response parsing, not model execution.
 */

export type { ChatMessage, PriorMessage, AgentMode, AgentResponse } from "./types";
export { buildAskMessages, parseAskResponse } from "./ask";
export { buildCreateMessages, parseCreateResponse, type CreateParseResult, type CreateOutputFormat } from "./create";
export { buildEditMessages, parseEditResponse } from "./edit";

import type { ChatMessage, PriorMessage, AgentMode } from "./types";
import { buildAskMessages } from "./ask";
import { buildCreateMessages, type CreateOutputFormat } from "./create";
import { buildEditMessages } from "./edit";
import { getPromptAsk, getPromptCreate } from "../settings";

/**
 * Build messages for a chat turn. Delegates to ask or create based on mode.
 * Uses custom system prompts from settings when set; otherwise built-in defaults.
 */
export function buildMessages(
  userMessage: string,
  context?: string,
  mode: AgentMode = "ask",
  priorMessages?: PriorMessage[],
  createFormat: CreateOutputFormat = "latex"
): ChatMessage[] {
  if (mode === "agent") {
    return buildCreateMessages(userMessage, priorMessages, getPromptCreate() || undefined, createFormat);
  }
  if (mode === "edit") {
    return buildEditMessages(userMessage, context, priorMessages);
  }
  return buildAskMessages(userMessage, context, priorMessages, getPromptAsk() || undefined);
}
