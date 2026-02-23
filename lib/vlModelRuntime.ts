"use client";
import { getModelById } from "./modelConfig";
import { fireProgressCallback } from "./localModel";

const VL = getModelById("lfm25-vl-1.6b");
const HF = "https://huggingface.co";
const HIDDEN = VL.hiddenSize ?? 2048;
const KV_HEADS = VL.numKVHeads ?? 8;
const HEAD_DIM = VL.headDim ?? 64;
const SF = VL.sessionFiles ?? { embedTokens: "embed_tokens_fp16", embedImages: "embed_images_fp16", decoder: "decoder_q4" };
const TILE = 512, MEAN = [0.5, 0.5, 0.5], STD = [0.5, 0.5, 0.5];

function cacheNameForVL(): string {
  const prefix = VL.label
    .replace(/[^a-zA-Z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .toLowerCase();
  return `antiprism-model-${prefix}-${VL.revision}-v2`;
}

export interface VLMessage { role: "user"|"assistant"|"system"; content: string; image?: string; }

export async function listVLModelFiles(): Promise<string[]> {
  const stems = [SF.embedTokens, SF.decoder, SF.embedImages].filter(Boolean) as string[];
  const files = new Set<string>();
  for (const stem of stems) {
    files.add(`onnx/${stem}.onnx`);
    const dataFiles = await discoverData(stem);
    for (const f of dataFiles) files.add(f);
  }
  return Array.from(files);
}
export interface VLStreamCallbacks {
  onChunk: (t: string) => void;
  onTokensPerSec?: (tps: number, total: number, elapsed: number) => void;
  onComplete?: (tokens: number, elapsed: number) => void;
}

let ort: any, etS: any, eiS: any, decS: any, tok: any;
let imgTok = -1, imgStartTok = -1, imgEndTok = -1, eosTok = 2, loading = false, loadP: Promise<void>|null = null;
let progCb: ((p: number, s: string) => void)|null = null;

// internal wrapper that also fires the global progress callback
const updateProgress = (p: number, s: string) => {
  progCb?.(p, s);
  fireProgressCallback(p, { downloadedBytes: p, totalBytes: 100, speedBytesPerSecond: 0 });
};

export const setVLProgressCallback = (cb: (p: number, s: string) => void) => { progCb = cb; };
export const isVLModelLoaded = () => !!(etS && decS && tok);
export const isVLModelLoading = () => loading;

export async function initializeVLModel() {
  if (isVLModelLoaded()) return;
  if (loadP) return loadP;
  loadP = doLoad();
  return loadP;
}

export function disposeVLModel() {
  etS?.release?.(); eiS?.release?.(); decS?.release?.();
  etS = eiS = decS = tok = null; loading = false; loadP = null;
}

export async function generateVLResponse(msgs: VLMessage[], cb?: VLStreamCallbacks, maxTok = 512) {
  if (!isVLModelLoaded()) await initializeVLModel();
  if (!etS || !decS || !tok) throw new Error("VL not loaded");
  let { ids, hasImg, imgUrl } = buildPrompt(msgs);
  
  let imgEmb = null;
  if (hasImg && imgUrl && eiS) {
    try { 
      imgEmb = await runEmbedImg(await prepImg(imgUrl)); 
      // Expand ids with <|image_start|> <image>*N <|image_end|>
      const expandedIds = [];
      let imgIdx = 0;
      const numImgTokens = imgEmb.dims[1];
      for (const id of ids) {
        if (id === imgTok && imgIdx === 0) {
          if (imgStartTok > -1) expandedIds.push(imgStartTok);
          for (let i = 0; i < numImgTokens; i++) expandedIds.push(imgTok);
          if (imgEndTok > -1) expandedIds.push(imgEndTok);
          imgIdx++;
        } else {
          expandedIds.push(id);
        }
      }
      ids = expandedIds;
    } catch (e) {
      console.error("[VL] image preprocessing/embedding failed:", e);
      throw new Error("Image attachment could not be processed. Please re-upload a standard PNG/JPEG image.");
    }
  } else if (hasImg && !eiS) {
    throw new Error("Vision encoder is not loaded yet. Please wait for model load to finish.");
  }

  let emb = await runEmbedTok(ids);
  if (imgEmb) emb = mergeImg(ids, emb, imgEmb);

  return runDecode(emb, ids.length, cb, maxTok);
}

// --- Loading ---
function fUrl(n: string) { return `${HF}/${VL.hfId}/resolve/${VL.revision}/onnx/${n}`; }

async function discoverData(stem: string) {
  try {
    const r = await fetch(`${HF}/api/models/${VL.hfId}?revision=${encodeURIComponent(VL.revision)}`);
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
    const r = await fetch(url, { method: "HEAD" });
    if (r.ok) return parseInt(r.headers.get("content-length") || "0", 10);
    const r2 = await fetch(url);
    if (r2.ok) return parseInt(r2.headers.get("content-length") || "0", 10);
  } catch {}
  return 0;
}

async function downloadFile(url: string, onProg: (l: number, s: number) => void) {
  const r = await fetch(url);
  if (!r.ok || !r.body) throw new Error(`Download fail: ${url}`);
  const reader = r.body.getReader();
  const chunks: Uint8Array[] = [];
  let loaded = 0, lastTime = performance.now(), lastLoaded = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    loaded += value.length;
    const now = performance.now(), dt = now - lastTime;
    if (dt >= 500) {
      onProg(loaded, ((loaded - lastLoaded) / dt) * 1000);
      lastTime = now; lastLoaded = loaded;
    }
  }
  return new Response(new Blob(chunks as BlobPart[]), { headers: r.headers, status: r.status, statusText: r.statusText });
}

async function ensureCached(files: string[]) {
  if (!("caches" in window)) return;
  const cacheName = cacheNameForVL();
  const cache = await caches.open(cacheName);
  const urls = files.map(f => fUrl(f.replace("onnx/", "")));
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
  const cache = await caches.open(cacheNameForVL());
  const missing: string[] = [];

  for (const file of files) {
    const url = fUrl(file.replace("onnx/", ""));
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
  const files = [onnxPath, ...dataFiles];
  await ensureCached(files);
  
  const ext = dataFiles.map((f: string) => ({ path: f.replace("onnx/",""), data: fUrl(f.replace("onnx/","")) }));
  const url = fUrl(`${stem}.onnx`);
  console.log(`[VL] ${label} loading:`, { url, dataFiles, externalData: ext });
  try {
    return await o.InferenceSession.create(url, { executionProviders: ["webgpu"], externalData: ext });
  } catch (e) {
    console.warn(`[VL] ${label} webgpu fail, wasm:`, e);
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
    tok = await AutoTokenizer.from_pretrained(VL.hfId);
    try { imgTok = tok.convert_tokens_to_ids("<image>") ?? -1; } catch { imgTok = -1; }
    try { imgStartTok = tok.convert_tokens_to_ids("<|image_start|>") ?? -1; } catch { imgStartTok = -1; }
    try { imgEndTok = tok.convert_tokens_to_ids("<|image_end|>") ?? -1; } catch { imgEndTok = -1; }
    eosTok = tok.eos_token_id ?? 2;
    
    etS = await makeSess(ort, SF.embedTokens, "Embedder");
    if (SF.embedImages) { try { eiS = await makeSess(ort, SF.embedImages, "Vision"); } catch {} }
    decS = await makeSess(ort, SF.decoder, "Decoder");

    // Strict cache verification (same behavior class as non-VLM runtime)
    const requiredFiles = await listVLModelFiles();
    const missing = await getMissingCachedFiles(requiredFiles);
    if (missing.length > 0) {
      throw new Error(`VLM cache verification failed. Missing ${missing.length} files: ${missing.join(", ")}`);
    }
    
    updateProgress(100, "VL ready");
  } catch (e) { console.error("[VL] load:", e); disposeVLModel(); throw e; }
  finally { loading = false; }
}

// --- Prompt ---
function buildPrompt(msgs: VLMessage[]) {
  let hasImg = false, imgUrl: string|null = null;
  for (const m of msgs) if (m.image) { hasImg = true; imgUrl = m.image; }

  const sanitize = (text: string) =>
    text
      .replace(/<\|[^>]+\|>/g, "")
      .replace(/<\/?s>/g, "")
      .trim();

  const chat = msgs.map(m => ({
    role: m.role,
    content: m.image
      ? (m.content ? `<image>\n${sanitize(m.content)}` : "<image>")
      : sanitize(m.content),
  }));
  let prompt: string;
  try { prompt = tok.apply_chat_template(chat, { add_generation_prompt: true, tokenize: false }); }
  catch {
    // Fallback aligned with tokenizer_config.chat_template_jinja
    // <|startoftext|><|im_start|>{role}\n{content}<|im_end|>...<|im_start|>assistant\n
    prompt =
      "<|startoftext|>" +
      chat.map((m) => `<|im_start|>${m.role}\n${m.content}<|im_end|>`).join("\n") +
      "\n<|im_start|>assistant\n";
  }
  const ids: number[] = Array.from(tok.encode(prompt));
  return { ids, hasImg, imgUrl };
}

// --- Image Preprocessing ---
const CONFIG = {
  tileSize: 512,
  maxTiles: 10,
  minTiles: 2,
  patchSize: 16,
  patchesPerTile: 32,
  downsampleFactor: 2,
  minImageTokens: 64,
  maxImageTokens: 256,
  useThumbnail: true
};

const NORM_SCALE = 1 / 127.5;
const NORM_OFFSET = -1.0;

function roundByFactor(number: number, factor: number) {
  return Math.round(number / factor) * factor;
}

function ceilByFactor(number: number, factor: number) {
  return Math.ceil(number / factor) * factor;
}

function floorByFactor(number: number, factor: number) {
  return Math.floor(number / factor) * factor;
}

function smartResize(width: number, height: number) {
  const { patchSize, downsampleFactor, minImageTokens, maxImageTokens } = CONFIG;
  const totalFactor = patchSize * downsampleFactor;
  const minPixels = minImageTokens * (patchSize ** 2) * (downsampleFactor ** 2);
  const maxPixels = maxImageTokens * (patchSize ** 2) * (downsampleFactor ** 2);

  let hBar = Math.max(totalFactor, roundByFactor(height, totalFactor));
  let wBar = Math.max(totalFactor, roundByFactor(width, totalFactor));

  if (hBar * wBar > maxPixels) {
    const beta = Math.sqrt((height * width) / maxPixels);
    hBar = Math.max(totalFactor, floorByFactor(height / beta, totalFactor));
    wBar = Math.max(totalFactor, floorByFactor(width / beta, totalFactor));
  } else if (hBar * wBar < minPixels) {
    const beta = Math.sqrt(minPixels / (height * width));
    hBar = ceilByFactor(height * beta, totalFactor);
    wBar = ceilByFactor(width * beta, totalFactor);
  }

  return { width: wBar, height: hBar };
}

function findClosestAspectRatio(aspectRatio: number, targetRatios: number[][], width: number, height: number, imageSize: number) {
  let bestRatioDiff = Infinity;
  let bestArea = 0;
  let closestRatio = targetRatios[0];

  for (const ratio of targetRatios) {
    const targetAspect = ratio[0] / ratio[1];
    const ratioDiff = Math.abs(aspectRatio - targetAspect);

    if (ratioDiff < bestRatioDiff) {
      bestRatioDiff = ratioDiff;
      bestArea = ratio[0] * ratio[1] * imageSize * imageSize;
      closestRatio = ratio;
    } else if (ratioDiff === bestRatioDiff) {
      const area = ratio[0] * ratio[1] * imageSize * imageSize;
      if (Math.abs(area - width * height) < Math.abs(bestArea - width * height)) {
        bestRatioDiff = ratioDiff;
        bestArea = area;
        closestRatio = ratio;
      }
    }
  }
  return closestRatio;
}

function calculateTileGrid(width: number, height: number) {
  const { tileSize, minTiles, maxTiles } = CONFIG;
  const aspectRatio = width / height;

  const targetRatios: number[][] = [];
  for (let n = minTiles; n <= maxTiles; n++) {
    for (let w = 1; w <= n; w++) {
      for (let h = 1; h <= n; h++) {
        if (w * h >= minTiles && w * h <= maxTiles) {
          if (!targetRatios.some(r => r[0] === w && r[1] === h)) {
            targetRatios.push([w, h]);
          }
        }
      }
    }
  }
  targetRatios.sort((a, b) => (a[0] * a[1]) - (b[0] * b[1]));

  if (targetRatios.length === 0) return { rows: 1, cols: 1 };
  const [gridWidth, gridHeight] = findClosestAspectRatio(aspectRatio, targetRatios, width, height, tileSize);
  return { rows: gridHeight, cols: gridWidth };
}

function isImageTooLarge(width: number, height: number) {
  const { patchSize, downsampleFactor, maxImageTokens } = CONFIG;
  const totalFactor = patchSize * downsampleFactor;
  const maxPixels = maxImageTokens * (patchSize ** 2) * (downsampleFactor ** 2);
  const hBar = Math.max(totalFactor, roundByFactor(height, totalFactor));
  const wBar = Math.max(totalFactor, roundByFactor(width, totalFactor));
  return hBar * wBar > maxPixels;
}

function extractPatches(imageData: ImageData, pixelValues: Float32Array, attentionMask: BigInt64Array, tileIdx: number, patchesH: number, patchesW: number, maxPatchesPerTile: number) {
  const patchSize = CONFIG.patchSize;
  const patchDim = patchSize * patchSize * 3;
  const imageWidth = imageData.width;
  const pixels = imageData.data;
  const tileOffset = tileIdx * maxPatchesPerTile * patchDim;
  const maskOffset = tileIdx * maxPatchesPerTile;
  const actualPatches = patchesH * patchesW;

  let patchIdx = 0;
  for (let py = 0; py < patchesH; py++) {
    for (let px = 0; px < patchesW; px++) {
      const patchStartX = px * patchSize;
      const patchStartY = py * patchSize;

      attentionMask[maskOffset + patchIdx] = 1n;
      const patchOffset = tileOffset + patchIdx * patchDim;
      let outIdx = 0;

      for (let dy = 0; dy < patchSize; dy++) {
        const rowOffset = (patchStartY + dy) * imageWidth;
        for (let dx = 0; dx < patchSize; dx++) {
          const srcIdx = (rowOffset + patchStartX + dx) * 4;
          pixelValues[patchOffset + outIdx++] = pixels[srcIdx] * NORM_SCALE + NORM_OFFSET;
          pixelValues[patchOffset + outIdx++] = pixels[srcIdx + 1] * NORM_SCALE + NORM_OFFSET;
          pixelValues[patchOffset + outIdx++] = pixels[srcIdx + 2] * NORM_SCALE + NORM_OFFSET;
        }
      }
      patchIdx++;
    }
  }

  for (let i = actualPatches; i < maxPatchesPerTile; i++) {
    attentionMask[maskOffset + i] = 0n;
  }
}

async function prepImg(dataUrl: string) {
  const img = await loadImage(dataUrl);
  const width = img.width;
  const height = img.height;

  const { tileSize, patchSize, useThumbnail } = CONFIG;
  const patchesPerSide = CONFIG.patchesPerTile;
  const maxPatchesPerTile = patchesPerSide * patchesPerSide; // 1024
  const patchDim = patchSize * patchSize * 3; // 768

  const needsSplitting = isImageTooLarge(width, height);

  if (needsSplitting) {
    const { rows, cols } = calculateTileGrid(width, height);
    const totalGridTiles = rows * cols;

    if (totalGridTiles > 1) {
      const numTiles = totalGridTiles + (useThumbnail ? 1 : 0);
      const pixelValues = new Float32Array(numTiles * maxPatchesPerTile * patchDim);
      const attentionMask = new BigInt64Array(numTiles * maxPatchesPerTile);
      const spatialShapes = new BigInt64Array(numTiles * 2);

      const targetWidth = tileSize * cols;
      const targetHeight = tileSize * rows;

      const cv = typeof OffscreenCanvas !== "undefined" ? new OffscreenCanvas(targetWidth, targetHeight) : document.createElement("canvas");
      cv.width = targetWidth; cv.height = targetHeight;
      const ctx = cv.getContext("2d")! as any;
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

      let tileIdx = 0;
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const tileData = ctx.getImageData(col * tileSize, row * tileSize, tileSize, tileSize);
          extractPatches(tileData, pixelValues, attentionMask, tileIdx, patchesPerSide, patchesPerSide, maxPatchesPerTile);
          spatialShapes[tileIdx * 2] = BigInt(patchesPerSide);
          spatialShapes[tileIdx * 2 + 1] = BigInt(patchesPerSide);
          tileIdx++;
        }
      }

      if (useThumbnail) {
        const thumbCanvas = typeof OffscreenCanvas !== "undefined" ? new OffscreenCanvas(tileSize, tileSize) : document.createElement("canvas");
        thumbCanvas.width = tileSize; thumbCanvas.height = tileSize;
        const thumbCtx = thumbCanvas.getContext("2d")! as any;
        thumbCtx.drawImage(img, 0, 0, tileSize, tileSize);
        const thumbData = thumbCtx.getImageData(0, 0, tileSize, tileSize);
        extractPatches(thumbData, pixelValues, attentionMask, tileIdx, patchesPerSide, patchesPerSide, maxPatchesPerTile);
        spatialShapes[tileIdx * 2] = BigInt(patchesPerSide);
        spatialShapes[tileIdx * 2 + 1] = BigInt(patchesPerSide);
      }

      return {
        pv: pixelValues, pam: attentionMask, ss: spatialShapes,
        pvD: [numTiles, maxPatchesPerTile, patchDim],
        pamD: [numTiles, maxPatchesPerTile],
        ssD: [numTiles, 2]
      };
    }
  }

  // Standard resize path (no tiling)
  const resized = smartResize(width, height);
  const actualPatchesH = Math.floor(resized.height / patchSize);
  const actualPatchesW = Math.floor(resized.width / patchSize);

  const cv = typeof OffscreenCanvas !== "undefined" ? new OffscreenCanvas(resized.width, resized.height) : document.createElement("canvas");
  cv.width = resized.width; cv.height = resized.height;
  const ctx = cv.getContext("2d")! as any;
  ctx.drawImage(img, 0, 0, resized.width, resized.height);
  const imageData = ctx.getImageData(0, 0, resized.width, resized.height);

  const numTiles = 1;
  const pixelValues = new Float32Array(numTiles * maxPatchesPerTile * patchDim);
  const attentionMask = new BigInt64Array(numTiles * maxPatchesPerTile);
  const spatialShapes = new BigInt64Array(numTiles * 2);

  extractPatches(imageData, pixelValues, attentionMask, 0, actualPatchesH, actualPatchesW, maxPatchesPerTile);
  spatialShapes[0] = BigInt(actualPatchesH);
  spatialShapes[1] = BigInt(actualPatchesW);

  return {
    pv: pixelValues, pam: attentionMask, ss: spatialShapes,
    pvD: [numTiles, maxPatchesPerTile, patchDim],
    pamD: [numTiles, maxPatchesPerTile],
    ssD: [numTiles, 2]
  };
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new Image(); img.crossOrigin = "anonymous";
    img.onload = () => res(img); img.onerror = rej; img.src = src;
  });
}

