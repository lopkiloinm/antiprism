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
import { FileTabs, SETTINGS_TAB_PATH } from "@/components/FileTabs";
import { ImageViewer } from "@/components/ImageViewer";
import { EditorPanel, type EditorPanelHandle } from "@/components/EditorPanel";
import { ChatInput } from "@/components/ChatInput";
import { AIModelDownloadProgress } from "@/components/AIModelDownloadProgress";
import { ChatTree, type ChatTreeProps } from "@/components/ChatTree";
import { BigChatMessage } from "@/components/BigChatMessage";
import { SmallChatMessage } from "@/components/SmallChatMessage";
import { ChatTelemetry } from "@/components/ChatTelemetry";
import { ProjectDropdown } from "@/components/ProjectDropdown";
import { IconSearch, IconChevronDown, IconChevronUp, IconShare2, IconSend, IconTrash2, IconSettings, IconBookOpen, IconChevronRight, IconPlus, IconMessageSquare } from "@/components/Icons";
import { SettingsPanel } from "@/components/SettingsPanel";
import { ToolsPanel } from "@/components/ToolsPanel";
import { ResizableDivider } from "@/components/ResizableDivider";
import { GitPanel } from "@/components/GitPanel";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { parseOutline, type OutlineEntry } from "@/lib/documentOutline";

const PdfPreview = dynamic(() => import("@/components/PdfPreview").then((m) => ({ default: m.PdfPreview })), {
  ssr: false,
});
import ReactMarkdown from "react-markdown";
import { generateChatResponse, switchModel, getActiveModelId, initializeModel, isModelLoading } from "@/lib/localModel";
import { createChat, getChatMessages, saveChatMessages } from "@/lib/chatStore";
import { AVAILABLE_MODELS, DEFAULT_MODEL_ID } from "@/lib/modelConfig";
import { compileLatexToPdf, ensureLatexReady } from "@/lib/latexCompiler";
import { compileTypstToPdf, ensureTypstReady } from "@/lib/typstCompiler";
import { countLaTeXWords, type TexCountResult, formatLaTeX } from "@/lib/wasmLatexTools";
import {
  getLatexEngine,
  type LaTeXEngine,
  getEditorFontSize,
  getEditorTabSize,
  getEditorLineWrapping,
  getAutoCompileOnChange,
  getAutoCompileDebounceMs,
  getAiMaxNewTokens,
  getAiTemperature,
  getAiTopP,
  getPromptAsk,
  getPromptCreate,
  getTheme,
  type Theme,
} from "@/lib/settings";
import { getAllProjects, getRooms } from "@/lib/projects";
import { EditorBufferManager } from "@/lib/editorBufferManager";
import { useTheme } from "@/contexts/ThemeContext";

const DEFAULT_FILE = "/main.tex";
const DEFAULT_DIAGRAM = "/diagram.jpg";
const IMAGE_EXT = /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i;
const BINARY_EXT = /\.(jpg|jpeg|png|gif|webp|bmp|svg|pdf|woff|woff2|ttf|otf|zip|gz|tar)$/i;
const BASE = typeof process !== "undefined" && process.env?.NEXT_PUBLIC_BASE_PATH ? process.env.NEXT_PUBLIC_BASE_PATH : "";

function isImagePath(path: string): boolean {
  return IMAGE_EXT.test(path);
}

/** Returns true for any binary file that should NOT be loaded into the text editor. */
function isBinaryPath(path: string): boolean {
  return BINARY_EXT.test(path);
}

