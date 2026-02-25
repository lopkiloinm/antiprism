"use client";
import { getModelById } from "./modelConfig";
import { fireProgressCallback } from "./localModel";

const AUDIO_MODEL = getModelById("lfm25-audio-1.5b");
const HF = "https://huggingface.co";
const HIDDEN = AUDIO_MODEL.hiddenSize ?? 2048;
const KV_HEADS = AUDIO_MODEL.numKVHeads ?? 8;
const HEAD_DIM = AUDIO_MODEL.headDim ?? 64;

// Type assertion for audio model session files
const SF = (AUDIO_MODEL.sessionFiles as unknown) as { 
  decoder: string;
  audioEncoder: string;
  audioEmbedding: string;
  audioDetokenizer: string;
  vocoderDepthformer: string;
} ?? { 
  decoder: "decoder_q4",
  audioEncoder: "audio_encoder_q4",
  audioEmbedding: "audio_embedding_q4",
  audioDetokenizer: "audio_detokenizer_q4",
  vocoderDepthformer: "vocoder_depthformer_q4"
};

function cacheNameForAudio(): string {
  const prefix = AUDIO_MODEL.label
    .replace(/[^a-zA-Z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .toLowerCase();
  return `antiprism-model-${prefix}-${AUDIO_MODEL.revision}-v2`;
}

export interface AudioMessage { 
  role: "user"|"assistant"|"system"; 
  content: string; 
  audio?: string; // audio data URL or path
}

export async function listAudioModelFiles(): Promise<string[]> {
  const stems = [
    SF.decoder, 
    SF.audioEncoder, 
    SF.audioEmbedding, 
    SF.audioDetokenizer, 
    SF.vocoderDepthformer
  ].filter(Boolean) as string[];
  
  const files = new Set<string>();
  for (const stem of stems) {
    files.add(`onnx/${stem}.onnx`);
    const dataFiles = await discoverData(stem);
    for (const f of dataFiles) files.add(f);
  }
  
  // Audio specific additional files
  files.add(`onnx/embed_tokens.bin`);
  files.add(`onnx/embed_tokens.json`);
  
  return Array.from(files);
}

export interface AudioStreamCallbacks {
  onChunk: (t: string) => void;
  onAudioData?: (data: Float32Array) => void;
  onTokensPerSec?: (tps: number, total: number, elapsed: number) => void;
  onComplete?: (tokens: number, elapsed: number) => void;
}

let ort: any, decS: any, audEncS: any, audEmbS: any, audDetokS: any, depthS: any, tok: any;
let embedWeight: Float32Array | null = null;
let embedMeta: any = null;
let eosTok = 2, loading = false, loadP: Promise<void>|null = null;
let progCb: ((p: number, s: string) => void)|null = null;

// internal wrapper that also fires the global progress callback
const updateProgress = (p: number, s: string) => {
  progCb?.(p, s);
  fireProgressCallback(p, { downloadedBytes: p, totalBytes: 100, speedBytesPerSecond: 0 });
};

export const setAudioProgressCallback = (cb: (p: number, s: string) => void) => { progCb = cb; };
export const isAudioModelLoaded = () => !!(decS && tok);
export const isAudioModelLoading = () => loading;

export async function initializeAudioModel() {
  if (isAudioModelLoaded()) return;
  if (loadP) return loadP;
  
  // Clear old v1 cache before loading
  try {
    const keys = await caches.keys();
    const prefix = `antiprism-model-${AUDIO_MODEL.label.replace(/[^a-zA-Z0-9\s-]/g, "").replace(/\s+/g, "-").toLowerCase()}-${AUDIO_MODEL.revision}`;
    const keep = cacheNameForAudio();
    const toDelete = keys.filter((k) => k.startsWith(prefix) && k !== keep);
    if (toDelete.length > 0) {
      console.info("[Audio] clearing old caches", { keep, delete: toDelete });
      await Promise.all(toDelete.map((k) => caches.delete(k)));
    }
  } catch {
    // ignore cache clearing errors
  }
  
  loadP = doLoad();
  return loadP;
}

export function disposeAudioModel() {
  decS?.release?.(); 
  audEncS?.release?.();
  audEmbS?.release?.();
  audDetokS?.release?.();
  depthS?.release?.();
  decS = audEncS = audEmbS = audDetokS = depthS = tok = null; 
  embedWeight = null;
  embedMeta = null;
  loading = false; 
  loadP = null;
}

function fUrl(n: string) { return `${HF}/${AUDIO_MODEL.hfId}/resolve/${AUDIO_MODEL.revision}/${n}`; }

async function discoverData(stem: string) {
  try {
    const r = await fetch(`${HF}/api/models/${AUDIO_MODEL.hfId}?revision=${encodeURIComponent(AUDIO_MODEL.revision)}`);
    if (!r.ok) throw 0;
    const sibs: string[] = ((await r.json()).siblings ?? []).map((s: any) => s.rfilename).filter(Boolean);
    const pre = `onnx/${stem}.onnx_data`;
    const f = sibs.filter((x: string) => x.startsWith(pre));
    f.sort((a: string, b: string) => a.localeCompare(b, undefined, { numeric: true }));
    return f.length ? f : [pre];
  } catch { return [`onnx/${stem}.onnx_data`]; }
}

async function headLen(url: string) {
  try {
    const r = await fetch(url, { method: "HEAD", redirect: "follow" });
    if (r.ok) return parseInt(r.headers.get("content-length") || "0", 10);
    const r2 = await fetch(url, { redirect: "follow" });
    if (r2.ok) return parseInt(r2.headers.get("content-length") || "0", 10);
  } catch {}
  return 0;
}

async function fetchWithRetry(url: string, attempts: number = 3): Promise<Response> {
  let lastErr: unknown = null;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return res;
      // Retry for transient server/CDN issues
      if (res.status >= 500 && i < attempts - 1) {
        await new Promise(r => setTimeout(r, 500 * Math.pow(2, i)));
        continue;
      }
      return res;
    } catch (e) {
      lastErr = e;
      if (i < attempts - 1) {
        await new Promise(r => setTimeout(r, 500 * Math.pow(2, i)));
        continue;
      }
    }
  }
  throw lastErr;
}

