"use client";

import {
  initializeModel as _initializeModel,
  generateFromMessages,
  generateFromMessagesStreaming,
  truncateToTokenLimit,
  getDownloadProgress,
  getDownloadStats,
  setProgressCallback,
  isDownloading,
  isModelLoading,
  checkWebGPUSupport as _checkWebGPUSupport,
} from "./localModelRuntime";
import {
  buildMessages,
  parseAskResponse,
  parseCreateResponse,
  type AgentResponse,
  type AgentMode,
  type PriorMessage,
} from "./agent";
import { LFM25_12B } from "./modelConfig";

export function checkWebGPUSupport(): boolean {
  return _checkWebGPUSupport();
}

export async function initializeModel(): Promise<boolean> {
  return _initializeModel();
}

export type { AgentResponse, AgentMode };

export interface StreamCallbacks {
  onChunk: (text: string) => void;
  onTokensPerSec?: (
    tokensPerSec: number,
    totalTokens: number,
    elapsedSeconds: number,
    inputTokens: number
  ) => void;
  onComplete?: (outputTokens: number, elapsedSeconds: number, inputTokens: number) => void;
}

export async function generateChatResponse(
  userMessage: string,
  context?: string,
  mode: AgentMode = "ask",
  streamCallbacks?: StreamCallbacks,
  priorMessages?: PriorMessage[]
): Promise<AgentResponse> {
  const docContext =
    mode === "agent"
      ? undefined
      : context && context.length > 0
        ? mode === "ask"
          ? context
          : await truncateToTokenLimit(context, LFM25_12B.MAX_CONTEXT_TOKENS_FOR_DOC)
        : undefined;
  const messages = buildMessages(userMessage, docContext, mode, priorMessages);

  if (streamCallbacks) {
    const rawOutput = await generateFromMessagesStreaming(messages, {
      onChunk: streamCallbacks.onChunk,
      onTokensPerSec: streamCallbacks.onTokensPerSec,
      onComplete: streamCallbacks.onComplete,
    });
    if (mode === "agent") {
      const { latex, title, markdown } = await parseCreateResponse(rawOutput);
      return { type: "agent", content: latex, title, markdown };
    }
    return { type: "ask", content: parseAskResponse(rawOutput) };
  }

  const rawOutput = await generateFromMessages(messages);
  if (mode === "agent") {
    const { latex, title, markdown } = await parseCreateResponse(rawOutput);
    return { type: "agent", content: latex, title, markdown };
  }
  return { type: "ask", content: parseAskResponse(rawOutput) };
}

export {
  getDownloadProgress,
  getDownloadStats,
  setProgressCallback,
  isDownloading,
  isModelLoading,
};
