"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { IconZoomIn, IconZoomOut, IconDownload, IconRefreshCw, IconMaximize2, IconMinimize2 } from "./Icons";

// Configure worker - use CDN for Next.js compatibility
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const MIN_SCALE = 0.5;
const MAX_SCALE = 3;
/** Pinch/wheel zoom: 1% per step for fine control */
const PINCH_ZOOM_STEP = 0.01;
/** Button zoom: 10% per click */
const BUTTON_ZOOM_STEP = 0.1;

interface PdfPreviewProps {
  pdfUrl: string | null;
  onCompile: () => void;
  isCompiling: boolean;
  latexReady?: boolean;
  lastCompileMs?: number | null;
  isFullscreen?: boolean;
}

export function PdfPreview({ pdfUrl, onCompile, isCompiling, latexReady = false, lastCompileMs, isFullscreen: propIsFullscreen = false }: PdfPreviewProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [scale, setScale] = useState<number>(1);
  const [containerWidth, setContainerWidth] = useState<number>(400);
  const [isFullscreen, setIsFullscreen] = useState(propIsFullscreen);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scaleRef = useRef(1);
  const pinchRafId = useRef<number | null>(null);
  const zoomContentRef = useRef<HTMLDivElement>(null);
  const zoomAnchorRef = useRef<{
    x: number;
    y: number;
    scrollLeft: number;
    scrollTop: number;
    scaleBefore: number;
  } | null>(null);
  const [contentHeight, setContentHeight] = useState(0);

  // Keep ref in sync with state so wheel handler can read current scale
  useEffect(() => {
    scaleRef.current = scale;
  }, [scale]);

  // Sync fullscreen state with prop
  useEffect(() => {
    setIsFullscreen(propIsFullscreen);
  }, [propIsFullscreen]);

  // Keep the point under cursor (or viewport center) fixed by adjusting scroll after zoom.
  useEffect(() => {
    const anchor = zoomAnchorRef.current;
    zoomAnchorRef.current = null;
    const scrollEl = scrollContainerRef.current;
    if (!anchor || !scrollEl) return;
    const { x: cursorX, y: cursorY, scrollLeft, scrollTop, scaleBefore } = anchor;
    if (!scaleBefore || scaleBefore === scale) return;
    const ratio = scale / scaleBefore;
    const nextLeft = (scrollLeft + cursorX) * ratio - cursorX;
    const nextTop = (scrollTop + cursorY) * ratio - cursorY;
    // Clamp to valid scroll ranges to avoid jumps when content becomes smaller than viewport.
    const maxLeft = Math.max(0, scrollEl.scrollWidth - scrollEl.clientWidth);
    const maxTop = Math.max(0, scrollEl.scrollHeight - scrollEl.clientHeight);
    scrollEl.scrollLeft = Math.max(0, Math.min(maxLeft, nextLeft));
    scrollEl.scrollTop = Math.max(0, Math.min(maxTop, nextTop));
  }, [scale]);

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

  // Touch event states for pinch-to-zoom
  const touchStartDistRef = useRef<number | null>(null);
  const touchStartScaleRef = useRef<number | null>(null);
  const touchStartCenterRef = useRef<{ x: number; y: number } | null>(null);

  // Measure zoom wrapper height so scroll area can reserve scaled height (transform doesn't affect layout)
  useEffect(() => {
    const el = zoomContentRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) {
        const h = e.contentRect.height;
        if (h > 0) setContentHeight(h);
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [numPages, pdfUrl]);

  // Touchpad/pinch zoom: 1% per step, batched with RAF; anchor to cursor to prevent scroll jumps
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const flushScale = () => {
      pinchRafId.current = null;
      setScale(scaleRef.current);
    };

    const getTouchDistance = (touches: TouchList) => {
      if (touches.length < 2) return 0;
      const dx = touches[0].clientX - touches[1].clientX;
      const dy = touches[0].clientY - touches[1].clientY;
      return Math.sqrt(dx * dx + dy * dy);
    };

    const getTouchCenter = (touches: TouchList) => {
      if (touches.length < 2) return { x: touches[0].clientX, y: touches[0].clientY };
      return {
        x: (touches[0].clientX + touches[1].clientX) / 2,
        y: (touches[0].clientY + touches[1].clientY) / 2
      };
    };

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault(); // Prevent default browser zoom
        touchStartDistRef.current = getTouchDistance(e.touches);
        touchStartScaleRef.current = scaleRef.current;
        touchStartCenterRef.current = getTouchCenter(e.touches);
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && touchStartDistRef.current !== null && touchStartScaleRef.current !== null && touchStartCenterRef.current !== null) {
        e.preventDefault(); // Prevent default browser zoom
        
        const currentDist = getTouchDistance(e.touches);
        // Calculate scale factor relative to start distance
        const distRatio = currentDist / touchStartDistRef.current;
        const targetScale = touchStartScaleRef.current * distRatio;
        
        const nextScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, Math.round(targetScale * 100) / 100));
        
        if (nextScale !== scaleRef.current) {
          const scrollEl = scrollContainerRef.current;
          if (scrollEl) {
            const rect = scrollEl.getBoundingClientRect();
            // Anchor to the initial touch center
            zoomAnchorRef.current = {
              x: touchStartCenterRef.current.x - rect.left,
              y: touchStartCenterRef.current.y - rect.top,
              scrollLeft: scrollEl.scrollLeft,
              scrollTop: scrollEl.scrollTop,
              scaleBefore: scaleRef.current,
            };
          }
          
          scaleRef.current = nextScale;
          if (pinchRafId.current === null) {
            pinchRafId.current = requestAnimationFrame(flushScale);
          }
        }
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) {
        touchStartDistRef.current = null;
        touchStartScaleRef.current = null;
        touchStartCenterRef.current = null;
      }
    };

    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = -e.deltaY > 0 ? PINCH_ZOOM_STEP : -PINCH_ZOOM_STEP;
        const nextScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, Math.round((scaleRef.current + delta) * 100) / 100));
        
        const scrollEl = scrollContainerRef.current;
        if (scrollEl) {
          const rect = scrollEl.getBoundingClientRect();
          zoomAnchorRef.current = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
            scrollLeft: scrollEl.scrollLeft,
            scrollTop: scrollEl.scrollTop,
            scaleBefore: scaleRef.current,
          };
        }
        
        scaleRef.current = nextScale;
        if (pinchRafId.current === null) {
          pinchRafId.current = requestAnimationFrame(flushScale);
        }
      }
    };
    
    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("touchstart", onTouchStart, { passive: false });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd);
    el.addEventListener("touchcancel", onTouchEnd);
    
    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("touchcancel", onTouchEnd);
      if (pinchRafId.current !== null) cancelAnimationFrame(pinchRafId.current);
    };
  }, []);

  function onDocumentLoadSuccess({ numPages: n }: { numPages: number }) {
    setNumPages(n);
  }

  const zoomIn = useCallback(() => {
    const next = Math.min(Math.round((scaleRef.current + BUTTON_ZOOM_STEP) * 100) / 100, MAX_SCALE);
    const el = scrollContainerRef.current;
    if (el) {
      zoomAnchorRef.current = {
        x: el.clientWidth / 2,
        y: el.clientHeight / 2,
        scrollLeft: el.scrollLeft,
        scrollTop: el.scrollTop,
        scaleBefore: scaleRef.current,
      };
    }
    setScale(next);
  }, []);
  const zoomOut = useCallback(() => {
    const next = Math.max(Math.round((scaleRef.current - BUTTON_ZOOM_STEP) * 100) / 100, MIN_SCALE);
    const el = scrollContainerRef.current;
    if (el) {
      zoomAnchorRef.current = {
        x: el.clientWidth / 2,
        y: el.clientHeight / 2,
        scrollLeft: el.scrollLeft,
        scrollTop: el.scrollTop,
        scaleBefore: scaleRef.current,
      };
    }
    setScale(next);
  }, []);
  const zoomFit = useCallback(() => setScale(1), []);

  // PDF is always rendered at fit-to-width; zoom is applied via CSS transform so the
  // canvas never re-renders during pinch (eliminates flicker).
  const basePageWidth = containerWidth;
  const zoomPercent = Math.round(scale * 100);

  const handleDownload = () => {
    if (!pdfUrl) return;
    const a = document.createElement("a");
    a.href = pdfUrl;
    a.download = "document.pdf";
    a.click();
  };

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await document.documentElement.requestFullscreen();
      }
    } catch {
      // Ignore if not supported or denied
    }
  };

  return (
    <div ref={containerRef} className={`h-full flex flex-col bg-[var(--background)] text-[var(--foreground)] ${isFullscreen ? "" : "border-l border-[var(--border)]"}`}>
      {/* Toolbar: Compile left | Page center | Zoom % + controls + Download + Fullscreen right */}
      <div className="h-12 flex items-center justify-between px-3 border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--border)_18%,transparent)] shrink-0">
        <div className="flex items-center gap-2">
          <button
            className="w-7 h-7 rounded bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white disabled:opacity-50 transition-colors flex items-center justify-center"
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
            <span className="text-xs text-[var(--muted)]">{lastCompileMs} ms</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {pdfUrl && numPages > 0 && (
            <span className="text-xs text-[var(--muted)]">{numPages} page{numPages !== 1 ? "s" : ""}</span>
          )}
          {pdfUrl && (
            <>
              <div className="flex items-center gap-2">
                <button
                  onClick={zoomOut}
                  className="w-7 h-7 rounded bg-[color-mix(in_srgb,var(--border)_22%,transparent)] hover:bg-[color-mix(in_srgb,var(--border)_45%,transparent)] text-[var(--foreground)] flex items-center justify-center"
                  title="Zoom out"
                >
                  <IconZoomOut />
                </button>
                <button
                  onClick={zoomFit}
                  className="min-w-[2.5rem] px-2 py-1.5 rounded bg-[color-mix(in_srgb,var(--border)_22%,transparent)] hover:bg-[color-mix(in_srgb,var(--border)_45%,transparent)] text-[var(--foreground)] text-xs tabular-nums"
                  title="Fit to width"
                >
                  {zoomPercent}%
                </button>
                <button
                  onClick={zoomIn}
                  className="w-7 h-7 rounded bg-[color-mix(in_srgb,var(--border)_22%,transparent)] hover:bg-[color-mix(in_srgb,var(--border)_45%,transparent)] text-[var(--foreground)] flex items-center justify-center"
                  title="Zoom in"
                >
                  <IconZoomIn />
                </button>
              </div>
              <button
                onClick={handleDownload}
                className="w-7 h-7 rounded bg-[color-mix(in_srgb,var(--border)_22%,transparent)] hover:bg-[color-mix(in_srgb,var(--border)_45%,transparent)] text-[var(--foreground)] transition-colors flex items-center justify-center"
                title="Download PDF"
              >
                <IconDownload />
              </button>
              <button
                onClick={toggleFullscreen}
                className="w-7 h-7 rounded bg-[color-mix(in_srgb,var(--border)_22%,transparent)] hover:bg-[color-mix(in_srgb,var(--border)_45%,transparent)] text-[var(--foreground)] transition-colors flex items-center justify-center"
                title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
              >
                {isFullscreen ? <IconMinimize2 /> : <IconMaximize2 />}
              </button>
            </>
          )}
        </div>
      </div>

      {/* PDF viewer: scrollable area with inner content at fixed width so scroll works both ways */}
      <div className="flex-1 min-h-0 flex flex-col">
        {!pdfUrl ? (
          <div className="flex-1 flex items-center justify-center text-sm text-[var(--muted)]">
            Compile to see PDF
          </div>
        ) : (
          <div ref={scrollContainerRef} className="flex-1 overflow-auto min-h-0">
            <div
              className="py-4"
              style={{
                width: Math.round(containerWidth * scale),
                height: contentHeight > 0 ? Math.ceil(contentHeight * scale) : undefined,
                marginLeft: "auto",
                marginRight: "auto",
                position: "relative",
              }}
            >
              <div
                ref={zoomContentRef}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: basePageWidth,
                  transform: `scale(${scale})`,
                  transformOrigin: "top left",
                }}
              >
                <Document
                file={pdfUrl}
                onLoadSuccess={onDocumentLoadSuccess}
                loading={
                  <div className="flex items-center justify-center h-32 text-[var(--muted)]">
                    Loading PDF…
                  </div>
                }
                error={
                  <div className="flex items-center justify-center h-32 text-red-400 text-sm">
                    Failed to load PDF
                  </div>
                }
              >
                <div className="flex flex-col items-center gap-4">
                  {Array.from({ length: numPages }, (_, i) => (
                    <Page
                      key={i + 1}
                      pageNumber={i + 1}
                      width={basePageWidth}
                      renderAnnotationLayer={false}
                      renderTextLayer={false}
                      className="shadow-lg"
                    />
                  ))}
                </div>
              </Document>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
