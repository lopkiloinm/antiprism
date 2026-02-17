"use client";

// Suppress ONNX Runtime "Some nodes were not assigned" warnings (harmless, clutters console)
if (typeof window !== "undefined" && !(console as any).__ortWarnSuppressed) {
  const filterOrt = (args: unknown[]) => {
    const msg = String(args[0] ?? "");
    return msg.includes("VerifyEachNodeIsAssignedToAnEp") || msg.includes("Some nodes were not assigned");
  };
  const _warn = console.warn;
  const _error = console.error;
  console.warn = (...args: unknown[]) => {
    if (filterOrt(args)) return;
    _warn.apply(console, args);
  };
  console.error = (...args: unknown[]) => {
    if (filterOrt(args)) return;
    _error.apply(console, args);
  };
  (console as any).__ortWarnSuppressed = true;
}

// Dynamic import to avoid SSR issues
let AutoModelForCausalLM: any = null;
let AutoTokenizer: any = null;

const MODEL_ID = "LiquidAI/LFM2.5-1.2B-Instruct-ONNX";
const MODEL_DTYPE = "q4"; // Use Q4 for WebGPU (recommended)

const MODEL_FILES = [
  "onnx/model_q4.onnx",
  "onnx/model_q4.onnx_data",
];

const HF_CDN_BASE = "https://huggingface.co";
// Single canonical cache: only ever download once, always use this root cache
const CACHE_NAME = `antiprism-model-${MODEL_ID.replace(/\//g, "-")}`;

export function isV0Preview(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.location.hostname.includes("v0.dev") ||
    window.location.hostname.includes("vusercontent.net") ||
    document.querySelector('script[src*="esm.v0.app"]') !== null
  );
}

async function loadTransformers() {
  if (typeof window === "undefined") {
    throw new Error("Transformers library can only be loaded in browser");
  }
  if (isV0Preview()) {
    throw new Error("V0_PREVIEW_UNSUPPORTED");
  }

  if (!AutoModelForCausalLM || !AutoTokenizer) {
    const transformers = await import("@huggingface/transformers");
    // Use our cache so transformers.js reads/writes the same cache we pre-download to.
    // Without this, transformers uses "transformers-cache" and never sees our cached files.
    const cache = await caches.open(CACHE_NAME);
    transformers.env.useCustomCache = true;
    transformers.env.customCache = cache;
    transformers.env.allowLocalModels = false;
    if (transformers.env.backends?.onnx?.wasm) {
      transformers.env.backends.onnx.wasm.numThreads = 1;
    }
    AutoModelForCausalLM = transformers.AutoModelForCausalLM;
    AutoTokenizer = transformers.AutoTokenizer;
  }
  return { AutoModelForCausalLM, AutoTokenizer };
}

export interface DownloadStats {
  downloadedBytes: number;
  totalBytes: number;
  speedBytesPerSecond: number;
}

let model: any = null;
let tokenizer: any = null;
let isLoading = false;
let loadPromise: Promise<void> | null = null;
let downloadProgress = 0;
let progressCallback: ((progress: number, stats?: DownloadStats) => void) | null = null;
let isDownloadPhase = true;

let currentStats: DownloadStats = {
  downloadedBytes: 0,
  totalBytes: 0,
  speedBytesPerSecond: 0,
};

function updateProgress(progress: number, stats?: Partial<DownloadStats>) {
  downloadProgress = Math.max(0, Math.min(100, progress));
  if (stats) {
    currentStats = { ...currentStats, ...stats };
  }
  if (progressCallback) {
    progressCallback(downloadProgress, currentStats);
  }
}

export function getDownloadStats(): DownloadStats {
  return currentStats;
}

export function checkWebGPUSupport(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined" || !("gpu" in navigator)) {
    return false;
  }
  return true;
}

export function setProgressCallback(callback: (progress: number, stats?: DownloadStats) => void) {
  progressCallback = callback;
}

export function getDownloadProgress(): number {
  return downloadProgress;
}

export function isDownloading(): boolean {
  return isLoading && isDownloadPhase;
}

export function isModelLoading(): boolean {
  return isLoading;
}

export function isModelLoaded(): boolean {
  return model !== null && tokenizer !== null;
}

async function downloadFileWithProgress(
  url: string,
  onProgress: (loaded: number, total: number, speedBytesPerSecond: number) => void
): Promise<Response> {
  const response = await fetch(url);
  if (!response.ok || !response.body) {
    throw new Error(`Failed to download ${url}: ${response.statusText}`);
  }
  const reader = response.body.getReader();
  const contentLength = response.headers.get("content-length");
  const total = contentLength ? parseInt(contentLength, 10) : 0;
  let loaded = 0;
  const chunks: BlobPart[] = [];
  let lastTime = performance.now();
  let lastLoaded = 0;
  let speedBytesPerSecond = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    loaded += value.length;
    const now = performance.now();
    const timeDiff = now - lastTime;
    if (timeDiff >= 500) {
      const bytesDiff = loaded - lastLoaded;
      speedBytesPerSecond = (bytesDiff / timeDiff) * 1000;
      lastTime = now;
      lastLoaded = loaded;
    }
    onProgress(loaded, total, speedBytesPerSecond);
  }

  const blob = new Blob(chunks);
  return new Response(blob, {
    headers: response.headers,
    status: response.status,
    statusText: response.statusText,
  });
}

