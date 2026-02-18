"use client";

import { BusyTexRunner, XeLatex, LuaLatex, PdfLatex } from "texlyre-busytex";
import { getLatexEngine, type LaTeXEngine } from "./settings";
import { latexLogger } from "@/lib/logger";

export type { LaTeXEngine } from "./settings";

let runner: BusyTexRunner | null = null;
let initPromise: Promise<BusyTexRunner> | null = null;

type EngineInstance = XeLatex | LuaLatex | PdfLatex;
const engineCache: Partial<Record<LaTeXEngine, EngineInstance>> = {};

async function getRunner(): Promise<BusyTexRunner> {
  if (runner) return runner;
  if (initPromise) return initPromise;
  initPromise = (async () => {
    try {
      latexLogger.info("Initializing LaTeX compiler...");
      const base = process.env.NEXT_PUBLIC_BASE_PATH || "";
      const baseNorm = base && !base.startsWith("/") ? `/${base}` : base;
      
      // Verify WASM files are accessible before initializing
      const busytexWasmUrl = `${baseNorm}/core/busytex/busytex.wasm`;
      const response = await fetch(busytexWasmUrl, { method: 'HEAD' });
      if (!response.ok) {
        throw new Error(`WASM file not accessible: ${busytexWasmUrl} (${response.status})`);
      }

      latexLogger.info("WASM files accessible, initializing BusyTex runner...");
      const r = new BusyTexRunner({
        busytexBasePath: `${baseNorm}/core/busytex`,
        verbose: false,
      });
      await r.initialize(true);
      runner = r;
      latexLogger.info("LaTeX compiler initialized successfully");
      return r;
    } catch (e) {
      latexLogger.error("LaTeX engine initialization failed", e);
      throw new Error(`LaTeX engine initialization failed: ${e}`);
    }
  })();
  try {
    return await initPromise;
  } catch (e) {
    initPromise = null;
    runner = null;
    throw new Error(
      `LaTeX engine failed to initialize: ${e}. Ensure WASM files are properly served with correct headers.`
    );
  }
}

async function getEngine(engine?: LaTeXEngine): Promise<EngineInstance> {
  const kind = engine ?? getLatexEngine();
  const cached = engineCache[kind];
  if (cached) return cached;
  const r = await getRunner();
  let instance: EngineInstance;
  if (kind === "luatex") instance = new LuaLatex(r);
  else if (kind === "pdftex") instance = new PdfLatex(r);
  else instance = new XeLatex(r);
  engineCache[kind] = instance;
  return instance;
}

/** Preload the LaTeX WASM engine. Call on app init; compile should wait until this resolves. */
export async function ensureLatexReady(): Promise<void> {
  await getEngine(getLatexEngine());
}

export interface AdditionalFile {
  path: string;
  content: string | Uint8Array;
}

export async function compileLatexToPdf(
  source: string,
  additionalFiles?: AdditionalFile[],
  engine?: LaTeXEngine
): Promise<Blob> {
  const eng = await getEngine(engine);
  const files: { path: string; content: string | Uint8Array }[] = additionalFiles || [];
  const result = await eng.compile({
    input: source,
    bibtex: false,
    verbose: "silent",
    additionalFiles: files as { path: string; content: string }[],
  });

  if (!result.success || !result.pdf) {
    throw new Error(result.log || "LaTeX compile failed");
  }

  return new Blob([result.pdf as BlobPart], { type: "application/pdf" });
}
