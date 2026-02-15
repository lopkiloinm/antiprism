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