async function ensureTokenizer(): Promise<void> {
  if (tokenizer) return;
  const { AutoTokenizer: TokenizerClass } = await loadTransformers();
  tokenizer = await TokenizerClass.from_pretrained(MODEL_ID);
}

/**
 * Truncate text to fit within maxTokens. Uses the model tokenizer (token count, not chars).
 * Keeps the end of the text (most recent content). Caller must ensure tokenizer is loaded.
 */
export async function truncateToTokenLimit(text: string, maxTokens: number): Promise<string> {
  await ensureTokenizer();
  const ids = tokenizer.encode(text, { add_special_tokens: false });
  if (ids.length <= maxTokens) return text;
  const truncated = ids.slice(-maxTokens);
  return tokenizer.decode(truncated, { skip_special_tokens: false });
}

async function loadModel(): Promise<void> {
  if (model && tokenizer) {
    return Promise.resolve();
  }
  if (isLoading) {
    return loadPromise || Promise.resolve();
  }

  isLoading = true;
  loadPromise = (async () => {
    try {
      currentStats = { downloadedBytes: 0, totalBytes: 0, speedBytesPerSecond: 0 };
      updateProgress(0);

      const { AutoModelForCausalLM: ModelClass, AutoTokenizer: TokenizerClass } =
        await loadTransformers();

      if (!checkWebGPUSupport()) {
        throw new Error("WebGPU is not available. Please enable WebGPU in your browser settings.");
      }

      await ensureTokenizer();

      let needsDownload = true;
      try {
        const cache = await caches.open(CACHE_NAME);
        let allFilesCached = true;
        for (const file of MODEL_FILES) {
          const fileUrl = `${HF_CDN_BASE}/${MODEL_ID}/resolve/main/${file}`;
          const cachedResponse = await cache.match(fileUrl);
          if (!cachedResponse) {
            allFilesCached = false;
            break;
          }
        }
        if (allFilesCached) {
          needsDownload = false;
          updateProgress(100);
        }
      } catch {
        needsDownload = true;
      }

      if (needsDownload) {
        const fileSizes = [172944, 1217650688];
        const totalSize = fileSizes[0] + fileSizes[1];
        currentStats.totalBytes = totalSize;
        isDownloadPhase = true;
        updateProgress(0, { totalBytes: totalSize, downloadedBytes: 0 });

        const cache = await caches.open(CACHE_NAME);
        let cumulativeDownloaded = 0;

        for (let i = 0; i < MODEL_FILES.length; i++) {
          const file = MODEL_FILES[i];
          const fileUrl = `${HF_CDN_BASE}/${MODEL_ID}/resolve/main/${file}`;
          const fileSize = fileSizes[i] || 0;

          const cachedResponse = await cache.match(fileUrl);
          if (cachedResponse) {
            cumulativeDownloaded += fileSize;
            updateProgress((cumulativeDownloaded / totalSize) * 100, {
              downloadedBytes: cumulativeDownloaded,
            });
            continue;
          }

          const response = await downloadFileWithProgress(fileUrl, (loaded, _total, speed) => {
            const totalDownloaded = cumulativeDownloaded + loaded;
            updateProgress(Math.min(100, (totalDownloaded / totalSize) * 100), {
              downloadedBytes: totalDownloaded,
              speedBytesPerSecond: speed,
            });
          });

          await cache.put(fileUrl, response);
          cumulativeDownloaded += fileSize;
        }

        updateProgress(100, { downloadedBytes: totalSize });
        isDownloadPhase = false;
        updateProgress(0);
      } else {
        isDownloadPhase = false;
        updateProgress(0);
      }

      const modelPromise = ModelClass.from_pretrained(MODEL_ID, {
        device: "webgpu",
        dtype: MODEL_DTYPE,
      });

      let loadingProgress = 0;
      const loadingInterval = setInterval(() => {
        if (loadingProgress < 99) {
          loadingProgress += 1;
          updateProgress(loadingProgress);
        }
      }, 150);

      try {
        model = await modelPromise;
      } finally {
        clearInterval(loadingInterval);
      }

      updateProgress(100);
    } catch (error) {
      console.error("Error loading model:", error);
      updateProgress(0);
      throw error;
    } finally {
      isLoading = false;
    }
  })();

  return loadPromise;
}