async function downloadFile(url: string, onProg: (l: number, s: number) => void) {
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
    onProg(loaded, speedBytesPerSecond);
  }

  const blob = new Blob(chunks as BlobPart[]);
  return new Response(blob, {
    headers: response.headers,
    status: response.status,
    statusText: response.statusText,
  });
}

async function ensureCached(files: string[]) {
  if (!("caches" in window)) return;
  const cacheName = cacheNameForAudio();
  const cache = await caches.open(cacheName);
  const urls = files.map(f => fUrl(f));
  const sizes = await Promise.all(urls.map(u => headLen(u)));
  const total = sizes.reduce((a, b) => a + b, 0);
  let cumulative = 0;

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i], size = sizes[i];
    const cached = await cache.match(url);
    if (cached && cached.ok) {
      cumulative += size;
      updateProgress((cumulative / Math.max(1, total)) * 100, `Cached ${i + 1}/${urls.length}`);
      continue;
    }
    const res = await downloadFile(url, (loaded, speed) => {
      const cur = cumulative + loaded;
      const prog = total > 0 ? (cur / total) * 100 : ((i + 1) / urls.length) * 100;
      fireProgressCallback(prog, { downloadedBytes: cur, totalBytes: total, speedBytesPerSecond: speed });
      progCb?.(prog, `Downloading...`);
    });
    await cache.put(url, res);
    cumulative += size;
  }
}

async function getMissingCachedFiles(files: string[]): Promise<string[]> {
  if (!("caches" in window)) return [...files];
  const cache = await caches.open(cacheNameForAudio());
  const missing: string[] = [];

  for (const file of files) {
    const url = fUrl(file);
    const cached = await cache.match(url);
    if (!cached || !cached.ok) {
      missing.push(file);
      continue;
    }
    try {
      await cached.clone().arrayBuffer();
    } catch {
      missing.push(file);
    }
  }

  return missing;
}

