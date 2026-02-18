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

async function headContentLength(url: string): Promise<number> {
  try {
    // Prefer HEAD so we don't download large files just to learn size.
    // Some endpoints may not allow HEAD/CORS; fall back to GET headers if needed.
    for (let i = 0; i < 3; i++) {
      try {
        const head = await fetch(url, { method: "HEAD" });
        if (head.ok) {
          const len = head.headers.get("content-length");
          return len ? parseInt(len, 10) : 0;
        }
        // If server errors, retry.
        if (head.status >= 500 && i < 2) {
          await sleep(500 * Math.pow(2, i));
          continue;
        }
        break;
      } catch {
        if (i < 2) {
          await sleep(500 * Math.pow(2, i));
          continue;
        }
      }
    }

    const res = await fetchWithRetry(url, 3);
    if (!res.ok) return 0;
    const len = res.headers.get("content-length");
    return len ? parseInt(len, 10) : 0;
  } catch {
    return 0;
  }
}

function dtypeToModelStem(dtype: string): string {
  if (dtype === "fp16") return "model_fp16";
  if (dtype === "q4f16") return "model_q4f16";
  return "model_q4";
}

async function listModelFiles(dtype: string = MODEL_DTYPE): Promise<string[]> {
  // Prefer dynamic discovery so we handle upstream changes (e.g. multiple onnx_data shards).
  // HuggingFace model API returns siblings list.
  const apiUrl = `${HF_CDN_BASE}/api/models/${MODEL_ID}?revision=${encodeURIComponent(MODEL_REVISION)}`;
  try {
    const res = await fetchWithRetry(apiUrl, 3);
    if (!res.ok) throw new Error(`HF API failed: ${res.status}`);
    const json = (await res.json()) as { siblings?: Array<{ rfilename?: string }> };
    const sibs = (json.siblings ?? []).map((s) => s.rfilename).filter(Boolean) as string[];
    const stem = dtypeToModelStem(dtype);
    const onnxFile = `onnx/${stem}.onnx`;
    const dataPrefix = `onnx/${stem}.onnx_data`;
    const dataFiles = sibs.filter((f) => f.startsWith(dataPrefix));

    // If repo does not list data files for some reason, fall back to single-file assumption.
    if (dataFiles.length === 0) {
      return [onnxFile, `${dataPrefix}`];
    }

    // Ensure stable order: base file first, then _1, _2, ...
    dataFiles.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    const files = [onnxFile, ...dataFiles];
    console.info("[model] discovered files", { count: files.length, files });
    return files;
  } catch {
    // Offline / blocked / transient: keep existing behavior.
    const stem = dtypeToModelStem(dtype);
    const fallback = [`onnx/${stem}.onnx`, `onnx/${stem}.onnx_data`];
    console.info("[model] file discovery fallback", { files: fallback });
    return fallback;
  }
}

async function ensureFilesCached(files: string[]): Promise<void> {
  const cache = await openModelCache();
  if (!cache) {
    throw new Error(
      "Cache Storage is unavailable, so the model cannot be persisted locally. " +
        "Open DevTools → Application → Storage and ensure storage is allowed (not private mode), and use https/localhost."
    );
  }

  const urls = files.map((f) => `${HF_CDN_BASE}/${MODEL_ID}/resolve/${MODEL_REVISION}/${f}`);
  const sizes = await Promise.all(urls.map((u) => headContentLength(u)));
  const totalSize = sizes.reduce((a, b) => a + b, 0);
  console.info("[model] ensure cache", {
    count: files.length,
    totalBytes: totalSize,
    files: files.map((f, i) => ({ file: f, bytes: sizes[i] || 0 })),
  });

  let cumulativeDownloaded = 0;
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const fileUrl = urls[i];
    const fileSize = sizes[i] || 0;

    const cachedResponse = await cache.match(fileUrl);
    if (cachedResponse && cachedResponse.ok) {
      cumulativeDownloaded += fileSize;
      continue;
    }

    console.info("[model] downloading", { file, url: fileUrl, expectedBytes: fileSize || undefined });
    const response = await downloadFileWithProgress(fileUrl, () => {});
    await cache.put(fileUrl, response);
    cumulativeDownloaded += fileSize;
    console.info("[model] cached", { file, downloadedBytes: cumulativeDownloaded });
  }
}