export function scheduleBackgroundDownload(delayMs: number = 5000): void {
  if (typeof window === "undefined") return;
  if (isModelLoaded() || isLoading) return;
  setTimeout(() => loadModel().catch(console.warn), delayMs);
}

export async function initializeModel(): Promise<boolean> {
  try {
    if (!checkWebGPUSupport()) {
      console.warn("WebGPU not available");
      return false;
    }
    await loadModel();
    return true;
  } catch (error) {
    console.error("Failed to initialize model:", error);
    return false;
  }
}

import type { ChatMessage } from "./agent";
import { LFM25_12B } from "./modelConfig";
import { getAiMaxNewTokens, getAiTemperature, getAiTopP } from "./settings";

export interface StreamingCallbacks {
  onChunk: (text: string) => void;
  onTokensPerSec?: (
    tokensPerSec: number,
    totalTokens: number,
    elapsedSeconds: number,
    inputTokens: number
  ) => void;
  onComplete?: (outputTokens: number, elapsedSeconds: number, inputTokens: number) => void;
}

/**
 * Generate a response from a message array. Model-specific: uses this runtime's
 * tokenizer and model. Returns raw decoded output (may include model-specific
 * formatting like "assistant:" prefix).
 */
export async function generateFromMessages(messages: ChatMessage[]): Promise<string> {
  if (!model || !tokenizer) {
    await loadModel();
  }

  const input = tokenizer.apply_chat_template(messages, {
    add_generation_prompt: true,
    return_dict: true,
  });

  const inputIds = input.input_ids;
  let inputLen = 0;
  if (Array.isArray(inputIds) && Array.isArray(inputIds[0])) {
    inputLen = inputIds[0].length;
  } else if (Array.isArray(inputIds)) {
    inputLen = inputIds.length;
  } else if (inputIds && typeof (inputIds as { dims?: number[] }).dims !== "undefined") {
    inputLen = (inputIds as { dims: number[] }).dims.reduce((a, b) => a * b, 1);
  } else if (inputIds && typeof (inputIds as { size?: number }).size === "number") {
    inputLen = (inputIds as { size: number }).size;
  }

  const maxNewTokens = getAiMaxNewTokens();
  const temperature = getAiTemperature();
  const topP = getAiTopP();
  const outputs = await model.generate({
    ...input,
    max_new_tokens: maxNewTokens,
    do_sample: true,
    temperature,
    top_p: topP,
  });

  const out = outputs[0];
  let toDecode: unknown = out;
  if (Array.isArray(out) && out.length > inputLen) {
    toDecode = out.slice(inputLen);
  }
  return tokenizer.decode(toDecode, { skip_special_tokens: true });
}

/**
 * Stream a response from a message array. Calls onChunk with text as it's generated.
 * Optionally reports tokens/sec via onTokensPerSec.
 */
export async function generateFromMessagesStreaming(
  messages: ChatMessage[],
  callbacks: StreamingCallbacks
): Promise<string> {
  if (!model || !tokenizer) {
    await loadModel();
  }

  const { TextStreamer } = await import("@huggingface/transformers");
  let fullText = "";
  const startTime = performance.now();
  let tokenCount = 0;

  const input = tokenizer.apply_chat_template(messages, {
    add_generation_prompt: true,
    return_dict: true,
  });

  const inputIds = input.input_ids;
  let inputTokens = 0;
  if (Array.isArray(inputIds) && Array.isArray(inputIds[0])) {
    inputTokens = inputIds[0].length;
  } else if (Array.isArray(inputIds)) {
    inputTokens = inputIds.length;
  } else if (inputIds && typeof (inputIds as { dims?: number[] }).dims !== "undefined") {
    inputTokens = (inputIds as { dims: number[] }).dims.reduce((a, b) => a * b, 1);
  } else if (inputIds && typeof (inputIds as { size?: number }).size === "number") {
    inputTokens = (inputIds as { size: number }).size;
  }

  const streamer = new TextStreamer(tokenizer, {
    skip_prompt: true,
    skip_special_tokens: true,
    callback_function: (text: string) => {
      fullText += text;
      callbacks.onChunk(text);
    },
    token_callback_function: callbacks.onTokensPerSec
      ? () => {
          tokenCount++;
          const elapsedSec = (performance.now() - startTime) / 1000;
          callbacks.onTokensPerSec!(tokenCount / elapsedSec, tokenCount, elapsedSec, inputTokens);
        }
      : undefined,
  });

  const maxNewTokens = getAiMaxNewTokens();
  const temperature = getAiTemperature();
  const topP = getAiTopP();
  const outputs = await model.generate({
    ...input,
    max_new_tokens: maxNewTokens,
    do_sample: true,
    temperature,
    top_p: topP,
    streamer,
  });

  if (callbacks.onComplete) {
    const elapsedSec = (performance.now() - startTime) / 1000;
    callbacks.onComplete(tokenCount, elapsedSec, inputTokens);
  }

  return fullText;
}
