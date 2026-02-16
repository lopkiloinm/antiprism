"use client";

import { useState, useRef, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { IconZoomIn, IconZoomOut, IconDownload, IconRefreshCw } from "./Icons";

// Configure worker - use CDN for Next.js compatibility
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PdfPreviewProps {
  pdfUrl: string | null;
  onCompile: () => void;
  isCompiling: boolean;
  latexReady?: boolean;
  lastCompileMs?: number | null;
}

export function PdfPreview({ pdfUrl, onCompile, isCompiling, latexReady = false, lastCompileMs }: PdfPreviewProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [scale, setScale] = useState<number>(1);
  const [containerWidth, setContainerWidth] = useState<number>(400);
  const containerRef = useRef<HTMLDivElement>(null);

  // Zoom to fit: measure container and use as page width
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) {
        const w = e.contentRect.width;
        if (w > 0) setContainerWidth(w);
      }
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  function onDocumentLoadSuccess({ numPages: n }: { numPages: number }) {
    setNumPages(n);
  }

  const zoomIn = () => setScale((s) => Math.min(s + 0.25, 3));
  const zoomOut = () => setScale((s) => Math.max(s - 0.25, 0.5));
  const zoomFit = () => setScale(1);

  const pageWidth = Math.round(containerWidth * scale);

  const handleDownload = () => {
    if (!pdfUrl) return;
    const a = document.createElement("a");
    a.href = pdfUrl;
    a.download = "document.pdf";
    a.click();
  };

  return (
    <div className="h-full flex flex-col bg-zinc-900">
      {/* Toolbar: Compile left | Page center | Zoom + Download right */}
      <div className="h-12 flex items-center justify-between px-3 border-b border-zinc-800 bg-zinc-950 shrink-0">
        <div className="flex items-center gap-2">
          <button
            className="w-7 h-7 rounded bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 transition-colors flex items-center justify-center"
            onClick={onCompile}
            disabled={!latexReady || isCompiling}
            title={!latexReady ? "Loading LaTeX…" : isCompiling ? "Compiling…" : "Compile PDF"}
          >
            {isCompiling ? (
              <span className="animate-spin inline-flex">
                <IconRefreshCw />
              </span>
            ) : (
              <IconRefreshCw />
            )}
          </button>
          {lastCompileMs != null && !isCompiling && (
            <span className="text-xs text-zinc-500">{lastCompileMs} ms</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {pdfUrl && numPages > 0 && (
            <span className="text-xs text-zinc-400">{numPages} page{numPages !== 1 ? "s" : ""}</span>
          )}
          {pdfUrl && (
            <>
              <div className="flex items-center gap-2">
                <button
                  onClick={zoomOut}
                  className="w-7 h-7 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 flex items-center justify-center"
                  title="Zoom out"
                >
                  <IconZoomOut />
                </button>
                <button
                  onClick={zoomFit}
                  className="px-2 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs"
                  title="Fit to width"
                >
                  Fit
                </button>
                <button
                  onClick={zoomIn}
                  className="w-7 h-7 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 flex items-center justify-center"
                  title="Zoom in"
                >
                  <IconZoomIn />
                </button>
              </div>
              <button
                onClick={handleDownload}
                className="w-7 h-7 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors flex items-center justify-center"
                title="Download PDF"
              >
                <IconDownload />
              </button>
            </>
          )}
        </div>
      </div>

      {/* PDF viewer - zoom to fit */}
      <div ref={containerRef} className="flex-1 overflow-auto flex justify-center min-h-0">
        {!pdfUrl ? (
          <div className="h-full flex items-center justify-center text-sm text-zinc-500">
            Compile to see PDF
          </div>
        ) : (
          <Document
            file={pdfUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            loading={
              <div className="flex items-center justify-center h-32 text-zinc-500">
                Loading PDF…
              </div>
            }
            error={
              <div className="flex items-center justify-center h-32 text-red-400 text-sm">
                Failed to load PDF
              </div>
            }
          >
            <div className="py-4 flex flex-col items-center gap-4">
              {Array.from({ length: numPages }, (_, i) => (
                <Page
                  key={i + 1}
                  pageNumber={i + 1}
                  width={pageWidth}
                  renderAnnotationLayer={false}
                  renderTextLayer={false}
                  className="shadow-lg"
                />
              ))}
            </div>
          </Document>
        )}
      </div>
    </div>
  );
}
