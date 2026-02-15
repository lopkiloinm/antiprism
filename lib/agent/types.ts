/**
 * Shared types for Ask and Create modes.
 */

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface PriorMessage {
  role: "user" | "assistant";
  content: string;
}

export type AgentMode = "ask" | "agent";

export type AgentResponse =
  | { type: "ask"; content: string }
  | { type: "agent"; content: string; title?: string; markdown?: string };