async function makeSess(o: any, stem: string, label: string) {
  const onnxPath = `onnx/${stem}.onnx`;
  const dataFiles = await discoverData(stem);
  
  // Load cached data files as ArrayBuffers for ONNX Runtime
  const cache = await caches.open(cacheNameForAudio());
  const ext: { path: string; data: ArrayBuffer }[] = [];
  
  for (const file of dataFiles) {
    const url = fUrl(file);
    const cached = await cache.match(url);
    if (cached && cached.ok) {
      const arrayBuffer = await cached.arrayBuffer();
      // ONNX Runtime expects just the filename, not the full path
      const filename = file.split('/').pop() || file;
      ext.push({ path: filename, data: arrayBuffer });
    } else {
      throw new Error(`Required data file not cached: ${file}`);
    }
  }
  
  const url = fUrl(`onnx/${stem}.onnx`);
  console.log(`[Audio] ${label} loading:`, { url, dataFiles, externalDataCount: ext.length });
  try {
    return await o.InferenceSession.create(url, { executionProviders: ["webgpu"], externalData: ext });
  } catch (e) {
    console.warn(`[Audio] ${label} webgpu fail, wasm:`, e);
    return await o.InferenceSession.create(url, { executionProviders: ["wasm"], externalData: ext });
  }
}

async function doLoad() {
  if (loading) return; loading = true;
  try {
    if (typeof navigator === "undefined" || !("gpu" in navigator)) throw new Error("No WebGPU");
    if (!(await (navigator as any).gpu.requestAdapter())) throw new Error("No adapter");
    updateProgress(0, "Init ONNX...");
    const o = await import("onnxruntime-web/webgpu"); o.env.wasm.numThreads = 1; ort = o;
    updateProgress(5, "Loading tokenizer...");
    const { AutoTokenizer } = await import("@huggingface/transformers");
    tok = await AutoTokenizer.from_pretrained(AUDIO_MODEL.hfId);
    eosTok = tok.eos_token_id ?? 2;
    
    // Download all files first before loading sessions
    updateProgress(10, "Downloading model files...");
    const requiredFiles = await listAudioModelFiles();
    await ensureCached(requiredFiles);
    
    updateProgress(70, "Loading model sessions...");
    decS = await makeSess(ort, SF.decoder!, "Decoder");
    if (SF.audioEncoder) {
      try { audEncS = await makeSess(ort, SF.audioEncoder, "AudioEncoder"); } catch {}
    }
    if (SF.vocoderDepthformer) {
      try { depthS = await makeSess(ort, SF.vocoderDepthformer, "Depthformer"); } catch {}
    }
    if (SF.audioEmbedding) {
      try { audEmbS = await makeSess(ort, SF.audioEmbedding, "AudioEmb"); } catch {}
    }
    if (SF.audioDetokenizer) {
      try { audDetokS = await makeSess(ort, SF.audioDetokenizer, "Detokenizer"); } catch {}
    }

    // Verify cache (should all be cached now)
    const missing = await getMissingCachedFiles(requiredFiles);
    if (missing.length > 0) {
      throw new Error(`Audio cache verification failed. Missing ${missing.length} files: ${missing.join(", ")}`);
    }

    updateProgress(90, "Loading embeddings...");
    const cache = await caches.open(cacheNameForAudio());
    const binUrl = fUrl("onnx/embed_tokens.bin");
    const jsonUrl = fUrl("onnx/embed_tokens.json");
    
    let binRes = await cache.match(binUrl);
    if (!binRes || !binRes.ok) binRes = await fetch(binUrl);
    embedWeight = new Float32Array(await binRes.arrayBuffer());
    
    let jsonRes = await cache.match(jsonUrl);
    if (!jsonRes || !jsonRes.ok) jsonRes = await fetch(jsonUrl);
    embedMeta = await jsonRes.json();
    
    updateProgress(100, "Audio ready");
  } catch (e) { console.error("[Audio] load:", e); disposeAudioModel(); throw e; }
  finally { loading = false; }
}

function getTextEmbeddings(ids: number[]) {
  if (!embedWeight || !embedMeta) throw new Error("Embeddings not loaded");
  const hiddenSize = embedMeta.hidden_size;
  const embeds = new Float32Array(ids.length * hiddenSize);
  for (let i = 0; i < ids.length; i++) {
    const offset = ids[i] * hiddenSize;
    embeds.set(embedWeight.subarray(offset, offset + hiddenSize), i * hiddenSize);
  }
  return new ort.Tensor("float32", embeds, [1, ids.length, hiddenSize]);
}

// --- Audio Processing (Mel Spectrogram) ---
const MEL_CONFIG = {
  sample_rate: 16000,
  n_fft: 512,
  win_length: 400,
  hop_length: 160,
  n_mels: 128,
  fmin: 0,
  fmax: 8000,
  preemph: 0.97,
  log_zero_guard: 5.960464477539063e-08,
};