// Dynamic import to avoid SSR issues
let AutoModelForCausalLM: any = null;
let AutoTokenizer: any = null;

const MODEL_ID = "LiquidAI/LFM2.5-1.2B-Instruct-ONNX";
const MODEL_DTYPE = "q4"; // Use Q4 for WebGPU (recommended)

// Optional: pin a specific HuggingFace git revision (commit SHA or tag) to avoid upstream breaking changes.
// Set NEXT_PUBLIC_MODEL_REVISION to a known-good revision.
const MODEL_REVISION = process.env.NEXT_PUBLIC_MODEL_REVISION || "main";

// Bump this to force clients to redownload if the upstream model files change.
const MODEL_CACHE_VERSION = 2;

const MODEL_ONNX_FILE = "onnx/model_q4.onnx";
const MODEL_DATA_PREFIX = "onnx/model_q4.onnx_data";

const HF_CDN_BASE = "https://huggingface.co";
// Single canonical cache: only ever download once, always use this root cache
const CACHE_PREFIX = `antiprism-model-${MODEL_ID.replace(/\//g, "-")}-${MODEL_REVISION}`;
const CACHE_NAME = `${CACHE_PREFIX}-v${MODEL_CACHE_VERSION}`;

function isCacheStorageAvailable(): boolean {
  return typeof window !== "undefined" && "caches" in window;
}

async function openModelCache(): Promise<Cache | null> {
  if (!isCacheStorageAvailable()) return null;
  try {
    return await caches.open(CACHE_NAME);
  } catch {
    return null;
  }
}

async function cleanupOldModelCaches(): Promise<void> {
  if (!isCacheStorageAvailable()) return;
  try {
    const keys = await caches.keys();
    const toDelete = keys.filter((k) => k.startsWith(CACHE_PREFIX) && k !== CACHE_NAME);
    if (toDelete.length > 0) {
      console.info("[model] clearing old caches", { keep: CACHE_NAME, delete: toDelete });
    }
    await Promise.all(
      toDelete.map((k) => caches.delete(k))
    );
  } catch {
    // ignore
  }
}

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
    await cleanupOldModelCaches();
    const cache = await openModelCache();
    if (cache) {
      transformers.env.useCustomCache = true;
      transformers.env.customCache = cache;
      console.info("[model] using Cache Storage", { cache: CACHE_NAME });
    } else {
      // Some contexts (private browsing, blocked storage, non-secure origins) may not allow Cache Storage.
      // Fall back to transformers' default caching behavior.
      transformers.env.useCustomCache = false;
      console.warn(
        "Model cache disabled: Cache Storage unavailable. Model will re-download and may fail on flaky networks. " +
          "Try a non-private window, allow site storage, and use https/localhost."
      );
    }
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

async function sleep(ms: number): Promise<void> {
  await new Promise((r) => setTimeout(r, ms));
}

async function fetchWithRetry(url: string, attempts: number = 3): Promise<Response> {
  let lastErr: unknown = null;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return res;
      // Retry for transient server/CDN issues
      if (res.status >= 500 && i < attempts - 1) {
        await sleep(500 * Math.pow(2, i));
        continue;
      }
      return res;
    } catch (e) {
      lastErr = e;
      if (i < attempts - 1) {
        await sleep(500 * Math.pow(2, i));
        continue;
      }
      throw lastErr;
    }
  }
  // Unreachable, but TS wants a return
  throw lastErr;
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

