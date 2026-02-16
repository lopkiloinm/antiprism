"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, usePathname } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import * as Y from "yjs";
import { WebrtcProvider } from "y-webrtc";
import { mount } from "@wwog/idbfs";
import { FileTree } from "@/components/FileTree";
import { FileActions } from "@/components/FileActions";
import { FileTabs } from "@/components/FileTabs";
import { ImageViewer } from "@/components/ImageViewer";
import { EditorPanel, type EditorPanelHandle } from "@/components/EditorPanel";
import { ChatInput } from "@/components/ChatInput";
import { AIModelDownloadProgress } from "@/components/AIModelDownloadProgress";
import { ProjectDropdown } from "@/components/ProjectDropdown";
import { IconSearch, IconChevronDown, IconChevronUp, IconShare2, IconSend, IconTrash2 } from "@/components/Icons";

const PdfPreview = dynamic(() => import("@/components/PdfPreview").then((m) => ({ default: m.PdfPreview })), {
  ssr: false,
});
import ReactMarkdown from "react-markdown";
import { generateChatResponse } from "@/lib/localModel";
import { compileLatexToPdf, ensureLatexReady } from "@/lib/latexCompiler";
import { getProjects, getRooms } from "@/lib/projects";

const DEFAULT_FILE = "/main.tex";
const DEFAULT_DIAGRAM = "/diagram.jpg";
const IMAGE_EXT = /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i;
const BASE = typeof process !== "undefined" && process.env?.NEXT_PUBLIC_BASE_PATH ? process.env.NEXT_PUBLIC_BASE_PATH : "";

function isImagePath(path: string): boolean {
  return IMAGE_EXT.test(path);
}

