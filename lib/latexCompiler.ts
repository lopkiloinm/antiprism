"use client";

import { BusyTexRunner, XeLatex } from "texlyre-busytex";

let runner: BusyTexRunner | null = null;
let xelatex: XeLatex | null = null;
let initPromise: Promise<XeLatex> | null = null;

async function getEngine(): Promise<XeLatex> {
  if (xelatex) return xelatex;
  if (initPromise) return initPromise;
  initPromise = (async () => {
    runner = new BusyTexRunner({
      busytexBasePath: "/core/busytex",
      verbose: false,
    });
    await runner.initialize(true); // true = Web Worker (avoids ScriptLoaderDocument issue in main thread)
    xelatex = new XeLatex(runner);
    return xelatex;
  })();
  try {
    return await initPromise;
  } catch (e) {
    initPromise = null;
    runner = null;
    xelatex = null;
    throw new Error(
      `LaTeX engine failed to initialize: ${e}. Run npm run download-latex-assets and ensure /core/busytex is served.`
    );
  }
}

/** Preload the LaTeX WASM engine. Call on app init; compile should wait until this resolves. */
export async function ensureLatexReady(): Promise<void> {
  await getEngine();
}

export interface AdditionalFile {
  path: string;
  content: string | Uint8Array;
}

export async function compileLatexToPdf(
  source: string,
  additionalFiles?: AdditionalFile[]
): Promise<Blob> {
  const eng = await getEngine();
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