let melFilterbank: Float32Array[] | null = null;
let fftCache: any = null;

function createMelFilterbank(sr: number, nFft: number, nMels: number, fmin: number, fmax: number) {
  const nFreqs = Math.floor(nFft / 2) + 1;
  const hzToMel = (hz: number) => 2595 * Math.log10(1 + hz / 700);
  const melToHz = (mel: number) => 700 * (Math.pow(10, mel / 2595) - 1);
  const melMin = hzToMel(fmin), melMax = hzToMel(fmax);
  const melPoints = new Float32Array(nMels + 2);
  for (let i = 0; i < nMels + 2; i++) melPoints[i] = melMin + (melMax - melMin) * i / (nMels + 1);
  const hzPoints = Array.from(melPoints).map(melToHz);
  const binPoints = hzPoints.map(hz => Math.floor((nFft + 1) * hz / sr));
  const filterbank: Float32Array[] = [];
  for (let m = 0; m < nMels; m++) {
    const filter = new Float32Array(nFreqs);
    const start = binPoints[m], center = binPoints[m + 1], end = binPoints[m + 2];
    for (let k = start; k < center; k++) if (k < nFreqs) filter[k] = (k - start) / (center - start);
    for (let k = center; k < end; k++) if (k < nFreqs) filter[k] = (end - k) / (end - center);
    const enorm = 2.0 / (hzPoints[m + 2] - hzPoints[m]);
    for (let k = 0; k < nFreqs; k++) filter[k] *= enorm;
    filterbank.push(filter);
  }
  return filterbank;
}

function initFFT(n: number) {
  if (fftCache && fftCache.n === n) return fftCache;
  const twiddleRe = new Float32Array(n / 2), twiddleIm = new Float32Array(n / 2);
  for (let i = 0; i < n / 2; i++) {
    const angle = -2 * Math.PI * i / n;
    twiddleRe[i] = Math.cos(angle); twiddleIm[i] = Math.sin(angle);
  }
  const bitrev = new Uint32Array(n);
  for (let i = 0; i < n; i++) {
    let j = 0, x = i;
    for (let k = 1; k < n; k <<= 1) { j = (j << 1) | (x & 1); x >>= 1; }
    bitrev[i] = j;
  }
  fftCache = { n, twiddleRe, twiddleIm, bitrev, workRe: new Float32Array(n), workIm: new Float32Array(n) };
  return fftCache;
}

function computeRfftMagnitude(frame: Float32Array) {
  const n = frame.length, nFreqs = Math.floor(n / 2) + 1;
  const { twiddleRe, twiddleIm, bitrev, workRe, workIm } = initFFT(n);
  for (let i = 0; i < n; i++) { workRe[bitrev[i]] = frame[i]; workIm[bitrev[i]] = 0; }
  for (let len = 2; len <= n; len <<= 1) {
    const halfLen = len >> 1, step = n / len;
    for (let i = 0; i < n; i += len) {
      for (let j = 0; j < halfLen; j++) {
        const twIdx = j * step, wRe = twiddleRe[twIdx], wIm = twiddleIm[twIdx];
        const u = i + j, v = u + halfLen;
        const tRe = wRe * workRe[v] - wIm * workIm[v], tIm = wRe * workIm[v] + wIm * workRe[v];
        workRe[v] = workRe[u] - tRe; workIm[v] = workIm[u] - tIm;
        workRe[u] += tRe; workIm[u] += tIm;
      }
    }
  }
  const magnitude = new Float32Array(nFreqs);
  for (let k = 0; k < nFreqs; k++) magnitude[k] = Math.sqrt(workRe[k] * workRe[k] + workIm[k] * workIm[k]);
  return magnitude;
}

function resampleAudio(audio: Float32Array, srcSr: number, dstSr: number) {
  if (srcSr === dstSr) return audio;
  const ratio = srcSr / dstSr, newLength = Math.floor(audio.length / ratio);
  const resampled = new Float32Array(newLength);
  for (let i = 0; i < newLength; i++) {
    const srcIdx = i * ratio, srcIdxFloor = Math.floor(srcIdx);
    const srcIdxCeil = Math.min(srcIdxFloor + 1, audio.length - 1), frac = srcIdx - srcIdxFloor;
    resampled[i] = audio[srcIdxFloor] * (1 - frac) + audio[srcIdxCeil] * frac;
  }
  return resampled;
}

