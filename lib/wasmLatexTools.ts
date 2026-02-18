"use client";

import { WebPerlRunner, TexCount, TexFmt, type TexCountResult } from "wasm-latex-tools";

export { TexCountResult };

let webPerlRunner: WebPerlRunner | null = null;
let initPromise: Promise<WebPerlRunner> | null = null;

export async function getWebPerlRunner(): Promise<WebPerlRunner> {
  if (webPerlRunner) return webPerlRunner;
  if (initPromise) return initPromise;

  const base = process.env.NEXT_PUBLIC_BASE_PATH || "";
  const baseNorm = base && !base.startsWith("/") ? `/${base}` : base;

  initPromise = (async () => {
    const runner = new WebPerlRunner({
      webperlBasePath: `${baseNorm}/core/webperl`,
      perlScriptsPath: `${baseNorm}/core/perl`,
    });
    await runner.initialize();
    webPerlRunner = runner;
    return runner;
  })();

  try {
    return await initPromise;
  } catch (e) {
    initPromise = null;
    webPerlRunner = null;
    throw new Error(
      `WASM LaTeX tools failed to initialize: ${e}. Run npx wasm-latex-tools copy-assets and ensure /core/webperl and /core/perl are served.`
    );
  }
}

export async function countLaTeXWords(
  content: string,
  additionalFiles?: Array<{ path: string; content: string }>
): Promise<{ result: TexCountResult; rawOutput: string }> {
  const runner = await getWebPerlRunner();
  const texCount = new TexCount(runner);
  
  const result = await texCount.count({
    input: content,
    includeFiles: true,
    merge: false,
    additionalFiles: additionalFiles || [],
  });

  return {
    result: texCount.parseOutput(result.output),
    rawOutput: result.output,
  };
}

export interface FormatOptions {
  wrap?: boolean;
  wraplen?: number;
  tabsize?: number;
  usetabs?: boolean;
}

export async function formatLaTeX(
  content: string,
  options: FormatOptions = {}
): Promise<string> {
  const texFmt = new TexFmt();
  
  const result = await texFmt.format({
    input: content,
    wrap: options.wrap ?? true,
    wraplen: options.wraplen ?? 80,
    tabsize: options.tabsize ?? 2,
    usetabs: options.usetabs ?? false,
  });

  return result.output;
}