// --- Embeddings ---
function toHalf(val: number) {
  const floatView = new Float32Array(1);
  const int32View = new Int32Array(floatView.buffer);
  floatView[0] = val;
  const x = int32View[0];
  const bits = (x >> 16) & 0x8000;
  let m = (x >> 12) & 0x07ff;
  const e = (x >> 23) & 0xff;
  if (e < 103) return bits;
  if (e > 142) {
    let res = bits | 0x7c00;
    if (e === 255 && (x & 0x007fffff)) res |= 1;
    return res;
  }
  if (e < 113) {
    m |= 0x0800;
    const shift = 114 - e;
    let res = bits | (m >> shift);
    if ((m >> (shift - 1)) & 1) res += 1;
    return res;
  }
  let res = bits | ((e - 112) << 10) | (m >> 1);
  if (m & 1) res += 1;
  return res;
}

async function runEmbedTok(ids: number[]) {
  const t = new ort.Tensor("int64", new BigInt64Array(ids.map(BigInt)), [1, ids.length]);
  const out = await etS.run({ input_ids: t });
  return out[etS.outputNames[0]];
}

async function runEmbedImg(inp: any) {
  let pv = new ort.Tensor("float32", inp.pv, inp.pvD);
  const pam = new ort.Tensor("int64", inp.pam, inp.pamD);
  const ss = new ort.Tensor("int64", inp.ss, inp.ssD);
  
  try {
    const out = await eiS.run({ pixel_values: pv, pixel_attention_mask: pam, spatial_shapes: ss });
    return out[eiS.outputNames[0]];
  } catch (e: any) {
    // ONNX WebGPU error messages can be inconsistent or misleading (e.g. "Invalid rank for input")
    // If float32 fails, always try float16 fallback for vision models
    const pv16 = new Uint16Array(inp.pv.length);
    for (let i = 0; i < inp.pv.length; i++) {
      pv16[i] = toHalf(inp.pv[i]);
    }
    pv = new ort.Tensor("float16", pv16, inp.pvD);
    const out = await eiS.run({ pixel_values: pv, pixel_attention_mask: pam, spatial_shapes: ss });
    return out[eiS.outputNames[0]];
  }
}