export function computeMelSpectrogram(audioData: Float32Array, sampleRate: number) {
  const { sample_rate: targetSr, n_fft: nFft, win_length: winLength, hop_length: hopLength, preemph, log_zero_guard: logZeroGuard, n_mels: nMels } = MEL_CONFIG;
  if (!melFilterbank) melFilterbank = createMelFilterbank(targetSr, nFft, nMels, MEL_CONFIG.fmin, MEL_CONFIG.fmax);
  
  const audio = resampleAudio(audioData, sampleRate, targetSr);
  const audioPreemph = new Float32Array(audio.length);
  audioPreemph[0] = audio[0];
  for (let i = 1; i < audio.length; i++) audioPreemph[i] = audio[i] - preemph * audio[i - 1];
  
  const padAmount = Math.floor(nFft / 2);
  const audioPadded = new Float32Array(audio.length + 2 * padAmount);
  audioPadded.set(audioPreemph, padAmount);
  
  const numFrames = 1 + Math.floor((audioPadded.length - nFft) / hopLength);
  const nFreqs = Math.floor(nFft / 2) + 1;
  const hannWindow = new Float32Array(winLength);
  for (let i = 0; i < winLength; i++) hannWindow[i] = 0.5 * (1 - Math.cos(2 * Math.PI * i / (winLength - 1)));
  
  const padLeft = Math.floor((nFft - winLength) / 2);
  const paddedWindow = new Float32Array(nFft);
  for (let i = 0; i < winLength; i++) paddedWindow[padLeft + i] = hannWindow[i];
  
  const melFeatures = new Float32Array(numFrames * nMels);
  for (let frameIdx = 0; frameIdx < numFrames; frameIdx++) {
    const start = frameIdx * hopLength;
    const frame = new Float32Array(nFft);
    for (let i = 0; i < nFft; i++) frame[i] = audioPadded[start + i] * paddedWindow[i];
    const magnitude = computeRfftMagnitude(frame);
    for (let m = 0; m < nMels; m++) {
      let melVal = 0;
      for (let k = 0; k < nFreqs; k++) melVal += melFilterbank[m][k] * magnitude[k] * magnitude[k];
      melFeatures[frameIdx * nMels + m] = Math.log(Math.max(melVal, logZeroGuard));
    }
  }
  
  // Per-feature normalization
  for (let m = 0; m < nMels; m++) {
    let mean = 0, std = 0;
    for (let t = 0; t < numFrames; t++) mean += melFeatures[t * nMels + m];
    mean /= numFrames;
    for (let t = 0; t < numFrames; t++) {
      const diff = melFeatures[t * nMels + m] - mean;
      std += diff * diff;
    }
    std = Math.sqrt(std / numFrames + 1e-5);
    for (let t = 0; t < numFrames; t++) melFeatures[t * nMels + m] = (melFeatures[t * nMels + m] - mean) / std;
  }
  return { melFeatures, numFrames };
}

export async function loadAudioFile(dataUrl: string): Promise<{audioData: Float32Array, sampleRate: number}> {
  const res = await fetch(dataUrl);
  const arrayBuffer = await res.arrayBuffer();
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  try {
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    let audioData: Float32Array;
    if (audioBuffer.numberOfChannels === 1) {
      audioData = audioBuffer.getChannelData(0);
    } else {
      const ch0 = audioBuffer.getChannelData(0), ch1 = audioBuffer.getChannelData(1);
      audioData = new Float32Array(ch0.length);
      for (let i = 0; i < ch0.length; i++) audioData[i] = (ch0[i] + ch1[i]) / 2;
    }
    return { audioData: new Float32Array(audioData), sampleRate: audioBuffer.sampleRate };
  } finally {
    audioContext.close();
  }
}

// --- Audio Generation & Decoding ---
const NUM_CODEBOOKS = 8;
const CODEBOOK_VOCAB = 2049;
const END_OF_AUDIO_TOKEN = 2048;

let vocoderCache: any = null;