export default function ProjectPageClient({ idOverride }: { idOverride?: string }) {
  const params = useParams();
  const pathname = usePathname();
  // With middleware rewrite, pathname stays as /project/:id in browser; params.id may be "new"
  const match = pathname?.match(/\/project\/([^/]+)/);
  const idFromPath = match?.[1];
  const id = idOverride ?? idFromPath ?? (params?.id as string);
  const basePath = id ? `/projects/${id}` : "/";

  const [projectName, setProjectName] = useState<string>("Project");
  const [isRoom, setIsRoom] = useState(false);
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
  const [chatMessages, setChatMessages] = useState<
    { role: "user" | "assistant"; content: string; responseType?: "ask" | "agent"; createdPath?: string; markdown?: string }[]
  >([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [modelReady, setModelReady] = useState(false);
  const [latexReady, setLatexReady] = useState(false);
  const [isCompiling, setIsCompiling] = useState(false);
  const [lastCompileMs, setLastCompileMs] = useState<number | null>(null);
  const [initError, setInitError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [sidebarTab, setSidebarTab] = useState<"files" | "chats">("files");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [chatExpanded, setChatExpanded] = useState(false);
  const [chatMode, setChatMode] = useState<"ask" | "agent">("ask");
  const [streamingStats, setStreamingStats] = useState<{
    tokensPerSec: number;
    totalTokens: number;
    elapsedSeconds: number;
    inputTokens: number;
    contextUsed: number;
  } | null>(null);
  const initRef = useRef(false);
  const providerRef = useRef<WebrtcProvider | null>(null);
  const ydocRef = useRef<Y.Doc | null>(null);
  const editorRef = useRef<EditorPanelHandle | null>(null);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const lastMessageRef = useRef<HTMLPreElement | null>(null);
  const autoCompileDoneRef = useRef(false);

  useEffect(() => {
    const p = getProjects().find((x) => x.id === id);
    const r = getRooms().find((x) => x.id === id);
    if (p) {
      setProjectName(p.name);
      setIsRoom(false);
    } else if (r) {
      setProjectName(r.name);
      setIsRoom(true);
    } else {
      setProjectName("Project");
      setIsRoom(false);
    }
  }, [id]);

  useEffect(() => {
    if (chatExpanded && chatScrollRef.current) {
      requestAnimationFrame(() => {
        const el = chatScrollRef.current;
        if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
      });
    }
  }, [chatMessages, chatExpanded]);

  useEffect(() => {
    if (isGenerating && lastMessageRef.current) {
      requestAnimationFrame(() => {
        const el = lastMessageRef.current;
        if (el) el.scrollTop = el.scrollHeight;
      });
    }
  }, [chatMessages, isGenerating]);

  useEffect(() => {
    if (!id || initRef.current) return;
    initRef.current = true;
    let cancelled = false;

    // Reset state when switching projects so we don't show stale content
    autoCompileDoneRef.current = false;
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
          // New project: initialize only from public/main.tex (served at {base}/main.tex)
          const res = await fetch(`${BASE}/main.tex`);
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
          // New project: initialize from public/diagram.jpg (served at {base}/diagram.jpg)
          try {
            const res = await fetch(`${BASE}/diagram.jpg`);
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
    ensureLatexReady()
      .then(() => setLatexReady(true))
      .catch((e) => console.warn("LaTeX WASM init failed:", e));
  }, []);

  const onYtextChangeNoop = useCallback(() => {}, []);

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
        // idbfs writeFile is create-only; remove first so we can overwrite
        await fsInstance.rm(activeTabPath).catch(() => {});
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
    const start = performance.now();
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
      setLastCompileMs(Math.round(performance.now() - start));
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

  useEffect(() => {
    if (latexReady && ytext && fs && !autoCompileDoneRef.current && !isCompiling) {
      autoCompileDoneRef.current = true;
      void handleCompile();
    }
  }, [latexReady, ytext, fs, isCompiling]);

  const handleSendChat = async () => {
    if (!chatInput.trim()) return;
    const userMessage = chatInput.trim();
    setChatMessages((msgs) => [...msgs, { role: "user", content: userMessage }, { role: "assistant", content: "Thinking..." }]);
    setChatInput("");
    setChatExpanded(true);
    setIsGenerating(true);

    const isAsk = chatMode === "ask";
    let lastUpdate = 0;

    try {
      const context = ytext?.toString() ?? "";
      const reply = await generateChatResponse(
        userMessage,
        isAsk ? context : undefined,
        chatMode,
        {
          onChunk: (text) => {
            setChatMessages((msgs) => {
              const next = [...msgs];
              const lastIdx = next.length - 1;
              if (lastIdx >= 0 && next[lastIdx].role === "assistant") {
                const prev = next[lastIdx].content === "Thinking..." ? "" : next[lastIdx].content;
                next[lastIdx] = { role: "assistant", content: prev + text, responseType: chatMode };
              }
              return next;
            });
          },
          onTokensPerSec: (tokensPerSec, totalTokens, elapsedSeconds, inputTokens) => {
            const now = Date.now();
            if (now - lastUpdate >= 300) {
              lastUpdate = now;
              setStreamingStats({
                tokensPerSec: Math.round(tokensPerSec * 10) / 10,
                totalTokens,
                elapsedSeconds: Math.round(elapsedSeconds * 10) / 10,
                inputTokens,
                contextUsed: inputTokens + totalTokens,
              });
            }
          },
          onComplete: (outputTokens, elapsedSeconds, inputTokens) => {
            const contextUsed = inputTokens + outputTokens;
            setStreamingStats({
              tokensPerSec: Math.round((outputTokens / elapsedSeconds) * 10) / 10,
              totalTokens: outputTokens,
              elapsedSeconds: Math.round(elapsedSeconds * 10) / 10,
              inputTokens,
              contextUsed,
            });
          },
        },
        chatMessages.map((m) => ({
          role: m.role,
          content: m.role === "assistant" && m.responseType === "agent" && m.markdown ? m.markdown : m.content,
        }))
      );

      let createdPath: string | undefined;
      if (reply.type === "agent" && fs && reply.content) {
        const titleText = reply.title ?? reply.content.match(/\\title\s*\{([^{}]+)\}/)?.[1]?.trim() ?? "";
        const slug =
          titleText
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, "")
            .trim()
            .split(/\s+/)
            .slice(0, 4)
            .join("_")
            .replace(/_+/g, "_") || "paper";
        let filename = `${slug}.tex`;
        let path = `${basePath}/${filename}`;
        let n = 1;
        while (await fs.exists(path).catch(() => false)) {
          filename = `${slug}_${n}.tex`;
          path = `${basePath}/${filename}`;
          n++;
        }
        const buf = new TextEncoder().encode(reply.content).buffer as ArrayBuffer;
        await fs.writeFile(path, buf, { mimeType: "text/x-tex" });
        createdPath = path;
        setRefreshTrigger((t) => t + 1);
        await handleFileSelect(path);
      }

      setChatMessages((msgs) => {
        const next = [...msgs];
        const lastIdx = next.length - 1;
        const assistantMsg = {
          role: "assistant" as const,
          content: reply.content,
          responseType: reply.type,
          ...(createdPath && { createdPath }),
          ...(reply.type === "agent" && reply.markdown && { markdown: reply.markdown }),
        };
        if (lastIdx >= 0 && next[lastIdx].role === "assistant") {
          next[lastIdx] = assistantMsg;
        } else {
          next.push(assistantMsg);
        }
        return next;
      });
    } catch (e) {
      console.error(e);
      setChatMessages((msgs) => {
        const next = [...msgs];
        const lastIdx = next.length - 1;
        if (lastIdx >= 0 && next[lastIdx].role === "assistant") {
          next[lastIdx] = { role: "assistant", content: "Error generating response. WebGPU may be required." };
        } else {
          next.push({ role: "assistant", content: "Error generating response. WebGPU may be required." });
        }
        return next;
      });
    } finally {
      setIsGenerating(false);
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

  const handleShare = () => {
    if (typeof window === "undefined") return;
    navigator.clipboard?.writeText(window.location.href);
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <aside className="w-64 border-r border-zinc-800 flex flex-col min-h-0 bg-zinc-950">
        <div className="h-12 flex items-center justify-between px-3 border-b border-zinc-800 shrink-0">
          <Link href="/" className="text-xs text-zinc-500 hover:text-zinc-400 truncate">
            ← Dashboard
          </Link>
        </div>
        <div className="px-3 py-2 border-b border-zinc-800 shrink-0 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <ProjectDropdown
              projectId={id}
              projectName={projectName}
              isRoom={isRoom}
              fs={fs}
              onRename={setProjectName}
            >
              {projectName}
            </ProjectDropdown>
            <button
              onClick={handleShare}
              className="shrink-0 text-zinc-400 hover:text-zinc-200 p-1.5 rounded hover:bg-zinc-800 transition-colors"
              title="Share"
            >
              <IconShare2 />
            </button>
          </div>
          <div className="flex items-center justify-between gap-2">
            <div className="flex rounded bg-zinc-900 border border-zinc-700 overflow-hidden shrink-0">
              <button
                onClick={() => setSidebarTab("files")}
                className={`px-2 py-1.5 text-xs font-medium transition-colors ${sidebarTab === "files" ? "bg-zinc-700 text-zinc-100" : "text-zinc-400 hover:text-zinc-200"}`}
              >
                Files
              </button>
              <button
                onClick={() => setSidebarTab("chats")}
                className={`px-2 py-1.5 text-xs font-medium transition-colors ${sidebarTab === "chats" ? "bg-zinc-700 text-zinc-100" : "text-zinc-400 hover:text-zinc-200"}`}
              >
                Chats
              </button>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {sidebarTab === "files" && (
                <>
                  <button
                    onClick={() => setSearchOpen((o) => !o)}
                    className={`w-7 h-7 rounded flex items-center justify-center ${searchOpen ? "bg-zinc-700 text-zinc-200" : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"}`}
                    title="Search"
                  >
                    <IconSearch />
                  </button>
                  <FileActions fs={fs} basePath={addTargetPath} onAction={() => setRefreshTrigger((t) => t + 1)} />
                </>
              )}
            </div>
          </div>
          {sidebarTab === "files" && searchOpen && (
            <input
              type="text"
              placeholder="Search files…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-2 py-1.5 text-xs rounded bg-zinc-900 border border-zinc-700 text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
              autoFocus
            />
          )}
        </div>
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
          {sidebarTab === "files" ? (
            <FileTree
              fs={fs}
              basePath={basePath}
              currentPath={currentPath}
              onFileSelect={handleFileSelect}
              onRefresh={() => setRefreshTrigger((t) => t + 1)}
              refreshTrigger={refreshTrigger}
              onFileDeleted={handleFileDeleted}
              searchQuery={searchQuery}
            />
          ) : (
            <div className="flex-1 flex flex-col min-h-0 p-3">
              <p className="text-sm text-zinc-500">Chat sessions</p>
              <p className="text-xs text-zinc-600 mt-2">Create and switch between chat sessions.</p>
            </div>
          )}
        </div>
      </aside>

      <main className="flex-1 flex min-w-0 min-h-0">
        {(() => {
          const activeTab = openTabs.find((t) => t.path === activeTabPath);
          const showAIPanel = activeTab?.type === "text" && ydoc && ytext && provider;
          return (
            <section className="w-1/2 flex flex-col border-r border-zinc-800 min-w-0 min-h-0 overflow-hidden">
              <FileTabs
                tabs={openTabs}
                activePath={activeTabPath}
                onSelect={handleTabSelect}
                onClose={handleTabClose}
              />
              <div className="flex-1 relative min-h-0 overflow-hidden">
                {(() => {
                  const aiOverlayHeight = chatExpanded ? "45%" : "155px";
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
                      <div
                        className="absolute inset-0 overflow-hidden"
                        style={{ bottom: showAIPanel ? aiOverlayHeight : 0 }}
                      >
                        <EditorPanel
                          ref={editorRef}
                          ydoc={ydoc}
                          ytext={ytext}
                          provider={provider}
                          currentPath={activeTabPath}
                          onYtextChange={onYtextChangeNoop}
                        />
                      </div>
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
                {showAIPanel && (
                  <div
                    className={`absolute bottom-0 left-0 right-0 flex flex-col bg-zinc-950 border-t border-zinc-800/80 transition-[height] duration-200 ease-out overflow-hidden ${
                      chatExpanded ? "h-[45%]" : "h-[155px]"
                    }`}
                  >
                    <div className="flex items-center justify-end gap-1 shrink-0 px-1 py-1">
                      <button
                        onClick={() => {
                          setChatMessages([]);
                          setStreamingStats(null);
                        }}
                        className="w-7 h-7 rounded flex items-center justify-center text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
                        title="Clear chat"
                      >
                        <IconTrash2 />
                      </button>
                      <button
                        onClick={() => setChatExpanded((e) => !e)}
                        className="w-7 h-7 rounded flex items-center justify-center text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
                        title={chatExpanded ? "Collapse" : "Expand"}
                      >
                        {chatExpanded ? <IconChevronDown /> : <IconChevronUp />}
                      </button>
                    </div>
                    {chatExpanded && (
                      <div
                        ref={chatScrollRef}
                        className="flex-1 min-h-0 overflow-auto px-3 py-2 text-sm space-y-3 shrink min-h-0 flex flex-col scroll-smooth"
                        style={{ scrollBehavior: "smooth" }}
                      >
                        {chatMessages.map((m, i) => (
                          <div
                            key={i}
                            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                          >
                            <div
                              className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
                                m.role === "user"
                                  ? "bg-blue-600 text-white rounded-br-sm"
                                  : "bg-zinc-700/80 text-zinc-200 rounded-bl-sm"
                              }`}
                            >
                              {m.role === "assistant" && m.responseType === "agent" ? (
                                <pre
                                  ref={i === chatMessages.length - 1 && m.role === "assistant" ? lastMessageRef : undefined}
                                  className="text-sm overflow-x-auto overflow-y-auto whitespace-pre-wrap break-words font-mono bg-zinc-800/50 rounded p-3 max-h-64"
                                >
                                  {m.content}
                                </pre>
                              ) : m.content === "Thinking..." ? (
                                <span className="text-zinc-400 italic">{m.content}</span>
                              ) : m.role === "assistant" && m.responseType === "ask" ? (
                                <div className="prose prose-invert prose-sm max-w-none [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0">
                                  <ReactMarkdown>{m.content}</ReactMarkdown>
                                </div>
                              ) : m.role === "assistant" ? (
                                <div className="prose prose-invert prose-sm max-w-none [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0">
                                  <ReactMarkdown>{m.content}</ReactMarkdown>
                                </div>
                              ) : (
                                <span>{m.content}</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center justify-between gap-3 px-3 py-1.5 text-xs text-zinc-500 shrink-0 border-t border-zinc-800/60">
                      <span className={isGenerating ? "text-zinc-400" : streamingStats ? "text-emerald-500/80" : "text-zinc-500"}>
                        {isGenerating ? "Streaming…" : streamingStats ? "Done!" : "—"}
                      </span>
                      <span className="tabular-nums">
                        {streamingStats
                          ? `${streamingStats.totalTokens} tokens · ${streamingStats.elapsedSeconds}s · ${streamingStats.tokensPerSec} tok/s · ${streamingStats.contextUsed.toLocaleString()} / 32K context`
                          : "— tokens · — s · — tok/s · — context"}
                      </span>
                    </div>
                    <ChatInput
                      chatInput={chatInput}
                      setChatInput={setChatInput}
                      chatMode={chatMode}
                      setChatMode={setChatMode}
                      modelReady={modelReady}
                      isGenerating={isGenerating}
                      onModelReady={setModelReady}
                      onSend={handleSendChat}
                    />
                  </div>
                )}
              </div>
            </section>
          );
        })()}

        <section className="w-1/2 flex flex-col min-w-0">
          <div className="flex-1 overflow-hidden flex flex-col min-h-0">
            <PdfPreview
              pdfUrl={pdfUrl}
              onCompile={handleCompile}
              isCompiling={isCompiling}
              latexReady={latexReady}
              lastCompileMs={lastCompileMs}
            />
          </div>
        </section>
      </main>
    </div>
  );
}