function mergeImg(ids: number[], tokEmb: any, imgEmb: any) {
  if (imgTok < 0) return tokEmb;

  const h = tokEmb.dims[2];
  
  // Preserve the original data type (e.g., float16 -> Uint16Array)
  const DataType = tokEmb.data.constructor as any;
  const outData = new DataType(tokEmb.data);
  const imgData = imgEmb.data;

  const imagePositions: number[] = [];
  for (let i = 0; i < ids.length; i++) {
    if (ids[i] === imgTok) imagePositions.push(i);
  }
  if (imagePositions.length === 0) return tokEmb;

  const numImgEmbeds = Math.floor(imgData.length / h);
  const replaceCount = Math.min(imagePositions.length, numImgEmbeds);

  // 1:1 replacement: each <image> token position receives one image embedding row.
  for (let i = 0; i < replaceCount; i++) {
    const pos = imagePositions[i];
    outData.set(imgData.subarray(i * h, (i + 1) * h), pos * h);
  }

  return new ort.Tensor(tokEmb.type, outData, tokEmb.dims);
}

// --- Decoding ---
async function runDecode(emb: any, seqLen: number, cb?: VLStreamCallbacks, maxTok = 512) {
  // Init KV cache based exactly on model input requirements
  const cache: Record<string, any> = {};
  for (const name of decS.inputNames) {
    if (name === "inputs_embeds" || name === "attention_mask" || name === "position_ids") continue;
    if (name.startsWith("past_conv")) {
      // past_conv.[layer] expects shape [1, 2048, 3] for LFM 2.5 1.6B
      cache[name] = new ort.Tensor("float32", new Float32Array(HIDDEN * 3), [1, HIDDEN, 3]);
    } else if (name.startsWith("past_key_values")) {
      // past_key_values.[layer].key/value expects shape [1, 8, 0, 64]
      cache[name] = new ort.Tensor("float32", new Float32Array(0), [1, KV_HEADS, 0, HEAD_DIM]);
    }
  }

  const generated: number[] = [];
  const t0 = performance.now();
  let curEmb = emb;
  let curLen = emb.dims[1];

  for (let step = 0; step < maxTok; step++) {
    const mask = new ort.Tensor("int64", new BigInt64Array(curLen).fill(1n), [1, curLen]);
    const feed: Record<string, any> = { inputs_embeds: curEmb, attention_mask: mask, ...cache };
    const out = await decS.run(feed);

    // Greedy argmax
    const logits = out.logits ?? out[decS.outputNames[0]];
    const vocab = logits.dims[2];
    const last = logits.data.slice((logits.dims[1] - 1) * vocab, logits.dims[1] * vocab);
    let maxV = last[0], maxI = 0;
    for (let i = 1; i < vocab; i++) { if (last[i] > maxV) { maxV = last[i]; maxI = i; } }
    generated.push(maxI);

    // Stream
    const text = tok.decode([maxI], { skip_special_tokens: true });
    if (text) cb?.onChunk?.(text);
    if (cb?.onTokensPerSec) {
      const el = (performance.now() - t0) / 1000;
      cb.onTokensPerSec(generated.length / el, generated.length, el);
    }
    if (maxI === eosTok) break;

    // Update cache
    for (const oName of Object.keys(out)) {
      if (oName.startsWith("present_conv")) {
        cache[oName.replace("present_conv", "past_conv")] = out[oName];
      } else if (oName.startsWith("present.")) {
        cache[oName.replace("present.", "past_key_values.")] = out[oName];
      }
    }

    // Next step embedding
    const nextTok = new ort.Tensor("int64", new BigInt64Array([BigInt(maxI)]), [1, 1]);
    const nextOut = await etS.run({ input_ids: nextTok });
    curEmb = nextOut[etS.outputNames[0]];
    curLen++;
  }

  if (cb?.onComplete) {
    const el = (performance.now() - t0) / 1000;
    cb.onComplete(generated.length, el);
  }
  return tok.decode(generated, { skip_special_tokens: true });
}