function initVocoderCache() {
  if (vocoderCache) return;
  const stepIdxData = new BigInt64Array(1);
  const prevTokenData = new BigInt64Array(1);
  vocoderCache = {
    stepIdxData,
    prevTokenData,
    stepIdxTensor: new ort.Tensor('int64', stepIdxData, []),
    prevTokenTensor: new ort.Tensor('int64', prevTokenData, [1]),
    emptyKeysData: new Float32Array(0),
    emptyValuesData: new Float32Array(0),
    scaledLogits: new Float32Array(2049),
    indices: new Uint16Array(2049),
    probs: new Float32Array(64),
  };
  for (let i = 0; i < 2049; i++) vocoderCache.indices[i] = i;
}

async function sampleAudioCodes(hiddenState: Float32Array, temperature = 0.8, topK = 64) {
  initVocoderCache();
  const cache = vocoderCache;
  const codes: number[] = [];
  let prevToken = 0;
  
  const hiddenTensor = new ort.Tensor('float32', hiddenState, [1, HIDDEN]);
  
  // Depthformer config
  const numLayers = 6;
  const numKvHeads = 8;
  const headDim = 32;

  let pastKeys = new ort.Tensor('float32', cache.emptyKeysData, [numLayers, 1, 0, numKvHeads, headDim]);
  let pastValues = new ort.Tensor('float32', cache.emptyValuesData, [numLayers, 1, 0, numKvHeads, headDim]);

  cache.stepIdxData[0] = 0n;
  cache.prevTokenData[0] = 0n;

  for (let i = 0; i < NUM_CODEBOOKS; i++) {
    cache.stepIdxData[0] = BigInt(i);
    cache.prevTokenData[0] = BigInt(prevToken);

    const outputs = await depthS.run({
      hidden_states: hiddenTensor,
      step_idx: cache.stepIdxTensor,
      prev_token: cache.prevTokenTensor,
      past_keys: pastKeys,
      past_values: pastValues,
    });
    
    const logits = outputs.logits.data as Float32Array;
    let token = 0;

    if (temperature <= 0) {
      let maxVal = logits[0];
      for (let j = 1; j < logits.length; j++) {
        if (logits[j] > maxVal) { maxVal = logits[j]; token = j; }
      }
    } else {
      const { scaledLogits, indices, probs } = cache;
      for (let j = 0; j < logits.length; j++) {
        scaledLogits[j] = logits[j] / temperature;
        indices[j] = j;
      }
      for (let j = 0; j < topK; j++) {
        let maxIdx = j;
        for (let k = j + 1; k < logits.length; k++) {
          if (scaledLogits[indices[k]] > scaledLogits[indices[maxIdx]]) maxIdx = k;
        }
        const tmp = indices[j];
        indices[j] = indices[maxIdx];
        indices[maxIdx] = tmp;
      }
      const maxLogit = scaledLogits[indices[0]];
      let sumExp = 0;
      for (let j = 0; j < topK; j++) {
        probs[j] = Math.exp(scaledLogits[indices[j]] - maxLogit);
        sumExp += probs[j];
      }
      for (let j = 0; j < topK; j++) probs[j] /= sumExp;
      
      const r = Math.random();
      let cumsum = 0;
      token = indices[topK - 1];
      for (let j = 0; j < topK; j++) {
        cumsum += probs[j];
        if (r < cumsum) { token = indices[j]; break; }
      }
    }
    
    codes.push(token);
    prevToken = token;
    pastKeys = outputs.new_keys;
    pastValues = outputs.new_values;
  }
  return codes;
}

async function getAudioEmbedding(audioTokens: number[]) {
  // Fallback to ONNX since we haven't loaded binary audio embedding here
  const tensor = new ort.Tensor('int64', new BigInt64Array(audioTokens.map(BigInt)), [1, NUM_CODEBOOKS]);
  const result = await audEmbS.run({ audio_codes: tensor });
  const embData = result.audio_embeds.data as Float32Array;
  
  const summed = new Float32Array(HIDDEN);
  for (let cb = 0; cb < NUM_CODEBOOKS; cb++) {
    for (let h = 0; h < HIDDEN; h++) {
      summed[h] += embData[cb * HIDDEN + h];
    }
  }
  return summed;
}

