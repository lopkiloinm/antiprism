/**
 * LFM2.5-1.2B-Instruct model limits.
 * Source: https://huggingface.co/LiquidAI/LFM2.5-1.2B-Instruct
 * Context: 32K tokens. Truncate by token count (chars are unreliable for LaTeX).
 */
export const LFM25_12B = {
  /** Max context window in tokens */
  MAX_CONTEXT_TOKENS: 32_768,
  /** Max new tokens to generate (output). Official examples use 512; 1024 allows longer replies. */
  MAX_NEW_TOKENS: 1024,
  /** Tokens reserved for system prompt, user message, and overhead. Rest is for document context. */
  RESERVED_TOKENS: 4096,
  /** Max tokens for document context: context window minus reserved. */
  get MAX_CONTEXT_TOKENS_FOR_DOC(): number {
    return this.MAX_CONTEXT_TOKENS - this.RESERVED_TOKENS;
  },
} as const;

export interface ModelDef {
  id: string;
  label: string;
  hfId: string;
  dtype: string;
  revision: string;
  /** Hidden size for KV cache init (only needed for raw ONNX models) */
  hiddenSize?: number;
  numKVHeads?: number;
  headDim?: number;
  maxNewTokens: number;
  maxContextTokens: number;
  reservedTokens: number;
  thinking?: boolean;
  vision?: boolean;
  /** Files needed for multi-session VL models */
  sessionFiles?: {
    embedTokens: string;
    embedImages?: string;
    decoder: string;
  };
}

export const AVAILABLE_MODELS: ModelDef[] = [
  {
    id: "lfm25-1.2b-instruct",
    label: "LFM2.5 1.2B Instruct",
    hfId: "LiquidAI/LFM2.5-1.2B-Instruct-ONNX",
    dtype: "q4",
    revision: "main",
    maxNewTokens: 1024,
    maxContextTokens: 32_768,
    reservedTokens: 4096,
  },
  {
    id: "lfm25-1.2b-thinking",
    label: "LFM2.5 1.2B Thinking",
    hfId: "LiquidAI/LFM2.5-1.2B-Thinking-ONNX",
    dtype: "q4",
    revision: "main",
    hiddenSize: 2048,
    numKVHeads: 8,
    headDim: 256,
    maxNewTokens: 2048,
    maxContextTokens: 32_768,
    reservedTokens: 4096,
    thinking: true,
  },
  {
    id: "lfm25-vl-1.6b",
    label: "LFM2.5 VL 1.6B (Vision)",
    hfId: "LiquidAI/LFM2.5-VL-1.6B-ONNX",
    dtype: "q4",
    revision: "main",
    hiddenSize: 2048,
    numKVHeads: 8,
    headDim: 64,
    maxNewTokens: 1024,
    maxContextTokens: 32_768,
    reservedTokens: 4096,
    vision: true,
    sessionFiles: {
      embedTokens: "embed_tokens_fp16",
      embedImages: "embed_images_fp16",
      decoder: "decoder_q4",
    },
  },
];

export function getModelById(id: string): ModelDef {
  return AVAILABLE_MODELS.find((m) => m.id === id) ?? AVAILABLE_MODELS[0];
}

export const DEFAULT_MODEL_ID = "lfm25-1.2b-instruct";