export default function ProjectPageClient({ idOverride }: { idOverride?: string }) {
  const { theme, setTheme } = useTheme();
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
  const [openTabs, setOpenTabs] = useState<{ path: string; type: "text" | "image" | "settings" | "chat" }[]>([]);
  const [activeTabPath, _setActiveTabPath] = useState<string>("");
  const activeTabPathRef = useRef<string>("");
  const setActiveTabPath = useCallback((p: string) => {
    activeTabPathRef.current = p;
    _setActiveTabPath(p);
  }, []);
  const [currentPath, setCurrentPath] = useState<string>("");
  const [addTargetPath, setAddTargetPath] = useState<string>(basePath);
  const [imageUrlCache, setImageUrlCache] = useState<Map<string, string>>(new Map());
  const textContentCacheRef = useRef<Map<string, string>>(new Map());
  const bufferMgrRef = useRef<EditorBufferManager | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState("");
  const [bigChatMessages, setBigChatMessages] = useState<
    { role: "user" | "assistant"; content: string; responseType?: "ask" | "agent"; createdPath?: string; markdown?: string }[]
  >([]);
  const [smallChatMessages, setSmallChatMessages] = useState<
    { role: "user" | "assistant"; content: string; responseType?: "ask" | "agent"; createdPath?: string; markdown?: string }[]
  >([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [modelReady, setModelReady] = useState(false);
  const [latexReady, setLatexReady] = useState(false);
  const [typstReady, setTypstReady] = useState(false);
  const compilerReady = latexReady && typstReady;
  const [isCompiling, setIsCompiling] = useState(false);
  const [lastCompileMs, setLastCompileMs] = useState<number | null>(null);
  const [initError, setInitError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [sidebarTab, setSidebarTab] = useState<"files" | "chats" | "git">("files");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [chatExpanded, setChatExpanded] = useState(false);
  const [toolsPanelOpen, setToolsPanelOpen] = useState(false);
  const [summaryContent, setSummaryContent] = useState("");
  const [logsContent, setLogsContent] = useState("");
  const [isFormatting, setIsFormatting] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(256);
  const [editorFraction, setEditorFraction] = useState(0.5);
  const [outlineHeight, setOutlineHeight] = useState(400); // Default to maximum height
  const [selectedModelId, setSelectedModelId] = useState<string>(DEFAULT_MODEL_ID);

  // Capture console logs
  useEffect(() => {
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;
    
    const logs: string[] = [];
    
    const captureLog = (...args: any[]) => {
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ');
      logs.push(`[${new Date().toISOString()}] ${message}`);
      setLogsContent(logs.slice(-50).join('\n')); // Keep last 50 log entries
    };
    
    console.log = captureLog;
    console.error = (...args) => captureLog('ERROR:', ...args);
    console.warn = (...args) => captureLog('WARN:', ...args);
    
    return () => {
      console.log = originalLog;
      console.error = originalError;
      console.warn = originalWarn;
    };
  }, []);

  const [chatMode, setChatMode] = useState<"ask" | "agent">("ask");
  const [latexEngine, setLatexEngineState] = useState<LaTeXEngine>(() => getLatexEngine());
  const [editorFontSize, setEditorFontSizeState] = useState(() => getEditorFontSize());
  const [editorTabSize, setEditorTabSizeState] = useState(() => getEditorTabSize());
  const [editorLineWrapping, setEditorLineWrappingState] = useState(() => getEditorLineWrapping());
  const [autoCompileOnChange, setAutoCompileOnChangeState] = useState(() => getAutoCompileOnChange());
  const [aiMaxNewTokens, setAiMaxNewTokensState] = useState(() => getAiMaxNewTokens());
  const [aiTemperature, setAiTemperatureState] = useState(() => getAiTemperature());
  const [aiTopP, setAiTopPState] = useState(() => getAiTopP());
  const [promptAsk, setPromptAskState] = useState(() => getPromptAsk());
  const [promptCreate, setPromptCreateState] = useState(() => getPromptCreate());
  const [autoCompileDebounceMs, setAutoCompileDebounceMsState] = useState(() =>
    getAutoCompileDebounceMs()
  );
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
  const handleCompileRef = useRef<(() => Promise<void>) | null>(null);
  const isCompilingRef = useRef(false);

  useEffect(() => {
    const p = getAllProjects().find((x) => x.id === id);
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
  }, [bigChatMessages, chatExpanded]);

  // Load big chat messages when switching to a chat tab
  useEffect(() => {
    if (!activeTabPath) return;
    const activeTab = openTabs.find((t) => t.path === activeTabPath);
    if (activeTab?.type === "chat") {
      const chatId = activeTab.path.replace("/ai-chat/", "");
      const persistedMsgs = getChatMessages(chatId, "big");
      setBigChatMessages(persistedMsgs);
    }
  }, [activeTabPath, openTabs]);

  // Load small chat messages when switching to text file context
  useEffect(() => {
    if (!activeTabPath) return;
    const activeTab = openTabs.find((t) => t.path === activeTabPath);
    if (activeTab?.type === "text") {
      const persistedMsgs = getChatMessages("", "small");
      setSmallChatMessages(persistedMsgs);
    }
  }, [activeTabPath, openTabs]);

  useEffect(() => {
    if (isGenerating && chatScrollRef.current) {
      requestAnimationFrame(() => {
        const el = chatScrollRef.current;
        if (el) el.scrollTop = el.scrollHeight;
      });
    }
  }, [bigChatMessages, smallChatMessages, isGenerating]);

  useEffect(() => {
    if (!id || initRef.current) return;
    initRef.current = true;
    let cancelled = false;

    // Reset state when switching projects so we don't show stale content
    autoCompileDoneRef.current = false;
    bufferMgrRef.current = null;
    setYdoc(null);
    setYtext(null);
    setProvider(null);
    setFs(null);
    setOpenTabs([]);
    setActiveTabPath("");
    setCurrentPath("");
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
        const mainTypPath = `${basePath}/main.typ`;
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
        const importedMarkerPath = `${basePath}/.antiprism_imported`;
        const isImported = await idbfs.exists(importedMarkerPath).catch(() => false);

        const { dirs, files } = await idbfs.readdir(basePath).catch(() => ({ dirs: [] as { name: string }[], files: [] as { name: string }[] }));
        const isEmpty = dirs.length === 0 && files.length === 0;
        const hasMainTex = files.some((f: { name: string }) => f.name === "main.tex");
        const hasMainTyp = files.some((f: { name: string }) => f.name === "main.typ");
        const isNewProject = !isImported && isEmpty;

        if (isNewProject) {
          // + New only: seed from public (fetch all in parallel to avoid partial state on Strict Mode double-mount)
          const [resTex, resTyp, resDiagram] = await Promise.all([
            fetch(`${BASE}/main.tex`),
            fetch(`${BASE}/main.typ`),
            fetch(`${BASE}/diagram.jpg`),
          ]);
          if (!resTex.ok) throw new Error(`Failed to load main.tex: ${resTex.status}`);
          const mainContent = await resTex.text();
          if (!mainContent?.trim()) throw new Error("main.tex is empty");
          const typContent = resTyp.ok ? await resTyp.text() : "";
          const diagramBuf = resDiagram.ok ? await resDiagram.arrayBuffer() : null;

          if (!hasMainTex) {
            try {
              await idbfs.writeFile(mainPath, new TextEncoder().encode(mainContent).buffer as ArrayBuffer, { mimeType: "text/x-tex" });
            } catch (e) {
              if (!String(e).includes("already exists")) throw e;
            }
          }
          if (typContent?.trim() && !hasMainTyp) {
            try {
              await idbfs.writeFile(mainTypPath, new TextEncoder().encode(typContent).buffer as ArrayBuffer, { mimeType: "text/x-typst" });
            } catch (e) {
              if (!String(e).includes("already exists")) throw e;
            }
          }
          if (diagramBuf && !files.some((f: { name: string }) => f.name === "diagram.jpg")) {
            try {
              await idbfs.writeFile(diagramPath, diagramBuf, { mimeType: "image/jpeg" });
            } catch (e) {
              if (!String(e).includes("already exists")) throw e;
            }
          }
        }

        if (cancelled) return;
        // Choose an initial file to open without assuming main.tex exists.
        async function findFirstTextFile(dir: string): Promise<string | null> {
          const { dirs, files } = await idbfs.readdir(dir);
          for (const f of files) {
            const full = dir === "/" ? `/${f.name}` : `${dir}/${f.name}`;
            if (!isBinaryPath(full) && f.name !== ".antiprism_imported") return full;
          }
          for (const d of dirs) {
            const sub = dir === "/" ? `/${d.name}` : `${dir}/${d.name}`;
            const found = await findFirstTextFile(sub);
            if (found) return found;
          }
          return null;
        }

        let initialPath: string | null = null;
        if (await idbfs.exists(mainPath).catch(() => false)) initialPath = mainPath;
        else if (await idbfs.exists(mainTypPath).catch(() => false)) initialPath = mainTypPath;
        else initialPath = await findFirstTextFile(basePath).catch(() => null);

        if (initialPath) {
          // Load initial file into the shared editor buffer
          try {
            const data = await idbfs.readFile(initialPath);
            const content = typeof data === "string" ? data : new TextDecoder().decode(data as ArrayBuffer);
            if (text.length === 0 && content?.length > 0) text.insert(0, content);
            textContentCacheRef.current.set(initialPath, content ?? "");
          } catch {
            // ignore
          }

          setOpenTabs([{ path: initialPath, type: "text" }]);
          setActiveTabPath(initialPath);
          setCurrentPath(initialPath);
        } else {
          setOpenTabs([]);
          setActiveTabPath("");
          setCurrentPath("");
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
    ensureTypstReady()
      .then(() => setTypstReady(true))
      .catch((e) => console.warn("Typst WASM init failed:", e));
  }, []);

  const onYtextChangeNoop = useCallback(() => {}, []);

  // Lazily create / recreate the buffer manager when ytext changes
  const getBufferMgr = useCallback((): EditorBufferManager | null => {
    if (!ytext) return null;
    if (!bufferMgrRef.current) {
      bufferMgrRef.current = new EditorBufferManager(
        {
          get: () => ytext.toString(),
          set: (c: string) => { ytext.delete(0, ytext.length); ytext.insert(0, c || ""); },
        },
        activeTabPathRef.current
      );
    }
    return bufferMgrRef.current;
  }, [ytext]);

  // Generate summary content from current document
  const generateSummary = useCallback(async () => {
    const activeTab = openTabs.find((t) => t.path === activeTabPath);
    console.log('[summary] activeTab:', activeTab, 'activeTabPath:', activeTabPath);
    
    if (activeTab?.type === "text") {
      const bufferMgr = getBufferMgr();
      console.log('[summary] buffer manager exists:', !!bufferMgr);
      
      if (bufferMgr) {
        // Ensure current buffer is saved to cache before retrieving
        bufferMgr.saveActiveToCache();
        
        // Try to get content from cache first, then from buffer
        let content = bufferMgr.getCachedContent(activeTabPath);
        console.log('[summary] cached content length:', content?.length || 0);
        
        if (!content || content.trim() === '') {
          content = bufferMgr.getBufferContent();
          console.log('[summary] buffer content length:', content?.length || 0);
        }
        
        console.log('[summary] final content length:', content?.length || 0);
        console.log('[summary] content preview:', content?.substring(0, 100) || 'empty');
        
        if (content && content.trim()) {
          const isTex = activeTabPath.endsWith('.tex');
          const isTyp = activeTabPath.endsWith('.typ');
          
          if (isTex) {
            try {
              // Use TexCount for accurate LaTeX statistics
              const { rawOutput } = await countLaTeXWords(content);
              
              // Display raw TexCount output directly
              return `${rawOutput}

File Information
===============
Path: ${activeTabPath}
Type: LaTeX
Characters: ${content.length}
Lines: ${content.split('\n').length}
Last modified: ${new Date().toLocaleString()}`;
            } catch (error) {
              console.error('[summary] TexCount error:', error);
              return `Error generating summary
=========================

Failed to analyze document with TexCount.
Please check the console for details.

Path: ${activeTabPath}
Type: LaTeX
Characters: ${content.length}
Lines: ${content.split('\n').length}
Last modified: ${new Date().toLocaleString()}

Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
            }
          } else if (isTyp) {
            // For Typst, provide basic info without detailed statistics
            return `Document Statistics
================

Words: ${content.split(/\s+/).filter(Boolean).length}
Characters: ${content.length}
Lines: ${content.split('\n').length}

File Information
===============

Path: ${activeTabPath}
Type: Typst
Last modified: ${new Date().toLocaleString()}

Note: Detailed statistics are only available for LaTeX files.
TexCount (WebPerl WASM) does not support Typst yet.`;
          }
        }
      }
    }
    return `No active text document
=======================

Active tab: ${activeTab?.type || 'none'}
Path: ${activeTabPath || 'none'}
Available tabs: ${openTabs.map(t => `${t.path} (${t.type})`).join(', ')}

YText exists: ${!!ytext}
Buffer manager exists: ${!!getBufferMgr()}`;
  }, [openTabs, activeTabPath, getBufferMgr, ytext]);

  // Handle document formatting
  const handleFormatDocument = useCallback(async () => {
    const activeTab = openTabs.find((t) => t.path === activeTabPath);
    if (!activeTab || activeTab.type !== "text" || !activeTabPath.endsWith('.tex')) {
      return;
    }

    const bufferMgr = getBufferMgr();
    if (!bufferMgr) return;

    setIsFormatting(true);
    try {
      // Get current content
      bufferMgr.saveActiveToCache();
      let content = bufferMgr.getCachedContent(activeTabPath);
      if (!content) {
        content = bufferMgr.getBufferContent();
      }

      if (!content || !content.trim()) {
        return;
      }

      // Format the document
      const formattedContent = await formatLaTeX(content, {
        wrap: true,
        wraplen: 80,
        tabsize: editorTabSize,
        usetabs: false,
      });

      // Update the buffer with formatted content
      if (ytext) {
        ytext.delete(0, ytext.length);
        ytext.insert(0, formattedContent);
      }

      // Update cache
      bufferMgr.saveActiveToCache();

      console.log('[format] Document formatted successfully');
    } catch (error) {
      console.error('[format] Error formatting document:', error);
    } finally {
      setIsFormatting(false);
    }
  }, [openTabs, activeTabPath, getBufferMgr, ytext]);

  // Keyboard shortcuts
  useKeyboardShortcuts([
    { metaKey: true, key: "b", action: () => setSidebarWidth((w) => w > 0 ? 0 : 256) },
    { metaKey: true, shiftKey: true, key: "t", action: () => setToolsPanelOpen((o) => !o) },
    { metaKey: true, shiftKey: true, key: "f", action: () => handleFormatDocument() },
    { metaKey: true, key: "1", action: () => setSidebarTab("files") },
    { metaKey: true, key: "2", action: () => setSidebarTab("chats") },
    { metaKey: true, key: "3", action: () => setSidebarTab("git") },
  ]);

  // Update summary when active tab changes
  useEffect(() => {
    const updateSummary = async () => {
      const summary = await generateSummary();
      setSummaryContent(summary);
    };
    updateSummary();
  }, [generateSummary]);

  const saveActiveTextToCache = useCallback(() => {
    const mgr = getBufferMgr();
    if (mgr) {
      mgr.saveActiveToCache();
      // Sync cache ref so legacy readers still work
      textContentCacheRef.current = mgr.getCache();
    }
  }, [getBufferMgr]);

  const loadTextIntoEditor = useCallback(
    (path: string, content: string) => {
      if (!ytext) return;
      ytext.delete(0, ytext.length);
      ytext.insert(0, content || "");
    },
    [ytext]
  );

  /** Resolve the text content for a file from cache or filesystem. */
  const resolveFileContent = useCallback(
    async (path: string): Promise<string> => {
      const mgr = getBufferMgr();
      const cached = mgr?.getCachedContent(path) ?? textContentCacheRef.current.get(path);
      if (cached !== undefined) return cached;
      if (!fs) return "";
      try {
        const data = await fs.readFile(path);
        return typeof data === "string" ? data : new TextDecoder().decode(data as ArrayBuffer);
      } catch {
        return "";
      }
    },
    [fs, getBufferMgr]
  );

  const handleFileSelect = useCallback(
    async (path: string) => {
      if (!fs || !ytext) return;
      const mgr = getBufferMgr();

      const stat = await fs.stat(path).catch(() => null);
      if (stat?.isDirectory) {
        setCurrentPath(path);
        setAddTargetPath(path);
        return;
      }

      setCurrentPath(path);
      const parentDir = path.substring(0, path.lastIndexOf("/")) || "/";
      setAddTargetPath(parentDir.startsWith(basePath) ? parentDir : basePath);
      const isBinary = isBinaryPath(path);
      const existingIdx = openTabs.findIndex((t) => t.path === path);

      if (existingIdx >= 0) {
        if (isBinary) {
          if (mgr) mgr.switchToImage(path);
          else saveActiveTextToCache();
        } else {
          const content = await resolveFileContent(path);
          if (mgr) { mgr.switchTo(path, content); } else { saveActiveTextToCache(); loadTextIntoEditor(path, content); }
        }
        setActiveTabPath(path);
        setCurrentPath(path);
        return;
      }

      // New tab
      if (isBinary) {
        if (mgr) mgr.switchToImage(path);
        else saveActiveTextToCache();
        try {
          const data = await fs.readFile(path);
          const blob = data instanceof ArrayBuffer ? new Blob([data]) : new Blob([data]);
          const url = URL.createObjectURL(blob);
          setImageUrlCache((prev) => { const next = new Map(prev); next.set(path, url); return next; });
          setOpenTabs((t) => [...t, { path, type: "image" }]);
          setActiveTabPath(path);
          setCurrentPath(path);
        } catch (e) {
          console.error("Failed to load binary file:", e);
        }
      } else {
        const content = await resolveFileContent(path);
        if (mgr) { mgr.switchTo(path, content); } else { saveActiveTextToCache(); loadTextIntoEditor(path, content); }
        setOpenTabs((t) => [...t, { path, type: "text" }]);
        setActiveTabPath(path);
        setCurrentPath(path);
      }
    },
    [fs, ytext, openTabs, basePath, getBufferMgr, saveActiveTextToCache, loadTextIntoEditor, resolveFileContent]
  );

  const handleTabSelect = useCallback(
    async (path: string) => {
      if (path === activeTabPath) return;
      const tab = openTabs.find((t) => t.path === path);
      if (!tab) return;

      if (tab.type === "settings" || tab.type === "chat") {
        setActiveTabPath(path);
        return;
      }

      if (!fs || !ytext) return;
      const mgr = getBufferMgr();

      setCurrentPath(path);
      const parentDir = path.substring(0, path.lastIndexOf("/")) || "/";
      setAddTargetPath(parentDir.startsWith(basePath) ? parentDir : basePath);
      if (tab.type === "image") {
        if (mgr) mgr.switchToImage(path);
        else saveActiveTextToCache();
        setActiveTabPath(path);
      } else {
        const content = await resolveFileContent(path);
        if (mgr) { mgr.switchTo(path, content); } else { saveActiveTextToCache(); loadTextIntoEditor(path, content); }
        setActiveTabPath(path);
      }
    },
    [fs, ytext, openTabs, activeTabPath, basePath, getBufferMgr, saveActiveTextToCache, loadTextIntoEditor, resolveFileContent]
  );

  const handleTabClose = useCallback(
    async (path: string) => {
      const mgr = getBufferMgr();

      const idx = openTabs.findIndex((t) => t.path === path);
      if (idx < 0) return;

      if (path === activeTabPath) {
        const remaining = openTabs.filter((t) => t.path !== path);
        const nextActive = remaining[idx] ?? remaining[idx - 1] ?? null;
        if (nextActive) {
          if (nextActive.type === "settings" || nextActive.type === "chat") {
            setActiveTabPath(nextActive.path);
            setOpenTabs(remaining);
          } else if (nextActive.type === "text" && ytext && fs) {
            const content = await resolveFileContent(nextActive.path);
            if (mgr) { mgr.switchTo(nextActive.path, content); } else { saveActiveTextToCache(); loadTextIntoEditor(nextActive.path, content); }
            setActiveTabPath(nextActive.path);
            setCurrentPath(nextActive.path);
            setOpenTabs(remaining);
          } else {
            if (mgr) mgr.switchToImage(nextActive.path);
            else saveActiveTextToCache();
            setActiveTabPath(nextActive.path);
            setCurrentPath(nextActive.path);
            setOpenTabs(remaining);
          }
        } else {
          saveActiveTextToCache();
          setActiveTabPath("");
          setCurrentPath("");
          setOpenTabs(remaining);
        }
      } else {
        setOpenTabs((t) => t.filter((x) => x.path !== path));
      }

      if (isBinaryPath(path)) {
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
    [openTabs, activeTabPath, ytext, fs, imageUrlCache, getBufferMgr, saveActiveTextToCache, loadTextIntoEditor, resolveFileContent]
  );

  const handleFileDeleted = useCallback(
    async (path: string, isFolder: boolean) => {
      const mgr = getBufferMgr();
      const pathsToClose = isFolder
        ? openTabs.filter(
            (t) => t.path === path || t.path.startsWith(path + "/")
          ).map((t) => t.path)
        : [path];
      if (pathsToClose.length === 0) return;
      const remaining = openTabs.filter((t) => !pathsToClose.includes(t.path));
      const activeWasClosed = pathsToClose.includes(activeTabPath);
      setOpenTabs(remaining);
      if (activeWasClosed) {
        const nextActive = remaining[0] ?? null;
        if (nextActive) {
          if (nextActive.type === "text") {
            const content = await resolveFileContent(nextActive.path);
            if (mgr) { mgr.switchTo(nextActive.path, content); } else { saveActiveTextToCache(); loadTextIntoEditor(nextActive.path, content); }
          } else {
            if (mgr) mgr.switchToImage(nextActive.path);
            else saveActiveTextToCache();
          }
          setActiveTabPath(nextActive.path);
          setCurrentPath(nextActive.path);
        } else {
          saveActiveTextToCache();
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
        if (isBinaryPath(p)) {
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
    [openTabs, activeTabPath, currentPath, basePath, fs, ytext, imageUrlCache, getBufferMgr, saveActiveTextToCache, loadTextIntoEditor, resolveFileContent]
  );

  const handleCompile = async () => {
    if (!compilerReady || !ytext || !fs) return;
    const fsInstance = fs;
    const currentActivePath = activeTabPathRef.current;

    // Only compile when the active tab is an actual LaTeX or Typst source file.
    // Avoid falling back to LaTeX when there is no active file (or a non-document tab is active).
    const activeLower = currentActivePath.toLowerCase();
    const activeIsTypst = activeLower.endsWith(".typ");
    const activeIsTex = activeLower.endsWith(".tex");
    if (!currentActivePath || (!activeIsTypst && !activeIsTex)) return;

    const activeTab = openTabs.find((t) => t.path === currentActivePath);
    if (activeTab?.type === "text" && currentActivePath) {
      try {
        // idbfs writeFile is create-only; remove first so we can overwrite
        await fsInstance.rm(currentActivePath).catch(() => {});
        await fsInstance.writeFile(
          currentActivePath,
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
      // Compile the active source buffer (no implicit "main.tex" fallback).
      const latex = activeIsTex ? ytext.toString() : "";
      const typSourceActive = activeIsTypst ? ytext.toString() : "";
      if (activeIsTex && !latex.trim()) return;
      if (activeIsTypst && !typSourceActive.trim()) return;

      const additionalFiles: { path: string; content: string | Uint8Array }[] = [];
      let mainTypContent: string | null = null;

      async function gatherFiles(dir: string) {
        const { dirs, files } = await fsInstance.readdir(dir);
        for (const f of files) {
          const relPath = dir === basePath ? f.name : `${dir.replace(basePath + "/", "")}/${f.name}`;
          if (relPath === "main.tex") continue;
          if (relPath === "main.typ") {
            try {
              const fullPath = dir === "/" ? `/${f.name}` : `${dir}/${f.name}`;
              const data = await fsInstance.readFile(fullPath);
              mainTypContent =
                typeof data === "string" ? data : new TextDecoder().decode(data as ArrayBuffer);
            } catch {
              // skip
            }
            continue;
          }
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

      if (mainTypContent == null) {
        const mainTypTab = openTabs.find((t) => t.type === "text" && t.path.endsWith("main.typ"));
        if (mainTypTab)
          mainTypContent =
            currentActivePath === mainTypTab.path
              ? ytext.toString()
              : textContentCacheRef.current.get(mainTypTab.path) ?? "";
      }

      // Choose compiler by active tab: .typ → Typst, .tex → LaTeX
      const typSource = activeIsTypst ? typSourceActive : mainTypContent;
      const useTypst = activeIsTypst && (typSource != null && typSource.trim() !== "");

      async function compileLatexWithFallback() {
        // Try the user's selected engine first, then fall back to the others on ANY failure.
        const preferred = latexEngine;
        const engines: LaTeXEngine[] = ["xetex", "luatex", "pdftex"];
        const order: LaTeXEngine[] = [preferred, ...engines.filter((e) => e !== preferred)];
        let lastErr: unknown = null;
        for (const eng of order) {
          try {
            if (eng !== preferred) console.warn(`LaTeX compile failed. Retrying with ${eng}…`);
            return await compileLatexToPdf(latex, additionalFiles, eng);
          } catch (e) {
            lastErr = e;
          }
        }
        throw lastErr ?? new Error("LaTeX compile failed");
      }

      const pdfBlob = useTypst
        ? await compileTypstToPdf(typSource!, additionalFiles)
        : await compileLatexWithFallback();
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
    handleCompileRef.current = handleCompile;
    return () => {
      handleCompileRef.current = null;
    };
  }, [handleCompile]);

  useEffect(() => {
    if (compilerReady && ytext && fs && !autoCompileDoneRef.current && !isCompiling) {
      autoCompileDoneRef.current = true;
      void handleCompile();
    }
  }, [compilerReady, ytext, fs, isCompiling, handleCompile]);

  useEffect(() => {
    isCompilingRef.current = isCompiling;
  }, [isCompiling]);

  useEffect(() => {
    if (!autoCompileOnChange || !ytext || !compilerReady || !fs) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const observer = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        if (!isCompilingRef.current) handleCompileRef.current?.();
      }, autoCompileDebounceMs);
    };
    ytext.observe(observer);
    return () => {
      ytext.unobserve(observer);
      if (timer) clearTimeout(timer);
    };
  }, [autoCompileOnChange, autoCompileDebounceMs, ytext, compilerReady, fs]);

  const getCurrentChatContext = () => {
    const activeTab = openTabs.find((t) => t.path === activeTabPath);
    return activeTab?.type === "chat" ? "big" : "small";
  };

  const handleSendChat = async () => {
    if (!chatInput.trim()) return;
    const userMessage = chatInput.trim();
    const chatContext = getCurrentChatContext();
    
    // Check if model is loaded, if not, load it first
    if (!modelReady || isModelLoading()) {
      console.log("🔄 Model not ready, loading before sending message...");
      try {
        await initializeModel();
        setModelReady(true);
        console.log("✅ Model loaded successfully");
      } catch (error) {
        console.error("❌ Failed to load model:", error);
        // Add error message to chat
        const errorMessage = { role: "assistant" as const, content: "Error: Failed to load model. Please try again." };
        if (chatContext === "big") {
          setBigChatMessages((msgs) => [...msgs, { role: "user", content: userMessage }, errorMessage]);
        } else {
          setSmallChatMessages((msgs) => [...msgs, { role: "user", content: userMessage }, errorMessage]);
        }
        setChatInput("");
        return;
      }
    }
    
    if (chatContext === "big") {
      setBigChatMessages((msgs) => [...msgs, { role: "user", content: userMessage }, { role: "assistant", content: "Thinking..." }]);
    } else {
      setSmallChatMessages((msgs) => [...msgs, { role: "user", content: userMessage }, { role: "assistant", content: "Thinking..." }]);
    }
    
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
            const chatContext = getCurrentChatContext();
            const setMessages = chatContext === "big" ? setBigChatMessages : setSmallChatMessages;
            setMessages((msgs: any) => {
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
        (getCurrentChatContext() === "big" ? bigChatMessages : smallChatMessages).map((m: any) => ({
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

      const chatContext = getCurrentChatContext();
      const setMessages = chatContext === "big" ? setBigChatMessages : setSmallChatMessages;
      setMessages((msgs: any) => {
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
      const chatContext = getCurrentChatContext();
      const setMessages = chatContext === "big" ? setBigChatMessages : setSmallChatMessages;
      setMessages((msgs: any) => {
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
      // Persist chat messages to localStorage
      const activeTab = openTabs.find((t) => t.path === activeTabPath);
      if (activeTab?.type === "chat") {
        // Big chat
        const chatId = activeTab.path.replace("/ai-chat/", "");
        setBigChatMessages((msgs: any) => {
          saveChatMessages(chatId, msgs, "big");
          return msgs;
        });
      } else if (activeTab?.type === "text") {
        // Small chat
        setSmallChatMessages((msgs: any) => {
          saveChatMessages("", msgs, "small");
          return msgs;
        });
      }
    }
  };

  if (initError) {
    return (
      <div className="h-screen flex flex-col items-center justify-center p-8 gap-4">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-semibold text-red-400 mb-2">Initialization Error</h1>
          <p className="text-[var(--muted)] text-sm mb-4">{initError}</p>
          <p className="text-[var(--muted)] text-xs">Ensure you have a modern browser with WebGPU support.</p>
        </div>
        <Link href="/" className="text-sm text-[var(--accent)] hover:underline">
          ← Back to Dashboard
        </Link>
      </div>
    );
  }

  const handleShare = () => {
    if (typeof window === "undefined") return;
    navigator.clipboard?.writeText(window.location.href);
  };

  const openOrSelectSettingsTab = useCallback(() => {
    const has = openTabs.some((t) => t.path === SETTINGS_TAB_PATH);
    if (has) {
      setActiveTabPath(SETTINGS_TAB_PATH);
    } else {
      setOpenTabs((t) => [...t, { path: SETTINGS_TAB_PATH, type: "settings" as const }]);
      setActiveTabPath(SETTINGS_TAB_PATH);
    }
  }, [openTabs]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[var(--background)] text-[var(--foreground)]">
      <aside style={{ width: sidebarWidth, minWidth: sidebarWidth > 0 ? 180 : 0, maxWidth: 480, transition: "width 0.15s ease-out" }} className="border-r border-[var(--border)] flex flex-col min-h-0 bg-[var(--background)] shrink-0 overflow-hidden">
        <div className="h-12 flex items-center justify-between gap-2 px-3 border-b border-[var(--border)] shrink-0">
          <Link href="/" className="text-xs text-[var(--muted)] hover:text-[var(--foreground)] truncate min-w-0">
            ← Dashboard
          </Link>
          <button
            onClick={openOrSelectSettingsTab}
            className="shrink-0 text-[var(--muted)] hover:text-[var(--foreground)] p-1.5 rounded hover:bg-[color-mix(in_srgb,var(--border)_45%,transparent)] transition-colors"
            title="Settings"
          >
            <IconSettings />
          </button>
        </div>
        <div className="px-3 py-2 border-b border-[var(--border)] shrink-0 space-y-2">
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
              className="shrink-0 text-[var(--muted)] hover:text-[var(--foreground)] p-1.5 rounded hover:bg-[color-mix(in_srgb,var(--border)_45%,transparent)] transition-colors"
              title="Share"
            >
              <IconShare2 />
            </button>
          </div>
          <div className="flex items-center justify-between gap-2">
            <div className="flex rounded bg-[color-mix(in_srgb,var(--border)_22%,transparent)] border border-[var(--border)] overflow-hidden shrink-0">
              <button
                onClick={() => setSidebarTab("files")}
                className={`px-2 py-1.5 text-xs font-medium transition-colors ${sidebarTab === "files" ? "bg-[color-mix(in_srgb,var(--border)_55%,transparent)] text-[var(--foreground)]" : "text-[var(--muted)] hover:text-[var(--foreground)]"}`}
              >
                Files
              </button>
              <button
                onClick={() => setSidebarTab("chats")}
                className={`px-2 py-1.5 text-xs font-medium transition-colors ${sidebarTab === "chats" ? "bg-[color-mix(in_srgb,var(--border)_55%,transparent)] text-[var(--foreground)]" : "text-[var(--muted)] hover:text-[var(--foreground)]"}`}
              >
                Chats
              </button>
              <button
                onClick={() => setSidebarTab("git")}
                className={`px-2 py-1.5 text-xs font-medium transition-colors ${sidebarTab === "git" ? "bg-[color-mix(in_srgb,var(--border)_55%,transparent)] text-[var(--foreground)]" : "text-[var(--muted)] hover:text-[var(--foreground)]"}`}
              >
                Git
              </button>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {sidebarTab === "files" && (
                <>
                  <button
                    onClick={() => setSearchOpen((o) => !o)}
                    className={`w-7 h-7 rounded flex items-center justify-center ${searchOpen ? "bg-[color-mix(in_srgb,var(--border)_55%,transparent)] text-[var(--foreground)]" : "text-[var(--muted)] hover:bg-[color-mix(in_srgb,var(--border)_45%,transparent)] hover:text-[var(--foreground)]"}`}
                    title="Search"
                  >
                    <IconSearch />
                  </button>
                  <FileActions fs={fs} basePath={addTargetPath} onAction={() => setRefreshTrigger((t) => t + 1)} />
                </>
              )}
              {sidebarTab === "chats" && (
                <>
                  <button
                    onClick={() => setSearchOpen((o) => !o)}
                    className={`w-7 h-7 rounded flex items-center justify-center ${searchOpen ? "bg-[color-mix(in_srgb,var(--border)_55%,transparent)] text-[var(--foreground)]" : "text-[var(--muted)] hover:bg-[color-mix(in_srgb,var(--border)_45%,transparent)] hover:text-[var(--foreground)]"}`}
                    title="Search chats"
                  >
                    <IconSearch />
                  </button>
                  <button
                    onClick={() => {
                      console.log("➕ Creating new chat with model:", selectedModelId);
                      const chat = createChat(selectedModelId);
                      console.log("➕ Chat created:", chat);
                      const chatPath = `/ai-chat/${chat.id}`;
                      setOpenTabs((t) => [...t, { path: chatPath, type: "chat" }]);
                      setActiveTabPath(chatPath);
                      setRefreshTrigger((t) => t + 1); // Refresh ChatTree
                      console.log("➕ Refresh trigger updated for ChatTree");
                    }}
                    className="w-7 h-7 rounded bg-[color-mix(in_srgb,var(--border)_22%,transparent)] hover:bg-[color-mix(in_srgb,var(--border)_45%,transparent)] text-[var(--foreground)] flex items-center justify-center"
                    title="New chat"
                  >
                    <IconPlus />
                  </button>
                </>
              )}
            </div>
          </div>
          {(sidebarTab === "files" && searchOpen) && (
            <input
              type="text"
              placeholder="Search files…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-2 py-1.5 text-xs rounded bg-[color-mix(in_srgb,var(--border)_22%,transparent)] border border-[var(--border)] text-[var(--foreground)] placeholder-[var(--muted)] focus:outline-none focus:ring-1 focus:ring-[color-mix(in_srgb,var(--accent)_55%,transparent)]"
              autoFocus
            />
          )}
          {(sidebarTab === "chats" && searchOpen) && (
            <input
              type="text"
              placeholder="Search chats…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-2 py-1.5 text-xs rounded bg-[color-mix(in_srgb,var(--border)_22%,transparent)] border border-[var(--border)] text-[var(--foreground)] placeholder-[var(--muted)] focus:outline-none focus:ring-1 focus:ring-[color-mix(in_srgb,var(--accent)_55%,transparent)]"
              autoFocus
            />
          )}
        </div>
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
          {sidebarTab === "files" && (
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
          )}
          {sidebarTab === "chats" && (
            <ChatTree
              onChatSelect={(chatId) => {
                const chatPath = `/ai-chat/${chatId}`;
                if (!openTabs.find((t) => t.path === chatPath)) {
                  setOpenTabs((t) => [...t, { path: chatPath, type: "chat" }]);
                }
                setActiveTabPath(chatPath);
              }}
              refreshTrigger={refreshTrigger}
              onRefresh={() => {
                setRefreshTrigger((t) => t + 1);
              }}
              searchQuery={searchQuery}
            />
          )}
          {sidebarTab === "git" && (
            <GitPanel
              filePaths={openTabs.filter(t => t.type === "text").map(t => t.path)}
              currentPath={activeTabPath}
            />
          )}
        </div>
        
        {/* Resizable divider for outline */}
        <ResizableDivider 
          direction="vertical" 
          onResize={(d) => setOutlineHeight((h) => Math.max(80, Math.min(400, h - d)))}
          onDoubleClick={() => setOutlineHeight((h) => h > 80 ? 80 : 400)}
        />
        
        {/* Document outline at bottom */}
        <div className="border-t border-[var(--border)] flex flex-col" style={{ height: outlineHeight, minHeight: 80, maxHeight: 400 }}>
          <div className="px-3 py-2 flex items-center gap-2 shrink-0">
            <IconBookOpen />
            <span className="text-xs font-medium text-[var(--foreground)]">Outline</span>
            <div className="flex-1" />
            <button
              onClick={() => setOutlineHeight((h) => h > 80 ? 80 : 400)}
              className="text-[var(--muted)] hover:text-[var(--foreground)] p-1 rounded hover:bg-[color-mix(in_srgb,var(--border)_45%,transparent)] transition-colors"
              title={outlineHeight > 80 ? "Collapse outline" : "Expand outline"}
            >
              {outlineHeight > 80 ? <IconChevronDown /> : <IconChevronUp />}
            </button>
          </div>
          <div className="flex-1 overflow-auto min-h-0 py-1">
            {(() => {
              // Use summary content for outline since it contains the section structure
              const summaryContentForOutline = summaryContent || "";
              const entries = summaryContentForOutline ? parseOutline(summaryContentForOutline, activeTabPath) : [];
              if (entries.length === 0) {
                return (
                  <div className="p-3 text-[var(--muted)] italic text-sm">
                    {summaryContentForOutline ? "No sections found in document" : "Open a document to see its outline"}
                  </div>
                );
              }
              const minLevel = Math.min(...entries.map((e) => e.level));
              return entries.map((entry, i) => (
                <button
                  key={i}
                  onClick={() => {
                    // For summary-based outline, we can't jump to line numbers
                    // But we could search for the section in the document
                    if (entry.line > 0) {
                      editorRef.current?.gotoLine(entry.line);
                    }
                  }}
                  className="w-full text-left px-3 py-2 cursor-pointer text-sm flex items-center gap-2 min-w-0 transition-colors hover:bg-[color-mix(in_srgb,var(--border)_45%,transparent)]"
                  style={{ paddingLeft: `${(entry.level - minLevel) * 12 + 12}px` }}
                  title={entry.line > 0 ? `Line ${entry.line}` : entry.title}
                >
                  <span className="shrink-0 flex items-center text-[var(--muted)]">
                    <IconChevronRight />
                  </span>
                  <span className="truncate min-w-0 text-[var(--foreground)]">{entry.title}</span>
                  {entry.line > 0 && (
                    <span className="ml-auto text-[10px] text-[var(--muted)] tabular-nums shrink-0">L{entry.line}</span>
                  )}
                </button>
              ));
            })()}
          </div>
        </div>
      </aside>
      <ResizableDivider direction="horizontal" onResize={(d) => setSidebarWidth((w) => Math.max(180, Math.min(480, w + d)))} onDoubleClick={() => setSidebarWidth((w) => w > 0 ? 0 : 256)} />
      <main className="flex-1 flex min-w-0 min-h-0">
        {(() => {
          const activeTab = openTabs.find((t) => t.path === activeTabPath);
          const showAIPanel = activeTab?.type === "text" && ydoc && ytext && provider;
          return (
            <section style={{ flex: `${editorFraction} 1 0%` }} className="flex flex-col border-r border-[var(--border)] min-w-0 min-h-0 overflow-hidden">
              <FileTabs
                tabs={openTabs}
                activePath={activeTabPath}
                onSelect={handleTabSelect}
                onClose={handleTabClose}
                onToggleTools={() => setToolsPanelOpen(!toolsPanelOpen)}
              />
              <div className="flex-1 relative min-h-0 overflow-hidden">
                {(() => {
                  if (activeTab?.type === "settings") {
                    return (
                      <div className="absolute inset-0 overflow-auto bg-[var(--background)]">
                        <SettingsPanel
                          latexEngine={latexEngine}
                          editorFontSize={editorFontSize}
                          editorTabSize={editorTabSize}
                          editorLineWrapping={editorLineWrapping}
                          autoCompileOnChange={autoCompileOnChange}
                          autoCompileDebounceMs={autoCompileDebounceMs}
                          aiMaxNewTokens={aiMaxNewTokens}
                          aiTemperature={aiTemperature}
                          aiTopP={aiTopP}
                          promptAsk={promptAsk}
                          promptCreate={promptCreate}
                          theme={theme}
                          onThemeChange={setTheme}
                          onLatexEngineChange={setLatexEngineState}
                          onEditorFontSizeChange={setEditorFontSizeState}
                          onEditorTabSizeChange={setEditorTabSizeState}
                          onEditorLineWrappingChange={setEditorLineWrappingState}
                          onAutoCompileOnChangeChange={setAutoCompileOnChangeState}
                          onAutoCompileDebounceMsChange={setAutoCompileDebounceMsState}
                          onAiMaxNewTokensChange={setAiMaxNewTokensState}
                          onAiTemperatureChange={setAiTemperatureState}
                          onAiTopPChange={setAiTopPState}
                          onPromptAskChange={setPromptAskState}
                          onPromptCreateChange={setPromptCreateState}
                          onResetRequested={() => {
                            setLatexEngineState(getLatexEngine());
                            setEditorFontSizeState(getEditorFontSize());
                            setEditorTabSizeState(getEditorTabSize());
                            setEditorLineWrappingState(getEditorLineWrapping());
                            setAutoCompileOnChangeState(getAutoCompileOnChange());
                            setAutoCompileDebounceMsState(getAutoCompileDebounceMs());
                            setAiMaxNewTokensState(getAiMaxNewTokens());
                            setAiTemperatureState(getAiTemperature());
                            setAiTopPState(getAiTopP());
                            setPromptAskState(getPromptAsk());
                            setPromptCreateState(getPromptCreate());
                          }}
                        />
                      </div>
                    );
                  }
                  if (activeTab?.type === "image") {
                    if (activeTabPath.endsWith(".pdf")) {
                      const pdfBlobUrl = imageUrlCache.get(activeTabPath) ?? null;
                      return pdfBlobUrl ? (
                        <PdfPreview pdfUrl={pdfBlobUrl} onCompile={() => {}} isCompiling={false} />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-[var(--muted)] bg-[var(--background)]">
                          Loading PDF…
                        </div>
                      );
                    }
                    return (
                      <ImageViewer
                        imageUrl={imageUrlCache.get(activeTabPath) ?? null}
                        alt={activeTabPath.split("/").pop() ?? "Image"}
                      />
                    );
                  }
                  if (activeTab?.type === "chat") {
                    const mdClasses = "prose prose-sm max-w-none prose-headings:text-[var(--foreground)] prose-p:text-[var(--foreground)] prose-li:text-[var(--foreground)] prose-strong:text-[var(--foreground)] prose-code:text-[var(--foreground)] prose-pre:bg-[color-mix(in_srgb,var(--border)_35%,transparent)] prose-pre:text-[var(--foreground)] prose-a:text-[var(--accent)] [&_p]:my-1.5 [&_ul]:my-1.5 [&_ol]:my-1.5 [&_li]:my-0.5";
                    // Use big chat messages from state
                    const msgs = bigChatMessages;

                    return (
                      <div className="absolute inset-0 flex flex-col bg-[var(--background)]">
                        {/* Messages Area */}
                        <div
                          ref={chatScrollRef}
                          className="flex-1 overflow-y-auto"
                        >
                          {msgs.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-[var(--muted)] px-6">
                              <p className="text-sm">Send a message to start chatting.</p>
                            </div>
                          ) : (
                            <div className="px-4 py-3 space-y-3">
                              {msgs.map((m: any, i: number) => (
                                <BigChatMessage 
                                  key={i}
                                  message={m}
                                  isLast={i === msgs.length - 1}
                                  lastMessageRef={lastMessageRef as React.RefObject<HTMLPreElement>}
                                />
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Bottom bar: status + input */}
                        <div className="shrink-0 border-t border-[var(--border)]">
                          <ChatTelemetry streamingStats={streamingStats} isGenerating={isGenerating} />
                          <ChatInput
                            chatInput={chatInput}
                            setChatInput={setChatInput}
                            chatMode={chatMode}
                            setChatMode={setChatMode}
                            isGenerating={isGenerating}
                            onSend={handleSendChat}
                            selectedModelId={selectedModelId}
                            onModelChange={async (id) => {
                              setSelectedModelId(id);
                              setModelReady(false);
                              await switchModel(id);
                            }}
                          />
                        </div>
                      </div>
                    );
                  }
                  if (activeTab?.type === "text" && ydoc && ytext && provider) {
                    const aiOverlayHeight = chatExpanded ? "45%" : "155px";
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
                          fontSize={editorFontSize}
                          tabSize={editorTabSize}
                          lineWrapping={editorLineWrapping}
                          theme={theme}
                        />
                        {/* Floating format button for LaTeX files */}
                        {handleFormatDocument && activeTabPath.endsWith('.tex') && (
                          <button
                            onClick={handleFormatDocument}
                            disabled={isFormatting}
                            className="absolute bottom-4 right-4 w-10 h-10 bg-[var(--accent)] text-white rounded-full shadow-lg hover:bg-[var(--accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center z-10"
                            title="Format document"
                          >
                            {isFormatting ? (
                              <div className="w-4 h-4 border border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5a2.121 2.121 0 0 1 0-3Z"/>
                              </svg>
                            )}
                          </button>
                        )}
                      </div>
                    );
                  }
                  if (!ydoc || !ytext || !provider) {
                    return (
                      <div className="absolute inset-0 flex items-center justify-center text-[var(--muted)] bg-[var(--background)]">
                        Loading editor…
                      </div>
                    );
                  }
                  return (
                    <div className="absolute inset-0 flex items-center justify-center text-[var(--muted)] text-sm bg-[var(--background)]">
                      Open a file to get started
                    </div>
                  );
                })()}
                {showAIPanel && (
                  <div
                    className={`absolute bottom-0 left-0 right-0 flex flex-col bg-[var(--background)] border-t border-[var(--border)] transition-[height] duration-200 ease-out overflow-hidden ${
                      chatExpanded ? "h-[45%]" : "h-[155px]"
                    }`}
                  >
                    <div className="flex items-center justify-end gap-1 shrink-0 px-1 py-1">
                      <button
                        onClick={() => {
                          const activeTab = openTabs.find((t) => t.path === activeTabPath);
                          if (activeTab?.type === "chat") {
                            // Big chat
                            const chatId = activeTab.path.replace("/ai-chat/", "");
                            setBigChatMessages([]);
                            saveChatMessages(chatId, [], "big");
                          } else {
                            // Small chat
                            setSmallChatMessages([]);
                            saveChatMessages("", [], "small");
                          }
                          // Don't reset streamingStats to null so telemetry remains visible
                        }}
                        className="w-7 h-7 rounded flex items-center justify-center text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[color-mix(in_srgb,var(--border)_45%,transparent)] transition-colors"
                        title="Clear chat"
                      >
                        <IconTrash2 />
                      </button>
                      <button
                        onClick={() => setChatExpanded((e) => !e)}
                        className="w-7 h-7 rounded flex items-center justify-center text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[color-mix(in_srgb,var(--border)_45%,transparent)] transition-colors"
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
                        {smallChatMessages.map((m: any, i: any) => (
                          <SmallChatMessage 
                            key={i}
                            message={m}
                            isLast={i === smallChatMessages.length - 1}
                            lastMessageRef={lastMessageRef as React.RefObject<HTMLPreElement>}
                          />
                        ))}
                      </div>
                    )}
                    <ChatTelemetry streamingStats={streamingStats} isGenerating={isGenerating} />
                    <ChatInput
                      chatInput={chatInput}
                      setChatInput={setChatInput}
                      chatMode={chatMode}
                      setChatMode={setChatMode}
                      isGenerating={isGenerating}
                      onSend={handleSendChat}
                      selectedModelId={selectedModelId}
                      onModelChange={async (id) => {
                        setSelectedModelId(id);
                        setModelReady(false);
                        await switchModel(id);
                      }}
                    />
                  </div>
                )}
              </div>
            </section>
          );
        })()}

        <ResizableDivider direction="horizontal" onResize={(d) => {
          const main = document.querySelector('main');
          if (!main) return;
          const totalW = main.clientWidth;
          if (totalW <= 0) return;
          setEditorFraction((f) => Math.max(0.25, Math.min(0.75, f + d / totalW)));
        }} />
        <section style={{ flex: `${1 - editorFraction} 1 0%` }} className="flex flex-col min-w-0 min-h-0">
          <div className="flex-1 relative overflow-hidden min-h-0">
            {toolsPanelOpen ? (
              <ToolsPanel
                isOpen={true}
                onClose={() => setToolsPanelOpen(false)}
                summaryContent={summaryContent}
                logsContent={logsContent}
              />
            ) : (
              <PdfPreview
                pdfUrl={pdfUrl}
                onCompile={handleCompile}
                isCompiling={isCompiling}
                latexReady={compilerReady}
                lastCompileMs={lastCompileMs}
              />
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