export async function decodeAudioCodes(audioCodes: number[][]) {
  if (!audDetokS) throw new Error("Audio detokenizer not loaded");
  if (audioCodes.length === 0) return new Float32Array(0);
  
  const numFrames = audioCodes.length;
  // Transpose and flatten for input: [1, 8, num_frames]
  const flatCodes = new BigInt64Array(NUM_CODEBOOKS * numFrames);
  for (let cb = 0; cb < NUM_CODEBOOKS; cb++) {
    for (let t = 0; t < numFrames; t++) {
      flatCodes[cb * numFrames + t] = BigInt(audioCodes[t][cb]);
    }
  }
  
  const tensor = new ort.Tensor('int64', flatCodes, [1, NUM_CODEBOOKS, numFrames]);
  const out = await audDetokS.run({ audio_codes: tensor });
  // Returns waveform: [1, 1, samples]
  return out.waveform.data as Float32Array;
}

function argmax(t: any) {
  let d = t.data;
  if (d.constructor === Uint16Array) {
    const f32 = new Float32Array(d.length);
    for (let i = 0; i < d.length; i++) {
      const h = d[i];
      const sign = (h & 0x8000) << 16;
      const exp = (h & 0x7c00) >> 10;
      let frac = h & 0x03ff;
      if (exp === 0) {
        if (frac === 0) { f32[i] = 0; continue; }
        let e = -14;
        while ((frac & 0x0400) === 0) { frac <<= 1; e--; }
        frac &= 0x03ff;
        const i32 = sign | ((e + 127) << 23) | (frac << 13);
        const ba = new Int32Array([i32]);
        f32[i] = new Float32Array(ba.buffer)[0];
      } else if (exp === 31) {
        const i32 = sign | 0x7f800000 | (frac ? 0x400000 : 0);
        const ba = new Int32Array([i32]);
        f32[i] = new Float32Array(ba.buffer)[0];
      } else {
        const i32 = sign | ((exp + 112) << 23) | (frac << 13);
        const ba = new Int32Array([i32]);
        f32[i] = new Float32Array(ba.buffer)[0];
      }
    }
    d = f32;
  }
  const vs = d.length / t.dims[t.dims.length - 1];
  const off = (vs - 1) * t.dims[t.dims.length - 1];
  let mI = 0, m = -Infinity;
  for (let i = 0; i < t.dims[t.dims.length - 1]; i++) {
    const v = d[off + i];
    if (v > m) { m = v; mI = i; }
  }
  return mI;
}