async function preflightWebGPU(): Promise<void> {
  if (typeof navigator === "undefined" || !("gpu" in navigator)) {
    throw new Error("WEBGPU_UNAVAILABLE");
  }
  // Request an adapter/device to force early, actionable failures.
  const adapter = await (navigator as any).gpu.requestAdapter();
  if (!adapter) {
    throw new Error("WEBGPU_NO_ADAPTER");
  }

  try {
    const features = Array.from(adapter.features ?? []);
    const limits = adapter.limits ?? {};
    console.info("[model] webgpu adapter", { features, limits });
  } catch {
    // ignore
  }

  try {
    const device = await adapter.requestDevice();
    console.info("[model] webgpu device ok");
    try {
      device.destroy?.();
    } catch {
      // ignore
    }
  } catch (e) {
    console.error("[model] webgpu requestDevice failed", e);
    throw new Error("WEBGPU_REQUEST_DEVICE_FAILED");
  }
}

async function logCacheStatus(requiredFiles: string[]): Promise<void> {
  const cache = await openModelCache();
  if (!cache) {
    console.info("[model] cache status", { available: false });
    return;
  }
  const missing: string[] = [];
  for (const file of requiredFiles) {
    const fileUrl = `${HF_CDN_BASE}/${MODEL_ID}/resolve/${MODEL_REVISION}/${file}`;
    const res = await cache.match(fileUrl);
    if (!res || !res.ok) missing.push(file);
  }
  console.info("[model] cache status", {
    available: true,
    cache: CACHE_NAME,
    revision: MODEL_REVISION,
    requiredCount: requiredFiles.length,
    missingCount: missing.length,
    missing,
  });
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
  const response = await fetchWithRetry(url, 3);
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
      await cleanupOldModelCaches();
      currentStats = { downloadedBytes: 0, totalBytes: 0, speedBytesPerSecond: 0 };
      updateProgress(0);

      console.info("[model] load start", { modelId: MODEL_ID, dtype: MODEL_DTYPE, cache: CACHE_NAME });
      console.info("[model] revision", { revision: MODEL_REVISION });

      const { AutoModelForCausalLM: ModelClass, AutoTokenizer: TokenizerClass } =
        await loadTransformers();

      if (!checkWebGPUSupport()) {
        throw new Error("WebGPU is not available. Please enable WebGPU in your browser settings.");
      }

      await preflightWebGPU();

      await ensureTokenizer();

      let needsDownload = true;
      try {
        const cache = await openModelCache();
        if (!cache) {
          needsDownload = true;
          throw new Error("CACHE_STORAGE_UNAVAILABLE");
        }
        const requiredFiles = await listModelFiles(MODEL_DTYPE);
        await logCacheStatus(requiredFiles);
        let allFilesCached = true;
        for (const file of requiredFiles) {
          const fileUrl = `${HF_CDN_BASE}/${MODEL_ID}/resolve/${MODEL_REVISION}/${file}`;
          const cachedResponse = await cache.match(fileUrl);
          if (!cachedResponse || !cachedResponse.ok) {
            allFilesCached = false;
            break;
          }
        }
        if (allFilesCached) {
          needsDownload = false;
          console.info("[model] cache hit (all files present)");
          updateProgress(100);
        }
      } catch {
        needsDownload = true;
        console.info("[model] cache miss (will download)");
      }

      if (needsDownload) {
        const files = await listModelFiles(MODEL_DTYPE);
        // After download completes we log cache status again.
        const urls = files.map((f) => `${HF_CDN_BASE}/${MODEL_ID}/resolve/${MODEL_REVISION}/${f}`);
        const sizes = await Promise.all(urls.map((u) => headContentLength(u)));
        const totalSize = sizes.reduce((a, b) => a + b, 0);
        currentStats.totalBytes = totalSize;

        console.info("[model] download plan", {
          count: files.length,
          totalBytes: totalSize,
          files: files.map((f, i) => ({ file: f, bytes: sizes[i] || 0 })),
        });

        isDownloadPhase = true;
        updateProgress(0, { totalBytes: totalSize, downloadedBytes: 0 });

        const cache = await openModelCache();
        if (!cache) {
          throw new Error(
            "Cache Storage is unavailable, so the model cannot be persisted locally. " +
              "Open DevTools → Application → Storage and ensure storage is allowed (not private mode), and use https/localhost."
          );
        }
        let cumulativeDownloaded = 0;

        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const fileUrl = urls[i];
          const fileSize = sizes[i] || 0;

          const cachedResponse = await cache.match(fileUrl);
          if (cachedResponse && cachedResponse.ok) {
            cumulativeDownloaded += fileSize;
            if (totalSize > 0) {
              updateProgress((cumulativeDownloaded / totalSize) * 100, {
                downloadedBytes: cumulativeDownloaded,
              });
            } else {
              updateProgress(((i + 1) / files.length) * 100, {
                downloadedBytes: cumulativeDownloaded,
              });
            }
            continue;
          }

          if (cachedResponse && !cachedResponse.ok) {
            try {
              await cache.delete(fileUrl);
            } catch {
              // ignore
            }
          }

          console.info("[model] downloading", { file, url: fileUrl, expectedBytes: fileSize || undefined });
          const response = await downloadFileWithProgress(fileUrl, (loaded, _total, speed) => {
            const totalDownloaded = cumulativeDownloaded + loaded;
            if (totalSize > 0) {
              updateProgress(Math.min(100, (totalDownloaded / totalSize) * 100), {
                downloadedBytes: totalDownloaded,
                speedBytesPerSecond: speed,
              });
            } else {
              updateProgress(((i + 1) / files.length) * 100, {
                downloadedBytes: totalDownloaded,
                speedBytesPerSecond: speed,
              });
            }
          });

          await cache.put(fileUrl, response);
          cumulativeDownloaded += fileSize;
          console.info("[model] cached", { file, downloadedBytes: cumulativeDownloaded });
        }

        await logCacheStatus(files);

        updateProgress(100, { downloadedBytes: totalSize || cumulativeDownloaded });
        isDownloadPhase = false;
        updateProgress(0);
      } else {
        isDownloadPhase = false;
        updateProgress(0);
      }

      const modelPromise = ModelClass.from_pretrained(MODEL_ID, {
        device: "webgpu",
        dtype: MODEL_DTYPE,
        revision: MODEL_REVISION,
      });

      console.info("[model] initializing onnx/webgpu runtime");

      let loadingProgress = 0;
      const loadingInterval = setInterval(() => {
        if (loadingProgress < 99) {
          loadingProgress += 1;
          updateProgress(loadingProgress);
        }
      }, 150);

      try {
        try {
          model = await modelPromise;
        } catch (e) {
          console.error("[model] from_pretrained failed", e);

          // Upstream ONNX exports may change in ways that break a specific dtype.
          // Retry with alternative WebGPU-compatible variants if available.
          const fallbacks = MODEL_DTYPE === "q4" ? (["q4f16", "fp16"] as const) : ([] as const);
          for (const dtype of fallbacks) {
            try {
              console.info("[model] retrying from_pretrained", { dtype });

              // Ensure the variant's ONNX + external data files exist in cache before retrying.
              const dtypeFiles = await listModelFiles(dtype);
              await ensureFilesCached(dtypeFiles);

              model = await ModelClass.from_pretrained(MODEL_ID, {
                device: "webgpu",
                dtype,
                revision: MODEL_REVISION,
              });
              console.info("[model] from_pretrained retry succeeded", { dtype });
              break;
            } catch (e2) {
              console.error("[model] from_pretrained retry failed", { dtype }, e2);
            }
          }

          if (!model) {
            // WebGPU kernels can break with upstream ONNX export changes. Keep the app functional by
            // falling back to WASM (slower), using the same model files.
            try {
              console.warn("[model] webgpu load failed; falling back to wasm backend");
              model = await ModelClass.from_pretrained(MODEL_ID, {
                device: "wasm",
                dtype: "q4",
                revision: MODEL_REVISION,
              });
              console.info("[model] wasm fallback load succeeded");
            } catch (e3) {
              console.error("[model] wasm fallback load failed", e3);
              throw e;
            }
          }
        }
      } finally {
        clearInterval(loadingInterval);
      }

      updateProgress(100);
      console.info("[model] load complete");
    } catch (error) {
      // Add context so flaky-network issues are distinguishable from WebGPU/model issues.
      const errMsg =
        typeof error === "number"
          ? `numeric_error_code:${error}`
          : error instanceof Error
            ? error.message
            : String(error);
      console.error("Error loading model:", errMsg, error);
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
