"use client";

import { useState, useEffect, useRef, useLayoutEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { IconChevronUp, IconLoader, IconDownload } from "@/components/Icons";
import { 
  getDownloadProgress, 
  setProgressCallback, 
  checkWebGPUSupport, 
  getActiveModelId, 
  switchModel,
  initializeModel,
  isDownloading,
  listModelFiles
} from "@/lib/localModel";
import { AVAILABLE_MODELS } from "@/lib/modelConfig";

interface ModelDropdownProps {
  selectedModelId: string;
  onModelChange: (id: string) => void;
  className?: string;
}

interface ModelStatus {
  progress: number;
  isDownloading: boolean;
  isLoaded: boolean;
}

export function ModelDropdown({ selectedModelId, onModelChange, className }: ModelDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [modelStatuses, setModelStatuses] = useState<Record<string, ModelStatus>>({});
  const [dropdownPosition, setDropdownPosition] = useState({ bottom: 0, left: 0 });
  const [isAnyDownloading, setIsAnyDownloading] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const portalRef = useRef<HTMLDivElement>(null);

  // Initialize model statuses and check cache on mount
  useEffect(() => {
    const initialStatuses: Record<string, ModelStatus> = {};
    AVAILABLE_MODELS.forEach(model => {
      initialStatuses[model.id] = {
        progress: 0,
        isDownloading: false,
        isLoaded: false,
      };
    });
    setModelStatuses(initialStatuses);
    
    // Check cache status for all models
    checkCacheStatus();
  }, []);

  // Check cache status for all models
  const checkCacheStatus = async () => {
    if (!('caches' in window)) return;
    
    try {
      const cacheKeys = await caches.keys();
      
      for (const model of AVAILABLE_MODELS) {
        const def = model;
        const prefix = def.label
          .replace(/[^a-zA-Z0-9\s-]/g, "")
          .replace(/\s+/g, "-")
          .toLowerCase();
        const cacheName = `antiprism-model-${prefix}-${def.revision}-v2`;
        
        const cache = await caches.open(cacheName);
        if (cache) {
          // Check if model files are cached
          const requiredFiles = await listModelFiles(def.dtype);
          let allFilesCached = true;
          
          for (const file of requiredFiles) {
            const fileUrl = `https://huggingface.co/${def.hfId}/resolve/${def.revision}/${file}`;
            const cachedResponse = await cache.match(fileUrl);
            if (!cachedResponse || !cachedResponse.ok) {
              allFilesCached = false;
              break;
            }
          }
          
          if (allFilesCached) {
            console.log(`🔍 Cache hit for ${model.label} - marking as loaded`);
            setModelStatuses(prev => ({
              ...prev,
              [model.id]: {
                ...prev[model.id],
                progress: 100,
                isDownloading: false,
                isLoaded: true,
              }
            }));
          }
        }
      }
    } catch (error) {
      console.error("Failed to check cache status:", error);
    }
  };

  // Set up progress callback to track downloads
  useEffect(() => {
    let lastUpdate = 0;
    const throttleMs = 200;
    
    console.log("🔥 Setting up progress callback");
    setProgressCallback((progress, stats) => {
      console.log("🔥 PROGRESS CALLBACK:", { progress, stats, activeId: getActiveModelId() });
      const now = Date.now();
      if (now - lastUpdate < throttleMs && progress < 100) return;
      lastUpdate = now;
      
      // Update progress for the model currently being downloaded
      const activeId = getActiveModelId();
      setModelStatuses(prev => ({
        ...prev,
        [activeId]: {
          ...prev[activeId],
          progress,
          isDownloading: progress < 100,
          isLoaded: progress === 100,
        }
      }));
    });

    return () => {
      console.log("🔥 Cleaning up progress callback");
      setProgressCallback(() => {});
    };
  }, []);

  // Track global downloading state
  useEffect(() => {
    const interval = setInterval(() => {
      setIsAnyDownloading(isDownloading());
    }, 500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node | null;
      const targetInfo = target ? `${target.nodeName}: ${target.textContent?.slice(0, 20)}` : 'null';
      console.log("🔥 MOUSE DOWN TARGET:", targetInfo);
      
      if (!target) return;

      const inButton = !!buttonRef.current && buttonRef.current.contains(target);
      const inMenu = !!portalRef.current && portalRef.current.contains(target);
      console.log("🔥 CLICK CHECK - inButton:", inButton, "inMenu:", inMenu, "isOpen:", isOpen);
      
      if (!inButton && !inMenu) {
        console.log("🔥 CLOSING DROPDOWN");
        setIsOpen(false);
      } else {
        console.log("🔥 NOT CLOSING DROPDOWN");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleModelSelect = async (modelId: string) => {
    if (isAnyDownloading) {
      console.log("🔥 Model selection blocked - download in progress");
      return;
    }
    
    console.log("🔥 MODEL CLICKED:", modelId);
    setIsOpen(false);
    
    console.log("🔥 Setting downloading status for:", modelId);
    // Update status to downloading immediately
    setModelStatuses(prev => ({
      ...prev,
      [modelId]: {
        ...prev[modelId],
        isDownloading: true,
        progress: 0,
        isLoaded: false,
      }
    }));
    
    // Switch to model and initialize/download it
    onModelChange(modelId);
    await switchModel(modelId);
    
    console.log("🔥 About to initialize model...");
    try {
      await initializeModel(); // Normal download flow
      console.log("🔥 Model initialization complete!");
    } catch (error) {
      console.error("🔥 Model initialization failed:", error);
      // Reset status on error
      setModelStatuses(prev => ({
        ...prev,
        [modelId]: {
          ...prev[modelId],
          isDownloading: false,
          progress: 0,
          isLoaded: false,
        }
      }));
    }
  };

  const handleButtonClick = (e: React.MouseEvent) => {
    console.log("🔥 BUTTON CLICKED");
    if (!buttonRef.current) return;
    if (isAnyDownloading) {
      console.log("🔥 Dropdown blocked - download in progress");
      return;
    }
    setIsOpen((v) => !v);
  };

  // Compute position immediately after the portal DOM exists
  useLayoutEffect(() => {
    if (!isOpen) return;
    recomputePosition();
    // Second pass after paint to capture final height (e.g. fonts)
    requestAnimationFrame(() => recomputePosition());
  }, [isOpen]);

  // Track scroll/resize while open
  useEffect(() => {
    if (!isOpen) return;

    const onScroll = () => recomputePosition();
    const onResize = () => recomputePosition();

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
    };
  }, [isOpen]);

  const recomputePosition = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();

    // Portal uses `position: fixed`, so we must use viewport coordinates
    // Anchor using `bottom` so the menu stays attached to the button without needing menu height
    const gap = 6;
    const bottom = Math.max(8, window.innerHeight - rect.top + gap);
    const left = rect.left;

    setDropdownPosition({ bottom, left });
  }, []);

  const selectedModel = AVAILABLE_MODELS.find(m => m.id === selectedModelId);
  const selectedStatus = modelStatuses[selectedModelId];

  return (
    <>
      <div className="relative">
        <button
          ref={buttonRef}
          onClick={handleButtonClick}
          disabled={isAnyDownloading}
          className={`flex items-center gap-2 px-2 py-1 text-xs rounded border transition-colors ${
            selectedStatus?.isLoaded 
              ? "bg-[color-mix(in_srgb,var(--border)_22%,transparent)] border-[var(--border)] text-[var(--foreground)]"
              : "bg-[color-mix(in_srgb,var(--border)_22%,transparent)] border-[var(--border)] text-[var(--muted)]"
          } focus:outline-none focus:ring-1 focus:ring-[var(--accent)] ${
            isAnyDownloading ? "opacity-50 cursor-not-allowed" : ""
          }`}
        >
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "140px" }}>{selectedModel?.label}</span>
          {selectedStatus?.isDownloading ? (
            <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
              <div style={{ animation: "spin 1s linear infinite" }}>
                <IconLoader />
              </div>
              <span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
                {Math.round(selectedStatus.progress)}%
              </span>
            </div>
          ) : selectedStatus?.isLoaded ? (
            <span style={{ color: "var(--accent)" }}>Ready</span>
          ) : (
            <IconDownload />
          )}
          <div style={{ transition: "transform 0.2s", transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}>
            <IconChevronUp />
          </div>
        </button>
      </div>

      {isOpen && createPortal(
        <div 
          ref={portalRef}
          style={{
            position: "fixed",
            bottom: dropdownPosition.bottom,
            left: dropdownPosition.left,
            zIndex: 999999,
            minWidth: "220px",
          }}
          className="rounded border border-[var(--border)] bg-[var(--background)] shadow-xl overflow-hidden"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div style={{ maxHeight: "300px", overflowY: "auto" }}>
            {AVAILABLE_MODELS.map((model) => {
              const status = modelStatuses[model.id];
              const isSelected = model.id === selectedModelId;
              
              return (
                <button
                  key={model.id}
                  onClick={() => {
                    console.log("🔥 MENU ITEM CLICKED:", model.id);
                    handleModelSelect(model.id);
                  }}
                  disabled={isAnyDownloading && !isSelected}
                  className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 transition-colors ${
                    isSelected 
                      ? "bg-[color-mix(in_srgb,var(--accent)_18%,transparent)] text-[var(--accent)]"
                      : "text-[var(--foreground)] hover:bg-[color-mix(in_srgb,var(--border)_45%,transparent)]"
                  } ${
                    isAnyDownloading && !isSelected ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                >
                  <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
                    <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{model.label}</div>
                    {status?.isDownloading && (
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.25rem" }}>
                        <div style={{ 
                          flex: 1, 
                          height: "4px", 
                          background: "color-mix(in_srgb,var(--border)_60%,transparent)", 
                          borderRadius: "9999px", 
                          overflow: "hidden" 
                        }}>
                          <div 
                            style={{ 
                              height: "100%", 
                              background: "var(--accent)", 
                              borderRadius: "9999px", 
                              transition: "width 300ms ease-out",
                              width: `${status.progress}%` 
                            }}
                          />
                        </div>
                        <span style={{ fontSize: "0.75rem", color: "var(--muted)", fontFamily: "monospace" }}>
                          {Math.round(status.progress)}%
                        </span>
                      </div>
                    )}
                  </div>
                  <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                    {status?.isDownloading ? (
                      <>
                        <div style={{ animation: "spin 1s linear infinite", color: "var(--muted)" }}>
                          <IconLoader />
                        </div>
                        <span style={{ fontSize: "0.7rem", color: "var(--muted)" }}>Downloading...</span>
                      </>
                    ) : status?.isLoaded ? (
                      <>
                        <span style={{ color: "var(--accent)", fontSize: "0.75rem" }}>Ready</span>
                        <span style={{ fontSize: "0.7rem", color: "var(--muted)" }}>Cached</span>
                      </>
                    ) : (
                      <>
                        <div style={{ color: "var(--muted)" }}>
                          <IconDownload />
                        </div>
                        <span style={{ fontSize: "0.7rem", color: "var(--muted)" }}>Not downloaded</span>
                      </>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