export async function generateAudioResponse(msgs: AudioMessage[], cb?: AudioStreamCallbacks, maxTok = 1024) {
  if (!isAudioModelLoaded()) await initializeAudioModel();
  if (!decS || !tok || !embedWeight) throw new Error("Audio model not loaded");
  
  // Build prompt
  const sanitize = (text: string) => text.replace(/<\|[^>]+\|>/g, "").replace(/<\/?s>/g, "").trim();
  const chat = msgs.map(m => ({ role: m.role, content: sanitize(m.content) }));
  
  let prompt: string;
  try { 
    prompt = tok.apply_chat_template(chat, { add_generation_prompt: true, tokenize: false }); 
  } catch {
    prompt = "<|startoftext|>" + chat.map((m) => `<|im_start|>${m.role}\n${m.content}<|im_end|>`).join("\n") + "\n<|im_start|>assistant\n";
  }
  
  const ids: number[] = Array.from(tok.encode(prompt));
  let curL = ids.length;

  // Process audio if it exists in the last user message
  let audioEmbeds: Float32Array | null = null;
  const lastUserMsg = msgs.slice().reverse().find(m => m.role === "user");
  if (lastUserMsg && lastUserMsg.audio) {
    if (!audEncS) throw new Error("Audio encoder not loaded");
    updateProgress(0, "Processing audio input...");
    const { audioData, sampleRate } = await loadAudioFile(lastUserMsg.audio);
    const { melFeatures, numFrames } = computeMelSpectrogram(audioData, sampleRate);
    
    const melTensor = new ort.Tensor('float32', melFeatures, [1, numFrames, 128]);
    const melLengths = new ort.Tensor('int64', new BigInt64Array([BigInt(numFrames)]), [1]);
    
    const encOut = await audEncS.run({
      mel_spectrogram: melTensor,
      mel_lengths: melLengths,
    });
    audioEmbeds = encOut.audio_embeddings.data as Float32Array;
  }
  
  let allEmbeds: Float32Array;
  if (audioEmbeds) {
    const prefixPrompt = prompt.substring(0, prompt.lastIndexOf("\n<|im_start|>user\n") + "\n<|im_start|>user\n".length);
    const suffixPrompt = prompt.substring(prefixPrompt.length);
    
    const prefixIds = Array.from(tok.encode(prefixPrompt, { add_special_tokens: false })) as number[];
    const suffixIds = Array.from(tok.encode(suffixPrompt, { add_special_tokens: false })) as number[];
    
    const prefixLen = prefixIds.length;
    const audioLen = audioEmbeds.length / HIDDEN;
    const suffixLen = suffixIds.length;
    curL = prefixLen + audioLen + suffixLen;
    
    allEmbeds = new Float32Array(curL * HIDDEN);
    allEmbeds.set(getTextEmbeddings(prefixIds).data as Float32Array, 0);
    allEmbeds.set(audioEmbeds, prefixLen * HIDDEN);
    allEmbeds.set(getTextEmbeddings(suffixIds).data as Float32Array, (prefixLen + audioLen) * HIDDEN);
  } else {
    allEmbeds = getTextEmbeddings(ids).data as Float32Array;
  }
  
  let inE = new ort.Tensor("float32", allEmbeds, [1, curL, HIDDEN]);
  
  const cache: Record<string, any> = {};
  for (const n of decS.inputNames) {
    if (n.startsWith("past_conv")) {
      cache[n] = new ort.Tensor("float32", new Float32Array(HIDDEN * 3), [1, HIDDEN, 3]);
    } else if (n.startsWith("past_key_values")) {
      cache[n] = new ort.Tensor("float32", new Float32Array(0), [1, KV_HEADS, 0, HEAD_DIM]);
    }
  }

  let t0 = performance.now();
  let tokC = 0, txt = "";
  
  let inAudioMode = false;
  const audioCodes: number[][] = [];
  
  for (let s = 0; s < maxTok; s++) {
    const am = new ort.Tensor("int64", new BigInt64Array(curL).fill(1n), [1, curL]);
    const pos = new ort.Tensor("int64", new BigInt64Array([BigInt(curL - 1)]), [1, 1]);
    
    const outs = await decS.run({ inputs_embeds: inE, attention_mask: am, position_ids: pos, ...cache });

    for (const [k, v] of Object.entries(outs)) {
      if (k.startsWith("present_conv")) cache[k.replace("present_conv", "past_conv")] = v;
      else if (k.startsWith("present.")) cache[k.replace("present.", "past_key_values.")] = v;
    }

    if (inAudioMode) {
      const hiddenData = outs.hidden_states.data as Float32Array;
      const seqLen = outs.hidden_states.dims[1];
      const lastHidden = hiddenData.slice((seqLen - 1) * HIDDEN, seqLen * HIDDEN);

      const frameCodes = await sampleAudioCodes(lastHidden);
      
      if (frameCodes[0] >= END_OF_AUDIO_TOKEN) {
        break;
      }
      
      audioCodes.push(frameCodes);
      
      const feedCodes = frameCodes.map(c => Math.min(c, 2047));
      const audioTokens = feedCodes.map((code, idx) => idx * CODEBOOK_VOCAB + code);
      const summedEmbeds = await getAudioEmbedding(audioTokens);
      
      inE = new ort.Tensor("float32", summedEmbeds, [1, 1, HIDDEN]);
      curL++;
      tokC++;
    } else {
      const nxt = argmax(outs.logits);
      tokC++;
      
      if (nxt === eosTok) break;
      if (nxt === 128) {
        // <|audio_start|> token
        inAudioMode = true;
        inE = getTextEmbeddings([128]);
        curL++;
      } else {
        const ch = tok.decode([nxt], { skip_special_tokens: true });
        txt += ch; 
        cb?.onChunk(ch);
        inE = getTextEmbeddings([nxt]);
        curL++;
      }
      
      if (s % 5 === 0) cb?.onTokensPerSec?.(tokC / ((performance.now() - t0) / 1000), tokC, performance.now() - t0);
    }
  }

  cb?.onTokensPerSec?.(tokC / ((performance.now() - t0) / 1000), tokC, performance.now() - t0);
  
  if (audioCodes.length > 0) {
    const audioData = await decodeAudioCodes(audioCodes);
    if (cb?.onAudioData) cb.onAudioData(audioData);
  }
  
  cb?.onComplete?.(tokC, performance.now() - t0);
  return txt;
}
