"use client";

/**
 * Typst compiler (zero backend): uses @myriaddreamin/typst.ts + typst-ts-web-compiler WASM.
 * Same pattern as latexCompiler: ensureReady → compile → Blob.
 */

import type { TypstSnippet } from "@myriaddreamin/typst.ts/contrib/snippet";
import { typstLogger } from "@/lib/logger";

const COMPILER_WASM_URL =
  "https://cdn.jsdelivr.net/npm/@myriaddreamin/typst-ts-web-compiler@0.7.0-rc2/pkg/typst_ts_web_compiler_bg.wasm";

let initPromise: Promise<TypstSnippet> | null = null;

function getTypst(): Promise<TypstSnippet> {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    try {
      typstLogger.info("Initializing Typst compiler...");
      
      // Verify WASM is accessible from CDN
      const response = await fetch(COMPILER_WASM_URL, { method: 'HEAD' });
      if (!response.ok) {
        throw new Error(`Typst WASM not accessible: ${COMPILER_WASM_URL} (${response.status})`);
      }

      typstLogger.info("WASM accessible, loading Typst module...");
      const { $typst } = await import("@myriaddreamin/typst.ts/contrib/snippet");
      $typst.setCompilerInitOptions({
        getModule: () => COMPILER_WASM_URL,
      });
      typstLogger.info("Typst compiler initialized successfully");
      return $typst;
    } catch (e) {
      typstLogger.error("Typst compiler initialization failed", e);
      throw new Error(`Typst compiler initialization failed: ${e}`);
    }
  })();
  return initPromise;
}

/** Preload the Typst WASM compiler. Call on app init or before first compile. */
export async function ensureTypstReady(): Promise<void> {
  const $typst = await getTypst();
  await $typst.pdf({ mainContent: " " });
}

export interface AdditionalFile {
  path: string;
  content: string | Uint8Array;
}

const TYPST_ROOT = "/";
const MAIN_TYP_PATH = "/main.typ";

export async function compileTypstToPdf(
  mainContent: string,
  additionalFiles?: AdditionalFile[]
): Promise<Blob> {
  const $typst = await getTypst();
  await $typst.resetShadow();

  // Main file at /main.typ so project root is "/" and #image("diagram.jpg") etc. resolve to /diagram.jpg
  await $typst.addSource(MAIN_TYP_PATH, mainContent);

  if (additionalFiles?.length) {
    for (const f of additionalFiles) {
      const path = f.path.startsWith("/") ? f.path : `/${f.path}`;
      if (typeof f.content === "string") {
        await $typst.addSource(path, f.content);
      } else {
        await $typst.mapShadow(path, f.content instanceof Uint8Array ? f.content : new Uint8Array(f.content));
      }
    }
  }

  const pdfData = await $typst.pdf({
    mainFilePath: MAIN_TYP_PATH,
    root: TYPST_ROOT,
  });
  if (pdfData == null) throw new Error("Typst compile failed: no PDF output");
  return new Blob([pdfData as BlobPart], { type: "application/pdf" });
}
