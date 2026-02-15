"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import * as Y from "yjs";
import { WebrtcProvider } from "y-webrtc";
import { mount } from "@wwog/idbfs";
import { FileTree } from "@/components/FileTree";
import { FileActions } from "@/components/FileActions";
import { FileTabs } from "@/components/FileTabs";
import { ImageViewer } from "@/components/ImageViewer";
import { EditorPanel } from "@/components/EditorPanel";

const PdfPreview = dynamic(() => import("@/components/PdfPreview").then((m) => ({ default: m.PdfPreview })), {
  ssr: false,
});
import {
  initializeModel,
  generateChatResponse,
  setProgressCallback,
  getDownloadProgress,
  getDownloadStats,
  isDownloading,
  isModelLoading,
  checkWebGPUSupport,
} from "@/lib/localModel";
import { compileLatexToPdf, ensureLatexReady } from "@/lib/latexCompiler";
import { getProjects, getRooms } from "@/lib/projects";

const DEFAULT_FILE = "/main.tex";
const DEFAULT_DIAGRAM = "/diagram.jpg";
const IMAGE_EXT = /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i;

function isImagePath(path: string): boolean {
  return IMAGE_EXT.test(path);
}

export default function ProjectPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const basePath = id ? `/projects/${id}` : "/";

  const [projectName, setProjectName] = useState<string>("Project");
  const [ydoc, setYdoc] = useState<Y.Doc | null>(null);
  const [ytext, setYtext] = useState<Y.Text | null>(null);
  const [provider, setProvider] = useState<WebrtcProvider | null>(null);
  const [fs, setFs] = useState<Awaited<ReturnType<typeof mount>> | null>(null);
  const [openTabs, setOpenTabs] = useState<{ path: string; type: "text" | "image" }[]>([{ path: `${basePath}/main.tex`, type: "text" }]);
  const [activeTabPath, setActiveTabPath] = useState<string>(`${basePath}/main.tex`);
  const [currentPath, setCurrentPath] = useState<string>(`${basePath}/main.tex`);
  const [addTargetPath, setAddTargetPath] = useState<string>(basePath);
  const [imageUrlCache, setImageUrlCache] = useState<Map<string, string>>(new Map());
  const textContentCacheRef = useRef<Map<string, string>>(new Map());
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [modelReady, setModelReady] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadStats, setDownloadStats] = useState({ downloadedBytes: 0, totalBytes: 0, speedBytesPerSecond: 0 });
  const [latexReady, setLatexReady] = useState(false);
  const [isCompiling, setIsCompiling] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const initRef = useRef(false);
  const providerRef = useRef<WebrtcProvider | null>(null);
  const ydocRef = useRef<Y.Doc | null>(null);

  useEffect(() => {
    const p = getProjects().find((x) => x.id === id);
    const r = getRooms().find((x) => x.id === id);
    setProjectName(p?.name ?? r?.name ?? "Project");
  }, [id]);

  useEffect(() => {
    if (!id || initRef.current) return;
    initRef.current = true;
    let cancelled = false;

    // Reset state when switching projects so we don't show stale content
    setYdoc(null);
    setYtext(null);
    setProvider(null);
    setFs(null);
    setOpenTabs([{ path: `${basePath}/main.tex`, type: "text" }]);
    setActiveTabPath(`${basePath}/main.tex`);
    setCurrentPath(`${basePath}/main.tex`);
    setAddTargetPath(basePath);

    const init = async () => {
      try {
        const doc = new Y.Doc();
        const prov = new WebrtcProvider(id, doc);
        providerRef.current = prov;
        ydocRef.current = doc;
        const text = doc.getText("document");

        const idbfs = await mount();
        if (cancelled) return;

        const mainPath = `${basePath}/main.tex`;
        const diagramPath = `${basePath}/diagram.jpg`;

        // Ensure parent directories exist: /projects, then /projects/{id}
        for (const dir of ["/projects", basePath]) {
          if (cancelled) return;
          try {
            await idbfs.mkdir(dir);
          } catch {
            // may exist
          }
        }

        if (cancelled) return;
        // Only initialize when files don't exist - never overwrite existing project content
        const exists = await idbfs.exists(mainPath).catch(() => false);
        if (exists) {
          try {
            const data = await idbfs.readFile(mainPath);
            const content = typeof data === "string" ? data : new TextDecoder().decode(data as ArrayBuffer);
            if (content?.length > 0 && text.length === 0) {
              text.insert(0, content);
            }
          } catch {
            // ignore
          }
        } else {
          // New project: initialize only from public/main.tex (served at /main.tex)
          const res = await fetch("/main.tex");
          if (!res.ok) throw new Error(`Failed to load main.tex: ${res.status}`);
          const mainContent = await res.text();
          if (!mainContent?.trim()) throw new Error("main.tex is empty");
          try {
            const buf = new TextEncoder().encode(mainContent).buffer as ArrayBuffer;
            await idbfs.writeFile(mainPath, buf, { mimeType: "text/x-tex" });
          } catch (e) {
            if (!String(e).includes("already exists")) throw e;
            try {
              const data = await idbfs.readFile(mainPath);
              const content = typeof data === "string" ? data : new TextDecoder().decode(data as ArrayBuffer);
              if (content?.length > 0 && text.length === 0) text.insert(0, content);
            } catch {
              // ignore
            }
          }
          if (text.length === 0) text.insert(0, mainContent);
        }

        if (cancelled) return;
        // Only add diagram when missing - never overwrite existing files
        const diagramExists = await idbfs.exists(diagramPath).catch(() => false);
        if (!diagramExists) {
          // New project: initialize from public/diagram.jpg (served at /diagram.jpg)
          try {
            const res = await fetch("/diagram.jpg");
            if (res.ok) {
              const buf = await res.arrayBuffer();
              await idbfs.writeFile(diagramPath, buf, { mimeType: "image/jpeg" });
            }
          } catch (e) {
            // File may already exist (e.g. React Strict Mode double-mount race)
            if (!String(e).includes("already exists")) throw e;
          }
        }

        if (cancelled) return;
        setYdoc(doc);
        setYtext(text);
        setProvider(prov);
        setFs(idbfs);
      } catch (e) {
        if (cancelled) return;
        // Don't surface "connection is closing" - happens when unmounting during init (e.g. Strict Mode)
        const msg = String(e);
        if (msg.includes("connection is closing") || msg.includes("InvalidStateError")) {
          console.warn("Init aborted (connection closed):", e);
          return;
        }
        console.error("Init error:", e);
        setInitError(msg);
      }
    };

    init();

    return () => {
      cancelled = true;
      initRef.current = false;
      providerRef.current?.destroy();
      providerRef.current = null;
      ydocRef.current?.destroy();
      ydocRef.current = null;
    };
  }, [id]);

  useEffect(() => {
    if (!checkWebGPUSupport()) return;

    let lastUpdate = 0;
    const throttleMs = 200;
    setProgressCallback((progress, stats) => {
      const now = Date.now();
      if (now - lastUpdate < throttleMs && progress < 100) return;
      lastUpdate = now;
      setDownloadProgress(progress);
      if (stats) setDownloadStats(stats);
    });

    (async () => {
      try {
        const ok = await initializeModel();
        setModelReady(ok);
      } catch (e) {
        console.warn("Model init failed:", e);
      } finally {
        setProgressCallback(() => {});
      }
    })();

    return () => setProgressCallback(() => {});
  }, []);

  useEffect(() => {
    ensureLatexReady()
      .then(() => setLatexReady(true))
      .catch((e) => console.warn("LaTeX WASM init failed:", e));
  }, []);

  const saveActiveTextToCache = useCallback(() => {
    if (ytext && activeTabPath && !isImagePath(activeTabPath)) {
      textContentCacheRef.current.set(activeTabPath, ytext.toString());
    }
  }, [ytext, activeTabPath]);

  const loadTextIntoEditor = useCallback(
    (path: string, content: string) => {
      if (!ytext) return;
      ytext.delete(0, ytext.length);
      ytext.insert(0, content || "");
    },
    [ytext]
  );

  const handleFileSelect = useCallback(
    async (path: string) => {
      if (!fs || !ytext) return;

      const stat = await fs.stat(path).catch(() => null);
      if (stat?.isDirectory) {
        setCurrentPath(path);
        setAddTargetPath(path);
        return;
      }

      setCurrentPath(path);
      const parentDir = path.substring(0, path.lastIndexOf("/")) || "/";
      setAddTargetPath(parentDir.startsWith(basePath) ? parentDir : basePath);
      const isImage = isImagePath(path);
      const existingIdx = openTabs.findIndex((t) => t.path === path);

      if (existingIdx >= 0) {
        setActiveTabPath(path);
        setCurrentPath(path);
        if (isImage) {
          saveActiveTextToCache();
        } else {
          saveActiveTextToCache();
          const cached = textContentCacheRef.current.get(path);
          if (cached !== undefined) {
            loadTextIntoEditor(path, cached);
          } else {
            try {
              const data = await fs.readFile(path);
              const content = typeof data === "string" ? data : new TextDecoder().decode(data as ArrayBuffer);
              loadTextIntoEditor(path, content || "");
            } catch {
              loadTextIntoEditor(path, "");
            }
          }
        }
        return;
      }

      saveActiveTextToCache();

      if (isImage) {
        try {
          const data = await fs.readFile(path);
          const blob = data instanceof ArrayBuffer ? new Blob([data]) : new Blob([data]);
          const url = URL.createObjectURL(blob);
          setImageUrlCache((prev) => {
            const next = new Map(prev);
            next.set(path, url);
            return next;
          });
          setOpenTabs((t) => [...t, { path, type: "image" }]);
          setActiveTabPath(path);
          setCurrentPath(path);
        } catch (e) {
          console.error("Failed to load image:", e);
        }
      } else {
        try {
          const data = await fs.readFile(path);
          const content = typeof data === "string" ? data : new TextDecoder().decode(data as ArrayBuffer);
          loadTextIntoEditor(path, content || "");
          setOpenTabs((t) => [...t, { path, type: "text" }]);
          setActiveTabPath(path);
          setCurrentPath(path);
        } catch {
          loadTextIntoEditor(path, "");
          setOpenTabs((t) => [...t, { path, type: "text" }]);
          setActiveTabPath(path);
          setCurrentPath(path);
        }
      }
    },
    [fs, ytext, openTabs, basePath, saveActiveTextToCache, loadTextIntoEditor]
  );

  const handleTabSelect = useCallback(
    async (path: string) => {
      if (!fs || !ytext) return;
      if (path === activeTabPath) return;

      const tab = openTabs.find((t) => t.path === path);
      if (!tab) return;

      saveActiveTextToCache();
      setCurrentPath(path);
      const parentDir = path.substring(0, path.lastIndexOf("/")) || "/";
      setAddTargetPath(parentDir.startsWith(basePath) ? parentDir : basePath);
      if (tab.type === "image") {
        setActiveTabPath(path);
      } else {
        const cached = textContentCacheRef.current.get(path);
        if (cached !== undefined) {
          loadTextIntoEditor(path, cached);
        } else {
          try {
            const data = await fs.readFile(path);
            const content = typeof data === "string" ? data : new TextDecoder().decode(data as ArrayBuffer);
            loadTextIntoEditor(path, content || "");
          } catch {
            loadTextIntoEditor(path, "");
          }
        }
        setActiveTabPath(path);
      }
    },
    [fs, ytext, openTabs, activeTabPath, basePath, saveActiveTextToCache, loadTextIntoEditor]
  );

  const handleTabClose = useCallback(
    async (path: string) => {
      if (!ytext) return;

      const idx = openTabs.findIndex((t) => t.path === path);
      if (idx < 0) return;

      if (path === activeTabPath) {
        saveActiveTextToCache();
        const remaining = openTabs.filter((t) => t.path !== path);
        const nextActive = remaining[idx] ?? remaining[idx - 1] ?? null;
        if (nextActive) {
          setActiveTabPath(nextActive.path);
          setCurrentPath(nextActive.path);
          setOpenTabs(remaining);
          if (nextActive.type === "text" && fs) {
            const cached = textContentCacheRef.current.get(nextActive.path);
            if (cached !== undefined) {
              loadTextIntoEditor(nextActive.path, cached);
            } else {
              try {
                const data = await fs.readFile(nextActive.path);
                const content = typeof data === "string" ? data : new TextDecoder().decode(data as ArrayBuffer);
                loadTextIntoEditor(nextActive.path, content || "");
              } catch {
                loadTextIntoEditor(nextActive.path, "");
              }
            }
          }
        } else {
          setActiveTabPath("");
          setCurrentPath("");
          setOpenTabs(remaining);
        }
      } else {
        setOpenTabs((t) => t.filter((x) => x.path !== path));
      }

      if (isImagePath(path)) {
        const url = imageUrlCache.get(path);
        if (url) {
          URL.revokeObjectURL(url);
          setImageUrlCache((prev) => {
            const next = new Map(prev);
            next.delete(path);
            return next;
          });
        }
      }
    },
    [openTabs, activeTabPath, ytext, fs, imageUrlCache, saveActiveTextToCache, loadTextIntoEditor]
  );

  const handleFileDeleted = useCallback(
    (path: string, isFolder: boolean) => {
      const pathsToClose = isFolder
        ? openTabs.filter(
            (t) => t.path === path || t.path.startsWith(path + "/")
          ).map((t) => t.path)
        : [path];
      if (pathsToClose.length === 0) return;
      // Close all matching tabs in one update (handleTabClose does one path at a time)
      const remaining = openTabs.filter((t) => !pathsToClose.includes(t.path));
      const activeWasClosed = pathsToClose.includes(activeTabPath);
      saveActiveTextToCache();
      setOpenTabs(remaining);
      if (activeWasClosed) {
        const nextActive = remaining[0] ?? null;
        if (nextActive) {
          setActiveTabPath(nextActive.path);
          setCurrentPath(nextActive.path);
          if (nextActive.type === "text" && fs && ytext) {
            const cached = textContentCacheRef.current.get(nextActive.path);
            if (cached !== undefined) {
              loadTextIntoEditor(nextActive.path, cached);
            } else {
              fs.readFile(nextActive.path)
                .then((data) => {
                  const content = typeof data === "string" ? data : new TextDecoder().decode(data as ArrayBuffer);
                  loadTextIntoEditor(nextActive.path, content || "");
                })
                .catch(() => loadTextIntoEditor(nextActive.path, ""));
            }
          }
        } else {
          setActiveTabPath("");
          setCurrentPath("");
        }
      } else if (pathsToClose.includes(currentPath)) {
        // Selected file/folder was deleted but wasn't open in a tab - clear selection
        const parentDir = currentPath.substring(0, currentPath.lastIndexOf("/")) || basePath;
        const newPath = parentDir.startsWith(basePath) ? parentDir : basePath;
        setCurrentPath(newPath);
        setAddTargetPath(newPath);
      }
      pathsToClose.forEach((p) => {
        if (isImagePath(p)) {
          const url = imageUrlCache.get(p);
          if (url) {
            URL.revokeObjectURL(url);
            setImageUrlCache((prev) => {
              const next = new Map(prev);
              next.delete(p);
              return next;
            });
          }
        }
      });
    },
    [openTabs, activeTabPath, currentPath, basePath, fs, ytext, imageUrlCache, saveActiveTextToCache, loadTextIntoEditor]
  );

  const handleCompile = async () => {
    if (!latexReady || !ytext || !fs) return;
    const fsInstance = fs;

    const activeTab = openTabs.find((t) => t.path === activeTabPath);
    if (activeTab?.type === "text" && activeTabPath) {
      try {
        await fsInstance.writeFile(
          activeTabPath,
          new TextEncoder().encode(ytext.toString()).buffer as ArrayBuffer,
          { mimeType: "text/x-tex" }
        );
      } catch (e) {
        console.warn("Save before compile failed:", e);
      }
    }

    setIsCompiling(true);
    try {
      let latex = ytext.toString();
      if (!latex.trim()) {
        const mainTab = openTabs.find((t) => t.type === "text" && t.path.endsWith("main.tex"));
        if (mainTab) {
          latex = textContentCacheRef.current.get(mainTab.path) ?? "";
        }
      }

      const additionalFiles: { path: string; content: string | Uint8Array }[] = [];

      async function gatherFiles(dir: string) {
        const { dirs, files } = await fsInstance.readdir(dir);
        for (const f of files) {
          const relPath = dir === basePath ? f.name : `${dir.replace(basePath + "/", "")}/${f.name}`;
          if (relPath === "main.tex") continue;
          try {
            const fullPath = dir === "/" ? `/${f.name}` : `${dir}/${f.name}`;
            const data = await fsInstance.readFile(fullPath);
            const isBinary = /\.(jpg|jpeg|png|gif|pdf|woff|woff2|ttf|otf)$/i.test(f.name);
            additionalFiles.push({
              path: relPath,
              content: isBinary
                ? (data instanceof ArrayBuffer ? new Uint8Array(data) : (data as Uint8Array))
                : typeof data === "string"
                  ? data
                  : new TextDecoder().decode(data as ArrayBuffer),
            });
          } catch {
            // skip
          }
        }
        for (const d of dirs) {
          const subDir = dir === "/" ? `/${d.name}` : `${dir}/${d.name}`;
          await gatherFiles(subDir);
        }
      }
      await gatherFiles(basePath);

      const pdfBlob = await compileLatexToPdf(latex, additionalFiles);
      const url = URL.createObjectURL(pdfBlob);
      setPdfUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return url;
      });
    } catch (e) {
      console.error("Compile failed", e);
    } finally {
      setIsCompiling(false);
    }
  };

  const handleSendChat = async () => {
    if (!chatInput.trim()) return;
    const userMessage = chatInput.trim();
    setChatMessages((msgs) => [...msgs, { role: "user", content: userMessage }]);
    setChatInput("");

    try {
      const context = ytext?.toString() ?? "";
      const reply = await generateChatResponse(userMessage, context);
      setChatMessages((msgs) => [...msgs, { role: "assistant", content: reply }]);
    } catch (e) {
      console.error(e);
      setChatMessages((msgs) => [
        ...msgs,
        { role: "assistant", content: "Error generating response. WebGPU may be required." },
      ]);
    }
  };

  if (initError) {
    return (
      <div className="h-screen flex flex-col items-center justify-center p-8 gap-4">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-semibold text-red-400 mb-2">Initialization Error</h1>
          <p className="text-zinc-400 text-sm mb-4">{initError}</p>
          <p className="text-zinc-500 text-xs">Ensure you have a modern browser with WebGPU support.</p>
        </div>
        <Link href="/" className="text-sm text-blue-500 hover:underline">
          ← Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <aside className="w-64 border-r border-zinc-800 flex flex-col min-h-0 bg-zinc-950">
        <div className="h-12 flex items-center justify-between px-3 border-b border-zinc-800 shrink-0">
          <Link href="/" className="text-xs text-zinc-500 hover:text-zinc-400 truncate">
            ← Dashboard
          </Link>
        </div>
        <div className="h-12 flex items-center justify-between px-3 font-semibold text-xs border-b border-zinc-800 shrink-0">
          {projectName}
          <FileActions fs={fs} basePath={addTargetPath} onAction={() => setRefreshTrigger((t) => t + 1)} />
        </div>
        <FileTree
          fs={fs}
          basePath={basePath}
          currentPath={currentPath}
          onFileSelect={handleFileSelect}
          onRefresh={() => setRefreshTrigger((t) => t + 1)}
          refreshTrigger={refreshTrigger}
          onFileDeleted={handleFileDeleted}
        />
      </aside>

      <main className="flex-1 flex min-w-0 min-h-0">
        <section className="w-1/2 flex flex-col border-r border-zinc-800 min-w-0 min-h-0 overflow-hidden">
          <FileTabs
            tabs={openTabs}
            activePath={activeTabPath}
            onSelect={handleTabSelect}
            onClose={handleTabClose}
          />
          <div className="flex-1 relative min-h-0 overflow-hidden">
            {(() => {
              const activeTab = openTabs.find((t) => t.path === activeTabPath);
              if (activeTab?.type === "image") {
                return (
                  <ImageViewer
                    imageUrl={imageUrlCache.get(activeTabPath) ?? null}
                    alt={activeTabPath.split("/").pop() ?? "Image"}
                  />
                );
              }
              if (activeTab?.type === "text" && ydoc && ytext && provider) {
                return (
                  <EditorPanel
                    ydoc={ydoc}
                    ytext={ytext}
                    provider={provider}
                    currentPath={activeTabPath}
                    onYtextChange={() => {}}
                  />
                );
              }
              if (!ydoc || !ytext || !provider) {
                return (
                  <div className="absolute inset-0 flex items-center justify-center text-zinc-500 bg-zinc-950">
                    Loading editor…
                  </div>
                );
              }
              return (
                <div className="absolute inset-0 flex items-center justify-center text-zinc-500 text-sm bg-zinc-950">
                  Open a file to get started
                </div>
              );
            })()}
          </div>
          <div className="h-56 border-t border-zinc-800 flex flex-col bg-zinc-950">
            <div className="px-3 py-2 text-sm font-medium border-b border-zinc-800 bg-zinc-900 text-zinc-400 flex flex-col gap-1.5 min-h-[52px] shrink-0">
              <div className="flex items-center justify-between gap-3">
                <span>AI assistant</span>
                {modelReady ? (
                  <span className="text-emerald-500 shrink-0">Ready</span>
                ) : (
                  <span className="tabular-nums text-zinc-500 shrink-0 w-12 text-right">
                    {Math.round(downloadProgress)}%
                  </span>
                )}
              </div>
              <div className="h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden">
                <div
                  className="h-full bg-blue-600 rounded-full transition-[width] duration-300 ease-out"
                  style={{ width: modelReady ? "100%" : `${downloadProgress}%` }}
                />
              </div>
            </div>
            <div className="flex-1 min-h-0 overflow-auto px-3 py-2 text-sm space-y-2 text-zinc-300">
              {chatMessages.map((m, i) => (
                <div key={i}>
                  <span className="font-semibold text-zinc-400">
                    {m.role === "user" ? "You: " : "AI: "}
                  </span>
                  <span>{m.content}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-zinc-800 flex items-center gap-2 px-3 py-2">
              <input
                className="flex-1 border border-zinc-700 rounded px-3 py-2 text-sm bg-zinc-900 text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendChat()}
                placeholder="Ask about your LaTeX…"
              />
              <button
                className="text-sm px-3 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 transition-colors"
                onClick={handleSendChat}
                disabled={!modelReady}
              >
                Send
              </button>
            </div>
          </div>
        </section>

        <section className="w-1/2 flex flex-col min-w-0">
          <div className="flex-1 overflow-hidden flex flex-col min-h-0">
            <PdfPreview
              pdfUrl={pdfUrl}
              onCompile={handleCompile}
              isCompiling={isCompiling}
              latexReady={latexReady}
            />
          </div>
        </section>
      </main>
    </div>
  );
}
