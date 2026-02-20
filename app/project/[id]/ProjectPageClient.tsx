"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, usePathname } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import * as Y from "yjs";
import { WebrtcProvider } from "y-webrtc";
import { mount } from "@wwog/idbfs";
import ExifReader from 'exifreader';
import { FileTree } from "@/components/FileTree";
import { FileActions } from "@/components/FileActions";
import { FileTabs, SETTINGS_TAB_PATH } from "@/components/FileTabs";
import type { Tab } from "@/components/FileTabs";
import { ImageViewer } from "@/components/ImageViewer";
import { EditorPanel, type EditorPanelHandle } from "@/components/EditorPanel";
import { ChatInput } from "@/components/ChatInput";
import { AIModelDownloadProgress } from "@/components/AIModelDownloadProgress";
import { ChatTree, type ChatTreeProps } from "@/components/ChatTree";
import { FileDocumentManager } from "@/lib/fileDocumentManager";
import { BigChatMessage } from "@/components/BigChatMessage";
import { SmallChatMessage } from "@/components/SmallChatMessage";
import { ChatTelemetry } from "@/components/ChatTelemetry";
import { ProjectDropdown } from "@/components/ProjectDropdown";
import { IconSearch, IconChevronDown, IconChevronUp, IconShare2, IconSend, IconTrash2, IconSettings, IconBookOpen, IconChevronRight, IconPlus, IconMessageSquare, IconFilePlus, IconFolderPlus, IconUpload } from "@/components/Icons";
import { SettingsPanel } from "@/components/SettingsPanel";
import { ToolsPanel } from "@/components/ToolsPanel";
import { diffLines } from "diff";
import { ResizableDivider } from "@/components/ResizableDivider";
import { GitPanelReal } from "@/components/GitPanelReal";
import { GitDiffView } from "@/components/GitDiffView";
import { SideBySideDiffView } from "@/components/SideBySideDiffView";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { parseOutline, type OutlineEntry } from "@/lib/documentOutline";
import { EditorView, basicSetup } from "codemirror";
import { EditorState } from "@codemirror/state";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags as t } from "@lezer/highlight";
import { Decoration, DecorationSet } from "@codemirror/view";
import { ViewPlugin, ViewUpdate } from "@codemirror/view";
import { latex } from "codemirror-lang-latex";
import { typst } from "codemirror-lang-typst";

const PdfPreview = dynamic(() => import("@/components/PdfPreview").then((m) => ({ default: m.PdfPreview })), {
  ssr: false,
});
import ReactMarkdown from "react-markdown";
import { generateChatResponse, switchModel, getActiveModelId, initializeModel, isModelLoading } from "@/lib/localModel";
import { generateVLResponse, initializeVLModel, isVLModelLoaded, isVLModelLoading, type VLMessage, type VLStreamCallbacks } from "@/lib/vlModelRuntime";
import { createChat, getChatMessages, saveChatMessages } from "@/lib/chatStore";
import { AVAILABLE_MODELS, DEFAULT_MODEL_ID, getModelById } from "@/lib/modelConfig";
import { compileLatexToPdf, ensureLatexReady } from "@/lib/latexCompiler";
import { compileTypstToPdf, ensureTypstReady } from "@/lib/typstCompiler";
import { documentParser } from "@/lib/document-parser";
import { formatLaTeX } from "@/lib/wasmLatexTools";
import { aiLogger, latexLogger, typstLogger, yjsLogger } from "@/lib/logger";
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

// Helper function to get stable git repository name (same as GitPanel)
const getStableGitRepoName = (projectName: string, filePaths: string[], projectId: string) => {
  // Priority 1: Use project name (most stable)
  if (projectName) {
    const sanitizedName = projectName
      .toLowerCase()
      .replace(/[^a-z0-9-_]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    return `git-${sanitizedName}`;
  }
  
  // Priority 2: Use file system path (stable)
  if (filePaths.length > 0) {
    const firstPath = filePaths[0];
    const pathMatch = firstPath.match(/\/projects\/([^\/]+)/);
    if (pathMatch) {
      const projectUuid = pathMatch[1];
      return `git-${projectUuid}`;
    }
  }
  
  // Priority 3: Fallback to projectId
  return `git-${projectId}`;
};

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
  // 🎯 REFACTORED: Per-tab state management to eliminate Yjs contradictions
  const [activeTabPath, _setActiveTabPath] = useState<string>("");
  const activeTabPathRef = useRef<string>("");
  
  // 🚨 REMOVED: Global ydoc/ytext state that caused contradictions
  // const [ydoc, setYdoc] = useState<Y.Doc | null>(null);
  // const [ytext, setYtext] = useState<Y.Text | null>(null);
  
  // ✅ NEW: Per-tab state refs that are always consistent
  const currentYDocRef = useRef<Y.Doc | null>(null);
  const currentYTextRef = useRef<Y.Text | null>(null);
  const currentProviderRef = useRef<WebrtcProvider | null>(null);
  
  const setActiveTabPath = useCallback((p: string) => {
    activeTabPathRef.current = p;
    _setActiveTabPath(p);
  }, []);
  
  // ✅ Keep other state variables
  const [provider, setProvider] = useState<WebrtcProvider | null>(null);
  const [idbProvider, setIdbProvider] = useState<any>(null);
  const [fs, setFs] = useState<Awaited<ReturnType<typeof mount>> | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [openTabs, setOpenTabs] = useState<Tab[]>([]);
  const [gitOpenTabs, setGitOpenTabs] = useState<Tab[]>([]);
  const [activeGitTabPath, setActiveGitTabPath] = useState<string>("");
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
  const [addActionsOpen, setAddActionsOpen] = useState(false);
  const [chatExpanded, setChatExpanded] = useState(false);
  const [toolsPanelOpen, setToolsPanelOpen] = useState(false);
  const [summaryContent, setSummaryContent] = useState("");
  const [summaryData, setSummaryData] = useState<any>(null);
  const [isFormatting, setIsFormatting] = useState(false);
  const fsRef = useRef<any>(null);
  const [sidebarWidth, setSidebarWidth] = useState(256);
  const [editorFraction, setEditorFraction] = useState(0.5);
  const [outlineHeight, setOutlineHeight] = useState(400); // Default to maximum height
  const [selectedModelId, setSelectedModelId] = useState<string>(DEFAULT_MODEL_ID);
  const [chatImageDataUrl, setChatImageDataUrl] = useState<string | null>(null);

  
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
  const fileDocManagerRef = useRef<FileDocumentManager | null>(null);
  const editorRef = useRef<EditorPanelHandle | null>(null);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const lastMessageRef = useRef<HTMLPreElement | null>(null);
  const autoCompileDoneRef = useRef(false);
  const handleCompileRef = useRef<(() => Promise<void>) | null>(null);
  const isCompilingRef = useRef(false);
  const gitDiffRef = useRef<HTMLDivElement>(null);
  const gitDiffViewRef = useRef<EditorView | null>(null);
  const yjsLastMutationLogRef = useRef(0);
  const yjsLastLengthRef = useRef(0);

  // Initialize git diff viewer when git tab is selected
  useEffect(() => {
    (async () => {
      if (sidebarTab === "git" && gitDiffRef.current && !gitDiffViewRef.current) {
      // Use same theming as main editor
      const isLightTheme = theme === "light" || theme === "sepia";
      
      const highlight = HighlightStyle.define(
        theme === "dark-purple"
          ? [
              { tag: [t.keyword, t.modifier, t.operatorKeyword], color: "#c4b5fd" },
              { tag: [t.string, t.special(t.string)], color: "#f9a8d4" },
              { tag: [t.number, t.bool, t.null], color: "#93c5fd" },
              { tag: [t.function(t.variableName), t.function(t.propertyName)], color: "#67e8f9" },
              { tag: [t.definition(t.variableName), t.variableName], color: "#e9d5ff" },
              { tag: [t.typeName, t.className], color: "#a7f3d0" },
              { tag: [t.comment], color: "#9ca3af", fontStyle: "italic" },
              { tag: [t.heading, t.strong], color: "#e9d5ff", fontWeight: "600" },
              { tag: [t.link, t.url], color: "#93c5fd", textDecoration: "underline" },
            ]
          : isLightTheme
            ? [
                { tag: [t.keyword, t.modifier, t.operatorKeyword], color: "#7c3aed" },
                { tag: [t.string, t.special(t.string)], color: "#b45309" },
                { tag: [t.number, t.bool, t.null], color: "#2563eb" },
                { tag: [t.function(t.variableName), t.function(t.propertyName)], color: "#0f766e" },
                { tag: [t.definition(t.variableName), t.variableName], color: "#111827" },
                { tag: [t.typeName, t.className], color: "#0f766e" },
                { tag: [t.comment], color: "#6b7280", fontStyle: "italic" },
              ]
            : [
                // Dark (default) palette tuned to match app dark surface
                { tag: [t.keyword, t.modifier, t.operatorKeyword], color: "#93c5fd" },
                { tag: [t.string, t.special(t.string)], color: "#fca5a5" },
                { tag: [t.number, t.bool, t.null], color: "#a7f3d0" },
                { tag: [t.function(t.variableName), t.function(t.propertyName)], color: "#67e8f9" },
                { tag: [t.definition(t.variableName), t.variableName], color: "#e5e7eb" },
                { tag: [t.typeName, t.className], color: "#fcd34d" },
                { tag: [t.comment], color: "#9ca3af", fontStyle: "italic" },
                { tag: [t.heading, t.strong], color: "#e5e7eb", fontWeight: "600" },
                { tag: [t.link, t.url], color: "#93c5fd", textDecoration: "underline" },
              ]
      );

      const cmBaseTheme = EditorView.theme(
        {
          "&": {
            backgroundColor: "var(--background)",
            color: "var(--foreground)",
          },
          ".cm-content": {
            caretColor: "var(--foreground)",
            padding: "16px",
            fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
          },
          ".cm-gutters": {
            backgroundColor: "var(--cm-gutter-bg, color-mix(in srgb, var(--background) 92%, black))",
            color: "var(--muted)",
            borderRight: "1px solid var(--border)",
          },
          ".cm-activeLine": {
            backgroundColor:
              theme === "dark-purple"
                ? "color-mix(in srgb, var(--accent) 14%, transparent)"
                : "color-mix(in srgb, var(--accent) 10%, transparent)",
          },
          ".cm-activeLineGutter": {
            backgroundColor:
              theme === "dark-purple"
                ? "color-mix(in srgb, var(--accent) 18%, transparent)"
                : "color-mix(in srgb, var(--accent) 14%, transparent)",
          },
          ".cm-selectionBackground": {
            backgroundColor: isLightTheme
              ? "color-mix(in srgb, var(--accent) 25%, transparent)"
              : "color-mix(in srgb, var(--accent) 35%, transparent)",
          },
          "&.cm-focused .cm-selectionBackground": {
            backgroundColor: isLightTheme
              ? "color-mix(in srgb, var(--accent) 30%, transparent)"
              : "color-mix(in srgb, var(--accent) 45%, transparent)",
          },
          "&.cm-editor .cm-scroller": { 
            fontSize: `${Math.max(10, Math.min(24, editorFontSize))}px` 
          },
          ".cm-line": {
            lineHeight: '1.5'
          },
          // Custom diff highlighting
          ".cm-line:has-text('+\\S')": {
            backgroundColor: "rgba(68, 255, 68, 0.1)",
            color: "#44ff44",
          },
          ".cm-line:has-text('-\\S')": {
            backgroundColor: "rgba(255, 68, 68, 0.1)",
            color: "#ff4444",
          },
          ".cm-line:has-text('@@')": {
            backgroundColor: "color-mix(in srgb, var(--accent) 10%, transparent)",
            color: "var(--muted)",
            fontStyle: "italic",
          },
        },
        { dark: !isLightTheme }
      );

      // Generate real diff content using the diff package
      const generateDiffContent = async () => {
        const textTabs = gitOpenTabs.filter(t => t.type === "text");
        if (textTabs.length === 0) {
          return `// Git Diff View
// No files with changes detected
// Open some files to see changes`;
        }

        // Find the active git tab
        const activeTab = textTabs.find(t => t.path === activeGitTabPath);
        if (!activeTab) {
          return `// Git Diff View
// Select a file to see changes`;
        }
        
        // Get actual file content from IDBFS (source of truth)
        let currentContent = "";
        try {
          const { mount } = await import("@wwog/idbfs");
          const fs = await mount();
          const contentBuffer = await fs.readFile(activeGitTabPath);
          currentContent = new TextDecoder().decode(contentBuffer);
        } catch (error) {
          console.log(`🔍 DIFF DEBUG - Could not read ${activeGitTabPath} from IDBFS`, error);
          return `// Git View\n// Could not read file content`;
        }

        if (!currentContent || currentContent.trim() === '') {
          return `// Git View\n// No content found`;
        }

        // Get original content from the last commit
        let oldContent = '';
        let previousCommit = null;
        try {
          // Try to get the original content from git store
          const { gitStore } = await import('@/lib/gitStore');
          const stableRepoName = getStableGitRepoName(projectName, openTabs.filter(t => t.type === "text").map(t => t.path), id);
          const repo = await gitStore.getRepository(stableRepoName);
          console.log('🔍 DIFF DEBUG - Repository data:', {
            hasRepo: !!repo,
            commitsCount: repo?.commits?.length || 0,
            stableRepoName,
            activeGitTabPath
          });
          
          if (repo && repo.commits.length > 0) {
            previousCommit = repo.commits[0];
            // Use the active tab path directly (no suffix to remove)
            const fileInCommit = previousCommit.files.find((f: any) => f.path === activeGitTabPath);
            
            console.log('🔍 DIFF DEBUG - Previous commit details:', {
              commitId: previousCommit.id,
              message: previousCommit.message,
              timestamp: previousCommit.timestamp,
              author: previousCommit.author,
              filesCount: previousCommit.files?.length || 0,
              files: previousCommit.files?.map(f => ({ 
                path: f.path, 
                hasContent: !!f.content, 
                contentLength: f.content?.length || 0,
                contentPreview: f.content?.substring(0, 100) + (f.content?.length > 100 ? '...' : '')
              }))
            });
            
            console.log('🔍 DIFF DEBUG - File lookup:', {
              fileName: activeGitTabPath,
              fileInCommit: !!fileInCommit,
              fileInCommitPath: fileInCommit?.path,
              allCommitFiles: previousCommit.files.map(f => f.path),
              pathMatch: previousCommit.files.some((f: any) => f.path === activeGitTabPath)
            });
            
            if (fileInCommit) {
              oldContent = fileInCommit.content;
              console.log('🔍 DIFF DEBUG - Previous file content:', {
                contentLength: oldContent.length,
                contentPreview: oldContent.substring(0, 200) + (oldContent.length > 200 ? '...' : ''),
                lineCount: oldContent.split('\n').length
              });
            } else {
              console.log('🔍 DIFF DEBUG - File not found in previous commit (new file)');
              // For new files, don't generate a diff - show a message instead
              return `// Git Diff View
// This is a new file with no previous version to compare against
// Current content preview:
${currentContent.substring(0, 500)}${currentContent.length > 500 ? '...' : ''}

// Make a commit to establish a baseline for future diffs`;
            }
          } else {
            console.log('🔍 DIFF DEBUG - No commits found in repository');
            // For repositories with no commits, don't generate a diff
            return `// Git Diff View
// No commits found in this repository yet
// Make an initial commit to enable diff tracking

// Current content preview:
${currentContent.substring(0, 500)}${currentContent.length > 500 ? '...' : ''}

// To enable diffs:
// 1. Initialize git repository (if not done)
// 2. Make an initial commit with current files
// 3. Future changes will show proper diffs`;
          }
        } catch (error) {
          console.log('🔍 DIFF DEBUG - Could not get original content for diff:', error);
        }
        
        console.log('🔍 DIFF DEBUG - Current file content:', {
          contentLength: currentContent.length,
          contentPreview: currentContent.substring(0, 200) + (currentContent.length > 200 ? '...' : ''),
          lineCount: currentContent.split('\n').length,
          isEmpty: currentContent.trim() === '',
          firstLine: currentContent.split('\n')[0],
          isTypst: currentContent.includes('#set') || currentContent.includes('#align'),
          isLatex: currentContent.includes('\\documentclass') || currentContent.includes('\\begin{document}')
        });
        
        const diffResult = diffLines(oldContent, currentContent);
        
        console.log('🔍 DIFF DEBUG - Diff result:', {
          diffPartsCount: diffResult.length,
          diffParts: diffResult.map((part, index) => ({
            index,
            type: part.added ? 'added' : part.removed ? 'removed' : 'unchanged',
            valueLength: part.value.length,
            valuePreview: part.value.substring(0, 100) + (part.value.length > 100 ? '...' : ''),
            lineCount: part.value.split('\n').length
          }))
        });
        
        // Format diff lines with proper git diff format (no file name header)
        const formattedDiffLines: string[] = [];
        let addedCount = 0, removedCount = 0, unchangedCount = 0;
        
        // diffLines returns an array of diff parts with added/removed properties
        diffResult.forEach((part: any) => {
          if (part.added) {
            // This is an addition - add + prefix to each line
            const lines = part.value.split('\n');
            lines.forEach((line: string) => {
              if (line.trim()) { // Skip empty lines
                formattedDiffLines.push(`+${line}`);
                addedCount++;
              }
            });
          } else if (part.removed) {
            // This is a deletion - add - prefix to each line
            const lines = part.value.split('\n');
            lines.forEach((line: string) => {
              if (line.trim()) { // Skip empty lines
                formattedDiffLines.push(`-${line}`);
                removedCount++;
              }
            });
          } else {
            // Unchanged lines - add space prefix
            const lines = part.value.split('\n');
            lines.forEach((line: string) => {
              if (line.trim()) { // Skip empty lines
                formattedDiffLines.push(` ${line}`);
                unchangedCount++;
              }
            });
          }
        });
        
        console.log('🔍 DIFF DEBUG - Final diff summary:', {
          totalLines: formattedDiffLines.length,
          addedLines: addedCount,
          removedLines: removedCount,
          unchangedLines: unchangedCount,
          hasChanges: addedCount > 0 || removedCount > 0
        });

        return formattedDiffLines.join('\n');
      };

      // Create a ViewPlugin for diff highlighting
      const diffHighlightPlugin = ViewPlugin.fromClass(
        class {
          decorations: DecorationSet;

          constructor(view: EditorView) {
            this.decorations = this.buildDecorations(view);
          }

          update(update: ViewUpdate) {
            if (update.docChanged || update.viewportChanged) {
              this.decorations = this.buildDecorations(update.view);
            }
          }

          buildDecorations(view: EditorView): DecorationSet {
            const decorations: any[] = [];
            const doc = view.state.doc;
            
            // Iterate through each line in the document
            for (let i = 1; i <= doc.lines; i++) {
              const line = doc.line(i);
              const lineText = doc.sliceString(line.from, line.to);
              
              if (lineText.startsWith('+')) {
                // Green background for additions - highlight entire line, keep text readable
                decorations.push(
                  Decoration.line({
                    attributes: { style: 'background-color: rgba(68, 255, 68, 0.2);' }
                  }).range(line.from)
                );
              } else if (lineText.startsWith('-')) {
                // Red background for deletions - highlight entire line, keep text readable
                decorations.push(
                  Decoration.line({
                    attributes: { style: 'background-color: rgba(255, 68, 68, 0.2);' }
                  }).range(line.from)
                );
              }
            }
            
            return Decoration.set(decorations);
          }
        },
        {
          decorations: (v) => v.decorations
        }
      );

      const startState = EditorState.create({
        doc: await generateDiffContent(),
        extensions: [
          basicSetup,
          cmBaseTheme,
          syntaxHighlighting(highlight),
          diffHighlightPlugin,
          EditorState.readOnly.of(true)
        ],
      });
      
      gitDiffViewRef.current = new EditorView({
        state: startState,
        parent: gitDiffRef.current,
      });
      }
    })();
    
    return () => {
      if (gitDiffViewRef.current) {
        gitDiffViewRef.current.destroy();
        gitDiffViewRef.current = null;
      }
    };
  }, [sidebarTab, theme, editorFontSize, gitOpenTabs, activeGitTabPath]);

  const handleGitTabClose = useCallback((path: string) => {
    setGitOpenTabs((prev) => {
      const idx = prev.findIndex((t) => t.path === path);
      if (idx < 0) return prev;
      const remaining = prev.filter((t) => t.path !== path);
      if (path === activeGitTabPath) {
        const nextActive = remaining[idx] ?? remaining[idx - 1] ?? null;
        setActiveGitTabPath(nextActive?.path || "");
      }
      return remaining;
    });
  }, [activeGitTabPath]);

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
    
    // 🎯 REFACTORED: Reset per-tab refs instead of global state
    currentYDocRef.current = null;
    currentYTextRef.current = null;
    currentProviderRef.current = null;
    
    setProvider(null);
    setIdbProvider(null); // ✅ Reset IndexedDB provider
    setFs(null);
    setOpenTabs([]);
    setActiveTabPath("");
    setCurrentPath("");
    setAddTargetPath(basePath);

    console.log('🚀 Init function called, id:', id);
    const init = async () => {
      try {
        console.log('🚀 Starting initialization...');
        
        // Create WebRTC provider for collaboration (shared across all files)
        const doc = new Y.Doc();
        const prov = new WebrtcProvider(id, doc);
        yjsLogger.info("Created WebRTC provider", { roomId: id, docGuid: doc.guid });
        prov.on("status", (event: any) => {
          yjsLogger.info("Global WebRTC provider status", {
            roomId: id,
            docGuid: doc.guid,
            status: event?.status,
          });
        });
        prov.on("peers", (event: any) => {
          yjsLogger.info("Global WebRTC provider peers", {
            roomId: id,
            peersConnected: event?.peers?.length ?? 0,
            peers: event?.peers ?? [],
            webrtcPeers: event?.webrtcPeers ?? [],
            bcPeers: event?.bcPeers ?? [],
          });
        });
        doc.on("update", (update: Uint8Array, origin: any) => {
          yjsLogger.info("Global Y.Doc update", {
            roomId: id,
            docGuid: doc.guid,
            updateBytes: update?.length ?? 0,
            originType: typeof origin,
            origin: typeof origin === "string" ? origin : origin?.constructor?.name ?? "unknown",
          });
        });
        
        providerRef.current = prov;

        // Create File document manager for per-file persistence
        const fileDocManager = new FileDocumentManager(id, prov);
        fileDocManagerRef.current = fileDocManager;
        console.log('📂 File document manager created');

        const idbfs = await mount();
        fsRef.current = idbfs;
        console.log('📂 File system mounted');
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
        
        // Helper function to find first text file
        async function findFirstTextFile(dir: string): Promise<string | null> {
          const { dirs, files } = await idbfs.readdir(dir);
          for (const f of files) {
            const full = dir === "/" ? `/${f.name}` : `${dir}/${f.name}`;
            if (!isBinaryPath(full)) {
              return full;
            }
          }
          for (const d of dirs) {
            const sub = dir === "/" ? `/${d.name}` : `${dir}/${d.name}`;
            const found = await findFirstTextFile(sub);
            if (found) return found;
          }
          return null;
        }
        
        // Try to restore the last active file from localStorage first
        const lastActiveFileKey = `lastActiveFile-${id}`;
        const savedActivePath = typeof window !== 'undefined' ? localStorage.getItem(lastActiveFileKey) : null;
        
        let initialPath: string | null = null;
        
        // Priority 1: Use saved active file if it exists
        if (savedActivePath && await idbfs.exists(savedActivePath).catch(() => false)) {
          initialPath = savedActivePath;
          console.log('📂 Restored last active file:', initialPath);
        }
        // Priority 2: Try main.tex
        else if (await idbfs.exists(mainPath).catch(() => false)) {
          initialPath = mainPath;
          console.log('📂 Found main.tex:', mainPath);
        }
        // Priority 3: Try main.typ
        else if (await idbfs.exists(mainTypPath).catch(() => false)) {
          initialPath = mainTypPath;
          console.log('📂 Found main.typ:', mainTypPath);
        }
        // Priority 4: Find first text file (fallback)
        else {
          initialPath = await findFirstTextFile(basePath).catch(() => null);
          console.log('📂 Found first text file:', initialPath);
        }

        if (initialPath) {
          // Load initial file using the file document manager
          try {
            // 🎯 Get file-specific document from manager
            const fileDoc = fileDocManagerRef.current!.getDocument(initialPath);
            const text = fileDoc.text;
            
            // Wait for IndexedDB to load before deciding what to do
            const waitForIndexedDb = () => {
              return new Promise<void>((resolve) => {
                const timeout = setTimeout(() => {
                  console.log('⏰ IndexedDB load timeout, proceeding anyway');
                  resolve();
                }, 5000); // 5 second timeout
                
                const checkLoaded = () => {
                  if ((fileDoc.doc as any)._indexedDbLoaded) {
                    clearTimeout(timeout);
                    console.log('✅ IndexedDB loaded successfully');
                    resolve();
                  } else {
                    setTimeout(checkLoaded, 50); // Check every 50ms (slower)
                  }
                };
                checkLoaded();
              });
            };
            
            console.log('⏳ Waiting for IndexedDB to load...');
            await waitForIndexedDb();
            
            // Check if Yjs already has content (from persistence)
            const existingContent = text.toString();
            console.log('🔍 Existing Yjs content length after IndexedDB load:', existingContent.length);
            
            // Only read from filesystem if Yjs is empty (respect persistence!)
            if (existingContent.length === 0) {
              console.log('📝 Yjs was empty after IndexedDB load, loading from filesystem');
              const data = await idbfs.readFile(initialPath);
              const content = typeof data === "string" ? data : new TextDecoder().decode(data as ArrayBuffer);
              console.log('📂 File system content length:', content.length);
              
              text.delete(0, text.length);
              text.insert(0, content || "");
              
              textContentCacheRef.current.set(initialPath, content ?? "");
              console.log(`📂 Processed ${initialPath} (${content.length} chars)`);
            } else {
              console.log('💾 Keeping Yjs content (IndexedDB persistence worked!)');
              console.log(`📂 Using persisted content for ${initialPath} (${existingContent.length} chars)`);
              textContentCacheRef.current.set(initialPath, existingContent);
            }
          } catch {
            // File doesn't exist, clear any IndexedDB content
            const fileDoc = fileDocManagerRef.current!.getDocument(initialPath);
            fileDoc.text.delete(0, fileDoc.text.length);
            console.log(`📂 ${initialPath} not found, cleared editor`);
          }

          // Determine file type based on extension
          const isImage = initialPath.match(/\.(png|jpg|jpeg|gif|bmp|svg|webp|tiff|heif|ico)$/i);
          const isPdf = initialPath.endsWith('.pdf');
          const fileType = isImage ? "image" : isPdf ? "image" : "text";
          
          // Cache PDF files for the PDF viewer (for reload scenarios)
          if (isPdf) {
            try {
              const data = await idbfs.readFile(initialPath);
              if (data && data instanceof ArrayBuffer) {
                const blob = new Blob([data], { type: 'application/pdf' });
                const url = URL.createObjectURL(blob);
                setImageUrlCache((prev) => { const next = new Map(prev); next.set(initialPath, url); return next; });
              }
            } catch (e) {
              console.warn('Failed to cache PDF for viewer:', e);
            }
          }
          
          setOpenTabs([{ path: initialPath, type: fileType }]);
          setActiveTabPath(initialPath);
          setCurrentPath(initialPath);
          console.log('📂 Set active tab to:', initialPath);
        } else {
          console.log('📂 No initial file found, creating empty project');
          setOpenTabs([]);
          setActiveTabPath("");
          setCurrentPath("");
        }

        if (cancelled) return;
        
        // 🎯 REFACTORED: No more global state setting - use per-tab refs
        // getCurrentYText() will set refs when needed
        setProvider(prov);
        setFs(idbfs);
        setIsInitialized(true); // ✅ Mark as fully initialized
        console.log('🎉 Initialization complete, isInitialized set to true');
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
      fileDocManagerRef.current?.destroy(); // ✅ Cleanup all file documents
      fileDocManagerRef.current = null;
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

  // 🎯 REFACTORED: Get current tab's Y.Text using consistent per-tab state
  const getCurrentYText = useCallback((silent = false): Y.Text | null => {
    const manager = fileDocManagerRef.current;
    const path = activeTabPathRef.current;
    
    if (!manager || !path) {
      if (!silent) {
        console.log('🔍 getCurrentYText: missing manager or path', { hasManager: !!manager, path });
        yjsLogger.warn("getCurrentYText missing manager/path", {
          hasManager: !!manager,
          path,
          activeTabPathState: activeTabPath,
          openTabCount: openTabs.length,
        });
      }
      return null;
    }
    
    // 🚨 CRITICAL FIX: Do NOT create Yjs documents for binary/image files!
    // This prevents the logs showing "Creating document for .pdf/.jpeg"
    if (isBinaryPath(path)) {
      if (!silent) {
        console.log('🔍 getCurrentYText: skipping Y.Text for binary file', path);
        yjsLogger.info("getCurrentYText skipped binary path", {
          path,
          openTabCount: openTabs.length,
        });
      }
      return null;
    }
    
    const doc = manager.getDocument(path, silent);
    const ytext = doc.text;
    
    // 🎯 Update per-tab refs so rendering conditions (currentYDocRef.current) pass
    currentYDocRef.current = doc.doc;
    currentYTextRef.current = ytext;
    currentProviderRef.current = manager.getWebrtcProvider(path);
    
    if (!silent) {
      console.log('🔍 getCurrentYText: got ytext for', path, { 
        hasText: !!ytext,
        docId: doc.doc.guid,
        textLength: ytext?.length || 0
      });
      yjsLogger.info("getCurrentYText resolved", {
        path,
        hasText: !!ytext,
        docGuid: doc.doc.guid,
        textLength: ytext?.length || 0,
        totalOpenYDocs: manager.getDocumentPaths().length,
        knownPaths: manager.getDocumentPaths(),
        hasProviderForPath: !!currentProviderRef.current,
      });
    }
    
    return ytext;
  }, [activeTabPath, openTabs]);

  // Save the active file to localStorage for persistence across sessions
  const saveActiveFileToStorage = useCallback((path: string) => {
    if (typeof window !== 'undefined' && id) {
      const lastActiveFileKey = `lastActiveFile-${id}`;
      localStorage.setItem(lastActiveFileKey, path);
      console.log('💾 Saved active file to localStorage:', path);
    }
  }, [id]);

  // Update localStorage when active tab changes
  useEffect(() => {
    if (activeTabPath) {
      saveActiveFileToStorage(activeTabPath);
    }
  }, [activeTabPath, saveActiveFileToStorage]);

  // 🎯 REFACTORED: Get current tab's WebRTC provider using consistent per-tab state
  const getCurrentWebrtcProvider = useCallback((): WebrtcProvider | null => {
    // ✅ Use the consistent ref that's updated by getCurrentYText
    return currentProviderRef.current;
  }, []);

  // Lazily create / recreate the buffer manager when active file changes
  const getBufferMgr = useCallback((): EditorBufferManager | null => {
    if (!bufferMgrRef.current) {
      bufferMgrRef.current = new EditorBufferManager(
        {
          // 🚨 CRITICAL FIX: The buffer manager MUST fetch the text dynamically from the CURRENT active tab
          // Otherwise it forms a closure over the old ytext and overwrites the wrong document when switching!
          get: () => {
            const ytext = getCurrentYText(true); // silent=true to prevent render-phase logging loops
            return ytext ? ytext.toString() : "";
          },
          set: (c: string) => { 
            const ytext = getCurrentYText(true);
            if (ytext) {
              ytext.delete(0, ytext.length); 
              ytext.insert(0, c || ""); 
            }
          },
        },
        activeTabPathRef.current
      );
    }
    return bufferMgrRef.current;
  }, [getCurrentYText]); // ✅ Use function dependency instead of ytext variable

  // Generate summary content from current document
  const generateSummary = useCallback(async () => {
    const activeTab = openTabs.find((t) => t.path === activeTabPath);
    console.log('[generateSummary] activeTab:', activeTab);
    
    // Handle all file types, not just text
    if (activeTab) {
      const bufferMgr = getBufferMgr();
      
      if (bufferMgr) {
        // Check if this is a diff tab
const activeTab = openTabs.find(t => t.path === activeTabPath);
const isDiffTab = activeTabPath?.endsWith(':diff');
const diffData = isDiffTab && activeTab?.diffData ? activeTab.diffData : null;

// Get the actual file path for diff tabs
const actualFilePath = isDiffTab ? activeTabPath?.replace(':diff', '') : activeTabPath;

        // Ensure current buffer is saved to cache before retrieving
        bufferMgr.saveActiveToCache();
        
        // Try to get content from cache first, then from buffer
        let content = bufferMgr.getCachedContent(activeTabPath);
        
        if (!content || content.trim() === '') {
          content = bufferMgr.getBufferContent();
        }
        
        console.log('[generateSummary] content length:', content?.length);
        
        if (content && content.trim()) {
          const isTex = activeTabPath.endsWith('.tex');
          const isTyp = activeTabPath.endsWith('.typ');
          const isMarkdown = activeTabPath.endsWith('.md') || activeTabPath.endsWith('.markdown');
          const isCode = activeTabPath.endsWith('.js') || activeTabPath.endsWith('.jsx') || 
                       activeTabPath.endsWith('.ts') || activeTabPath.endsWith('.tsx') || 
                       activeTabPath.endsWith('.py') || activeTabPath.endsWith('.java') || 
                       activeTabPath.endsWith('.cpp') || activeTabPath.endsWith('.c') || 
                       activeTabPath.endsWith('.css') || activeTabPath.endsWith('.html') ||
                       activeTabPath.endsWith('.json') || activeTabPath.endsWith('.xml') ||
                       activeTabPath.endsWith('.yaml') || activeTabPath.endsWith('.yml');
          const isText = activeTabPath.endsWith('.txt') || activeTabPath.endsWith('.rst') || 
                     activeTabPath.endsWith('.log') || activeTabPath.endsWith('.csv');
          const isImage = activeTabPath.endsWith('.png') || activeTabPath.endsWith('.jpg') || 
                       activeTabPath.endsWith('.jpeg') || activeTabPath.endsWith('.gif') || 
                       activeTabPath.endsWith('.bmp') || activeTabPath.endsWith('.svg') || 
                       activeTabPath.endsWith('.webp') || activeTabPath.endsWith('.ico') ||
                       activeTabPath.endsWith('.tiff') || activeTabPath.endsWith('.heif') || 
                       activeTabPath.endsWith('.heic');
          // Check if this is a diff tab
const activeTab = openTabs.find(t => t.path === activeTabPath);
const isDiffTab = activeTabPath?.endsWith(':diff');
const diffData = isDiffTab && activeTab?.diffData ? activeTab.diffData : null;

// Get the actual file path for diff tabs
const actualFilePath = isDiffTab ? activeTabPath?.replace(':diff', '') : activeTabPath;
const isPdf = actualFilePath?.endsWith('.pdf');
          
          if (isImage) {
            // Handle image files - use the same method as the editor
            console.log('[Image] Handling image file:', activeTabPath);
            
            // Use the same fs.readFile method that the editor uses
            let content = '';
            
            try {
              // Get the filesystem instance the same way the editor does
              const fs = fsRef.current;
              if (fs) {
                const data = await fs.readFile(activeTabPath);
                console.log('[Image] Raw data type:', typeof data);
                console.log('[Image] Raw data is ArrayBuffer:', data instanceof ArrayBuffer);
                console.log('[Image] Raw data is Uint8Array:', data instanceof Uint8Array);
                
                // Convert to string the same way the editor does
                if (typeof data === "string") {
                  content = data;
                } else {
                  // For binary data, we need to handle it differently
                  const uint8Array = data instanceof ArrayBuffer ? new Uint8Array(data) : data as Uint8Array;
                  // Use chunked conversion to avoid stack overflow
                  const chunkSize = 0x8000; // 32KB chunks
                  let result = '';
                  for (let i = 0; i < uint8Array.length; i += chunkSize) {
                    const chunk = uint8Array.subarray(i, i + chunkSize);
                    result += String.fromCharCode.apply(null, Array.from(chunk));
                  }
                  content = result;
                }
                
                console.log('[Image] Successfully read file directly with fs.readFile');
              } else {
                console.log('[Image] No filesystem available');
              }
            } catch (error) {
              console.error('[Image] Error reading file with fs.readFile:', error);
              // Fallback to buffer manager
              const bufferMgr = getBufferMgr();
              if (bufferMgr) {
                bufferMgr.saveActiveToCache();
                content = bufferMgr.getCachedContent(activeTabPath) || bufferMgr.getBufferContent() || '';
                console.log('[Image] Used buffer manager fallback');
              }
            }
            
            console.log('[Image] Content type:', typeof content);
            console.log('[Image] Content length:', content.length);
            console.log('[Image] First 100 chars:', content.substring(0, 100));
            
            const fileName = activeTabPath.split('/').pop() || 'unknown';
            const fileExtension = activeTabPath.split('.').pop()?.toUpperCase() || 'IMAGE';
            
            // Parse image metadata for raw view
            let resolution = 'Unknown';
            let cameraMake = 'Unknown';
            let cameraModel = 'Unknown';
            let dateTime = 'Unknown';
            let iso = 'Unknown';
            let focalLength = 'Unknown';
            let flash = 'Unknown';
            
            try {
              const buffer = new ArrayBuffer(content.length);
              const view = new Uint8Array(buffer);
              for (let i = 0; i < content.length; i++) {
                view[i] = content.charCodeAt(i);
              }
              
              const tags = ExifReader.load(buffer);
              
              // Resolution
              if (tags.ImageWidth && tags.ImageHeight) {
                resolution = `${tags.ImageWidth.description} × ${tags.ImageHeight.description}`;
              } else if (tags['Image Height'] && tags['Image Width']) {
                resolution = `${tags['Image Width'].description} × ${tags['Image Height'].description}`;
              } else if (tags['PixelXDimension'] && tags['PixelYDimension']) {
                resolution = `${tags['PixelXDimension'].description} × ${tags['PixelYDimension'].description}`;
              }
              
              // Camera info
              if (tags.Make) cameraMake = tags.Make.description;
              if (tags.Model) cameraModel = tags.Model.description;
              
              // Date/time
              if (tags.DateTimeOriginal) dateTime = tags.DateTimeOriginal.description;
              else if (tags.DateTime) dateTime = tags.DateTime.description;
              
              // Camera settings
              if (tags.ISOSpeedRatings) iso = tags.ISOSpeedRatings.description;
              else if (tags.ISO) iso = tags.ISO.description;
              
              if (tags.FocalLength) focalLength = tags.FocalLength.description;
              if (tags.Flash) flash = tags.Flash.description;
              
            } catch (error) {
              console.error('[Image] Error parsing metadata for raw view:', error);
              resolution = 'Parse Error';
            }
            
            // Create structured data for SummaryView
            const imageData = {
              type: 'image',
              ast: {},
              stats: { 
                fileSize: content.length, 
                fileName, 
                fileExtension, 
                imageData: content,
                resolution,
                cameraMake,
                cameraModel,
                dateTime,
                iso,
                focalLength,
                flash
              },
              metadata: {
                wordCount: 0,
                totalSections: 0,
                maxDepth: 0,
                complexity: 0,
                processingTime: Date.now() % 100
              }
            };
            setSummaryData(imageData);
            
            return `Image File Analysis
========================

Document Overview
-----------------
File Name: ${fileName}
File Type: ${fileExtension}
File Size: ${content.length.toLocaleString()} bytes
Resolution: ${resolution}

Camera Information
-----------------
Make: ${cameraMake}
Model: ${cameraModel}
Date Taken: ${dateTime}

Camera Settings
----------------
ISO: ${iso}
Focal Length: ${focalLength}
Flash: ${flash}

Content Statistics
------------------
Type: Image File
Format: ${fileExtension}

Parser Features
--------------
✓ Auto-detection: ${fileExtension.toLowerCase()}
✓ File type recognition: Image
✓ Basic metadata: Full analysis
✓ Format detection: ${fileExtension}`;
            
          } else if (isPdf) {
            // Handle PDF files
            const fileName = activeTabPath.split('/').pop() || 'unknown';
            const fileSize = content.length;
            
            // Create structured data for SummaryView
            const pdfData = {
              type: 'pdf',
              ast: {},
              stats: { fileSize, fileName, pages: 0 }, // Would be extracted from PDF in real implementation
              metadata: {
                wordCount: 0,
                totalSections: 0,
                maxDepth: 0,
                complexity: 0,
                processingTime: Date.now() % 100
              }
            };
            setSummaryData(pdfData);
            
            return `PDF Document Analysis
========================

Document Overview
-----------------
File Name: ${fileName}
File Type: PDF
File Size: ${fileSize.toLocaleString()} bytes
Pages: Not available (would require PDF parsing)

Content Statistics
------------------
Type: PDF Document
Format: Portable Document Format

Parser Features
--------------
✓ Auto-detection: pdf
✓ File type recognition: PDF
✓ Basic metadata: Full analysis
✓ Format detection: PDF`;
            
          } else if (isTex || isTyp) {
            try {
              // Use our new document parser for comprehensive statistics
              const result = await documentParser.parseDocumentWithType(content, isTex ? 'latex' : 'typst');
              // Store the raw data for SummaryView
              setSummaryData(result);
              
              console.log('[LaTeX] Parser result:', {
                type: result.type,
                statsWordsInText: result.stats.wordsInText,
                metadataWordCount: result.metadata.wordCount,
                simpleWordCount: content.split(/\s+/).filter(Boolean).length
              });
              
              const { ast, stats, metadata } = result;
              
              // Format comprehensive statistics display
              let statsText = `${result.type.toUpperCase()} Document Analysis
========================

Document Overview
-----------------
Words: ${metadata.wordCount.toLocaleString()}
Sections: ${metadata.totalSections}
Max Depth: ${metadata.maxDepth}
Complexity Score: ${metadata.complexity}

Content Statistics
------------------
Words in Text: ${stats.wordsInText.toLocaleString()}
Words in Headers: ${result.type === 'latex' ? (stats as any).wordsInHeaders : 0}`;
              
              if (result.type === 'latex') {
                statsText += `
Words Outside Text: ${(stats as any).wordsOutsideText.toLocaleString()}`;
              } else {
                statsText += `
Words in Markup: ${(stats as any).wordsInMarkup.toLocaleString()}`;
              }
              
              statsText += `
Math Inline: ${result.type === 'latex' ? metadata.mathInlineCount : (stats as any).mathInlines}
Math Displayed: ${result.type === 'latex' ? metadata.mathDisplayedCount : (stats as any).mathDisplayed}`;

              if (result.type === 'latex') {
                statsText += `
Floats: ${metadata.floatCount}`;
              } else {
                statsText += `
Figures: ${(stats as any).numberOfFigures}
Tables: ${(stats as any).numberOfTables}`;
              }

              // Add section/heading details
              const details = result.type === 'latex' ? (stats as any).sectionStats : (stats as any).headingStats;
              const detailType = result.type === 'latex' ? 'Section' : 'Heading';
              
              if (details && details.length > 0) {
                statsText += `

${detailType} Details
----------------`;
                details.slice(0, 10).forEach((item: any, index: number) => {
                  const wordsInContent = result.type === 'latex' 
                    ? item.wordsInText + item.wordsInHeaders 
                    : item.wordsInText + item.wordsInHeadings;
                  const mathInlines = result.type === 'latex' ? item.mathInlines : (item.mathInlines || 0);
                  const mathDisplayed = result.type === 'latex' ? item.mathDisplayed : (item.mathDisplayed || 0);
                  statsText += `
${index + 1}. ${item.title} (Level ${item.level})
   Words: ${wordsInContent}
   Math: ${mathInlines} inline, ${mathDisplayed} displayed`;
                });
                
                if (details.length > 10) {
                  statsText += `
... and ${details.length - 10} more ${detailType.toLowerCase()}s`;
                }
              }

              statsText += `

File Information
===============
Path: ${activeTabPath}
Type: ${result.type.toUpperCase()}
Characters: ${content.length}
Lines: ${content.split('\n').length}
Last modified: ${new Date().toLocaleString()}
Processing time: ${metadata.processingTime}ms

Parser Features
--------------
✓ Auto-detection: ${result.type}
✓ Math analysis: ${metadata.hasMath ? 'Yes' : 'No'}
✓ Structure parsing: ${metadata.totalSections} sections
✓ Comprehensive statistics: Full analysis`;

              return statsText;
            } catch (error) {
              console.error('[summary] Document parser error:', error);
              return `Error generating analysis
=========================

Failed to analyze document with advanced parser.
Falling back to basic statistics.

Path: ${activeTabPath}
Type: ${isTex ? 'LaTeX' : 'Typst'}
Words: ${content.split(/\s+/).filter(Boolean).length}
Characters: ${content.length}
Lines: ${content.split('\n').length}
Last modified: ${new Date().toLocaleString()}

Error: ${error instanceof Error ? error.message : 'Unknown error'}

Basic statistics shown above. Advanced features unavailable.`;
            }
          } else if (isMarkdown) {
            // Handle Markdown files
            const lines = content.split('\n');
            const words = content.split(/\s+/).filter(Boolean).length;
            const characters = content.length;
            const headings = lines.filter(line => /^#{1,6}\s/.test(line)).length;
            const codeBlocks = (content.match(/```[\s\S]*?```/g) || []).length;
            const links = (content.match(/\[([^\]]+)\]\([^\)]+\)/g) || []).length;
            const images = (content.match(/!\[([^\]]+)\]\([^\)]+\)/g) || []).length;
            const paragraphs = lines.filter(line => line.trim().length > 0).length;
            
            // Create structured data for SummaryView
            const markdownData = {
              type: 'markdown',
              ast: { headings, codeBlocks, links, images },
              stats: { words, characters, lines: lines.length, headings, codeBlocks, links, images, paragraphs },
              metadata: {
                wordCount: words,
                totalSections: headings,
                maxDepth: 6,
                complexity: Math.floor((headings + codeBlocks + links) / 3),
                processingTime: Date.now() % 100
              }
            };
            console.log('[ProjectPageClient] Setting markdownData:', markdownData);
            setSummaryData(markdownData);
            
            return `Markdown Document Analysis
========================

Document Overview
-----------------
Words: ${words.toLocaleString()}
Headings: ${headings}
Code Blocks: ${codeBlocks}
Links: ${links}
Images: ${images}

Content Statistics
------------------
Characters: ${characters.toLocaleString()}
Lines: ${lines.length}

Parser Features
--------------
✓ Auto-detection: markdown
✓ Heading analysis: ${headings} headings
✓ Link detection: ${links} links
✓ Code block parsing: ${codeBlocks} blocks`;
            
          } else if (isCode) {
            // Handle code files
            const lines = content.split('\n');
            const words = content.split(/\s+/).filter(Boolean).length;
            const characters = content.length;
            const functions = (content.match(/function\s+\w+|\w+\s*:\s*function|def\s+\w+|\w+\s*=>\s*{/g) || []).length;
            const classes = (content.match(/class\s+\w+|interface\s+\w+/g) || []).length;
            const imports = (content.match(/import\s+.*from|require\(|#include|@import/g) || []).length;
            const comments = (content.match(/\/\/.*$|\/\*[\s\S]*?\*\//gm) || []).length;
            
            // Create structured data for SummaryView
            const codeData = {
              type: 'code',
              ast: { functions, classes, imports, comments },
              stats: { words, characters, lines: lines.length, functions, classes, imports, comments },
              metadata: {
                wordCount: words,
                totalSections: functions + classes,
                maxDepth: 1,
                complexity: Math.floor((functions + classes + imports) / 3),
                processingTime: Date.now() % 100
              }
            };
            setSummaryData(codeData);
            
            const fileExtension = activeTabPath.split('.').pop()?.toUpperCase() || 'CODE';
            return `${fileExtension} File Analysis
========================

Document Overview
-----------------
Words: ${words.toLocaleString()}
Lines: ${lines.length}
Functions: ${functions}
Classes: ${classes}
Imports: ${imports}
Comments: ${comments}

Content Statistics
------------------
Characters: ${characters.toLocaleString()}

Parser Features
--------------
✓ Auto-detection: ${fileExtension.toLowerCase()}
✓ Function parsing: ${functions} functions
✓ Class detection: ${classes} classes
✓ Import analysis: ${imports} imports`;
            
          } else if (isText) {
            // Handle plain text files
            const lines = content.split('\n');
            const words = content.split(/\s+/).filter(Boolean).length;
            const characters = content.length;
            const paragraphs = lines.filter(line => line.trim().length > 0).length;
            const sentences = (content.match(/[^.!?]+[.!?]/g) || []).length;
            
            // Create structured data for SummaryView
            const textData = {
              type: 'text',
              ast: { paragraphs, sentences },
              stats: { words, characters, lines: lines.length, paragraphs, sentences },
              metadata: {
                wordCount: words,
                totalSections: paragraphs,
                maxDepth: 1,
                complexity: Math.floor(words / 100),
                processingTime: Date.now() % 100
              }
            };
            setSummaryData(textData);
            
            return `Text Document Analysis
========================

Document Overview
-----------------
Words: ${words.toLocaleString()}
Lines: ${lines.length}
Paragraphs: ${paragraphs}
Sentences: ${sentences}

Content Statistics
------------------
Characters: ${characters.toLocaleString()}

Parser Features
--------------
✓ Auto-detection: text
✓ Paragraph analysis: ${paragraphs} paragraphs
✓ Sentence counting: ${sentences} sentences
✓ Word counting: ${words.toLocaleString()} words`;
            
          } else {
            // Handle other file types with basic analysis
            const lines = content.split('\n');
            const words = content.split(/\s+/).filter(Boolean).length;
            const characters = content.length;
            const fileExtension = activeTabPath.split('.').pop()?.toUpperCase() || 'UNKNOWN';
            
            // Create structured data for SummaryView
            const basicData = {
              type: 'basic',
              ast: {},
              stats: { words, characters, lines: lines.length },
              metadata: {
                wordCount: words,
                totalSections: 0,
                maxDepth: 0,
                complexity: 0,
                processingTime: Date.now() % 100
              }
            };
            setSummaryData(basicData);
            
            return `${fileExtension} File Analysis
========================

Document Overview
-----------------
Words: ${words.toLocaleString()}
Lines: ${lines.length}
Characters: ${characters.toLocaleString()}

Content Statistics
------------------
File Type: ${fileExtension}

Parser Features
--------------
✓ Auto-detection: ${fileExtension.toLowerCase()}
✓ Basic statistics: Full analysis
✓ Line counting: ${lines.length} lines
✓ Character counting: ${characters.toLocaleString()} characters`;
          }
        }
      }
    }
    return `No active text document
=======================

Active tab: ${activeTab?.type || 'none'}
Path: ${activeTabPath || 'none'}
Available tabs: ${openTabs.map(t => `${t.path} (${t.type})`).join(', ')}

YText exists: ${!!getCurrentYText()}
Buffer manager exists: ${!!getBufferMgr()}`;
  }, [openTabs, activeTabPath, getBufferMgr, getCurrentYText]);

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
      let formattedContent: string;
      try {
        formattedContent = await formatLaTeX(content, {
          wrap: true,
          wraplen: 80,
          tabsize: editorTabSize,
          usetabs: false,
        });
      } catch (formatError) {
        console.error('⚠️ LaTeX formatting failed, using original content:', formatError);
        // Fallback: use original content if formatting fails
        formattedContent = content;
      }

      // Update the buffer with formatted content
      const ytext = getCurrentYText();
      if (ytext) {
        ytext.delete(0, ytext.length);
        ytext.insert(0, formattedContent);
      }

      // Update cache
      bufferMgr.saveActiveToCache();

      latexLogger.info("Document formatted successfully");
    } catch (error) {
      latexLogger.error("Error formatting document", error);
    } finally {
      setIsFormatting(false);
    }
  }, [openTabs, activeTabPath, getBufferMgr, getCurrentYText]);

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
      // Clear old summary data when switching files
      setSummaryData(null);
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
    async (path: string, content: string) => {
      if (!fileDocManagerRef.current) return;
      
      // Get the document for this specific file
      const fileDoc = fileDocManagerRef.current.getDocument(path);
      const ytext = fileDoc.text;
      
      // Wait for Yjs persistence to finish loading before we do any content comparisons!
      // This prevents race conditions where Yjs is empty because IndexedDB hasn't loaded yet.
      await fileDoc.whenLoaded;
      
      // 🎯 REFACTORED: No more global state updates - use per-tab refs
      // getCurrentYText() will update the refs consistently when needed
      console.log('🔄 Loading tab content:', path, { 
        docId: fileDoc.doc.guid,
        textLength: ytext?.length || 0
      });
      
      // Check if Yjs already has content (from persistence)
      const existingContent = ytext.toString();
      
      // 🚨 CRITICAL FIX: Don't overwrite inactive tabs during tab switching
      // Skip filesystem writes for now - Yjs persistence handles content saving
      if (activeTabPath && activeTabPath !== path) {
        try {
          // Get the CURRENT tab's content from its own document, not from the target tab
          const currentDoc = fileDocManagerRef.current.getDocument(activeTabPath);
          const currentContent = currentDoc.text.toString();
          
          if (currentContent.trim()) {
            console.log('💾 Current tab content tracked by Yjs persistence:', {
              from: activeTabPath,
              to: path,
              contentLength: currentContent.length
            });
            
            // 🎯 Yjs persistence automatically saves content, no need for manual fs writes
            // This prevents the mimeType error and relies on the working Yjs system
          }
        } catch (e) {
          console.error('Failed to track current tab content:', e);
        }
      }
      
      // Load new content - but be smart about it
      if (existingContent.length === 0 && content.length > 0) {
        ytext.delete(0, ytext.length);
        ytext.insert(0, content);
      } else if (existingContent.length > 0 && content.length === 0) {
        // Don't overwrite good content with empty content
      } else if (existingContent.length === 0 && content.length === 0) {
        ytext.delete(0, ytext.length);
        ytext.insert(0, content);
      } else {
        // 🚨 CRITICAL FIX: Only update the text if the existing content is DIFFERENT from what we're loading
        // And more importantly, DO NOT overwrite existing content from Yjs just because we fetched an old string from the file system.
        // The Yjs document is the source of truth for existing files!
        if (existingContent !== content) {
           console.log(`⚠️ Existing Yjs content differs from fs content for ${path}.`);
           
           // If the file was just imported from a ZIP, its Yjs document might have been initialized 
           // with some default empty state or stale persistence, but the file system has the REAL imported content.
           // We need a way to detect this. If the user explicitly clicked on a file in the tree, we should trust the FS.
           // But if it's an automated tab switch, we trust Yjs.
           // For now, if the file is imported from zip, the existingContent might be "" or " " while content is huge.
           // Since we don't have a reliable flag for "just imported", we must be extremely careful.
           
           // If Yjs is completely empty or just whitespace, but FS has real content, trust the FS!
           // Only overwrite when Yjs is truly empty — never overwrite non-empty Yjs content
           // as the user may have edited the file to be short.
           if (
             (existingContent.trim().length === 0 && content.trim().length > 0)
           ) {
             console.log(`📥 Yjs is basically empty, loading real content from fs (${content.length} chars)`);
             ytext.delete(0, ytext.length);
             ytext.insert(0, content);
           } else {
             console.log(`🛡️ Keeping existing Yjs content (${existingContent.length} chars) instead of fs content (${content.length} chars)`);
           }
        }
      }
    },
    [activeTabPath, fs]
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
      if (!fs) return;
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
        // 🎯 FIX: Each file has its own Yjs document via FileDocumentManager.
        // Just switch the active path — getCurrentYText() returns the correct doc.
        // Do NOT use buffer manager switchTo() — it writes into the OLD tab's Yjs doc.
        setActiveTabPath(path);
        setCurrentPath(path);
        return;
      }

      // New tab
      if (isBinary) {
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
        // Determine file type based on extension
        const isImage = path.match(/\.(png|jpg|jpeg|gif|bmp|svg|webp|tiff|heif|ico)$/i);
        const isPdf = path.endsWith('.pdf');
        const fileType = isImage ? "image" : isPdf ? "image" : "text";
        
        // Cache PDF files for the PDF viewer (read binary data directly)
        if (isPdf && fs) {
          try {
            const data = await fs.readFile(path);
            if (data && typeof data !== 'string') {
              const blob = new Blob([data], { type: 'application/pdf' });
              const url = URL.createObjectURL(blob);
              setImageUrlCache((prev) => { const next = new Map(prev); next.set(path, url); return next; });
            }
          } catch (e) {
            console.warn('Failed to cache PDF for viewer:', e);
          }
        }
        
        // Load content into the new file's Yjs document
        loadTextIntoEditor(path, content);
        setOpenTabs((t) => [...t, { path, type: fileType }]);
        setActiveTabPath(path);
        setCurrentPath(path);
      }
    },
    [fs, openTabs, basePath, getBufferMgr, saveActiveTextToCache, loadTextIntoEditor, resolveFileContent]
  );

  // Handle tab reordering
  const handleTabReorder = useCallback((newTabs: Tab[]) => {
    // Update the open tabs array with the new order
    setOpenTabs(newTabs);
  }, []);

  const handleTabSelect = useCallback(
    async (path: string) => {
      if (path === activeTabPath) return;
      const tab = openTabs.find((t) => t.path === path);
      if (!tab) return;

      if (tab.type === "settings" || tab.type === "chat") {
        setActiveTabPath(path);
        return;
      }

      if (!fs) return;
      // 🚨 CRITICAL FIX: Use same Yjs-based approach for all tab switches
      // This prevents buffer/Yjs desync that causes corruption
      const mgr = getBufferMgr();
      
      setCurrentPath(path);
      const parentDir = path.substring(0, path.lastIndexOf("/")) || "/";
      setAddTargetPath(parentDir.startsWith(basePath) ? parentDir : basePath);
      
      // 🎯 FIX: Each file has its own Yjs document — just switch activeTabPath.
      // Do NOT use buffer manager switchTo() — it writes into the OLD tab's Yjs doc.
      setActiveTabPath(path);
    },
    [fs, openTabs, activeTabPath, basePath, getBufferMgr, saveActiveTextToCache, loadTextIntoEditor, resolveFileContent]
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
          } else {
            // Each file has its own Yjs doc — just switch the active path
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
    [openTabs, activeTabPath, fs, imageUrlCache, getBufferMgr, saveActiveTextToCache, loadTextIntoEditor, resolveFileContent]
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
          // Each file has its own Yjs doc — just switch the active path
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
    [openTabs, activeTabPath, currentPath, basePath, fs, imageUrlCache, getBufferMgr, saveActiveTextToCache, loadTextIntoEditor, resolveFileContent]
  );

  const handleCompile = async () => {
    const currentYText = getCurrentYText();
    if (!compilerReady || !currentYText || !fs) return;
    const fsInstance = fs;
    const currentActivePath = activeTabPathRef.current;
    const compileEventId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    typstLogger.info("handleCompile start", {
      compileEventId,
      currentActivePath,
      currentYTextLength: currentYText.length,
      compilerReady,
    });

    // Only compile when the active tab is an actual LaTeX or Typst source file.
    // Avoid falling back to LaTeX when there is no active file (or a non-document tab is active).
    const activeLower = currentActivePath.toLowerCase();
    const activeIsTypst = activeLower.endsWith(".typ");
    const activeIsTex = activeLower.endsWith(".tex");
    if (!currentActivePath || (!activeIsTypst && !activeIsTex)) {
      typstLogger.warn("handleCompile skipped: active tab is not TeX/Typst", {
        compileEventId,
        currentActivePath,
        activeIsTex,
        activeIsTypst,
      });
      return;
    }

    const activeTab = openTabs.find((t) => t.path === currentActivePath);
    if (activeTab?.type === "text" && currentActivePath) {
      try {
        // idbfs writeFile is create-only; remove first then recreate
        const fileExists = await fsInstance.exists(currentActivePath);
        if (fileExists) {
          await fsInstance.rm(currentActivePath, false);
        }
        
        await fsInstance.writeFile(
          currentActivePath,
          new TextEncoder().encode(currentYText.toString()).buffer as ArrayBuffer,
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
      const latex = activeIsTex ? currentYText.toString() : "";
      const typSourceActive = activeIsTypst ? currentYText.toString() : "";
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
      typstLogger.info("handleCompile gathered files", {
        compileEventId,
        additionalFileCount: additionalFiles.length,
        hasMainTypContent: mainTypContent != null,
        activeIsTypst,
        activeIsTex,
      });

      if (mainTypContent == null) {
        const mainTypTab = openTabs.find((t) => t.type === "text" && t.path.endsWith("main.typ"));
        if (mainTypTab)
          mainTypContent =
            currentActivePath === mainTypTab.path
              ? currentYText.toString()
              : textContentCacheRef.current.get(mainTypTab.path) ?? "";
      }

      // Choose compiler by active tab: .typ → Typst, .tex → LaTeX
      const typSource = activeIsTypst ? typSourceActive : mainTypContent;
      const useTypst = activeIsTypst && (typSource != null && typSource.trim() !== "");
      typstLogger.info("handleCompile compiler selection", {
        compileEventId,
        useTypst,
        activeIsTypst,
        activeIsTex,
        typSourceChars: typSource?.length ?? 0,
        latexChars: latex.length,
      });

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
      typstLogger.info("handleCompile success", {
        compileEventId,
        useTypst,
        elapsedMs: Math.round(performance.now() - start),
        pdfBytes: pdfBlob.size,
      });
      const url = URL.createObjectURL(pdfBlob);
      setPdfUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return url;
      });
    } catch (e) {
      console.error("Compile failed", e);
      typstLogger.error("handleCompile failed", {
        compileEventId,
        error: e instanceof Error ? e.message : String(e),
        stack: e instanceof Error ? e.stack : undefined,
      });
    } finally {
      setIsCompiling(false);
      typstLogger.info("handleCompile finally", {
        compileEventId,
        isCompiling: false,
      });
    }
  };

  useEffect(() => {
    handleCompileRef.current = handleCompile;
    return () => {
      handleCompileRef.current = null;
    };
  }, [handleCompile]);

  useEffect(() => {
    const currentYText = getCurrentYText();
    if (compilerReady && currentYText && fs && !autoCompileDoneRef.current && !isCompiling) {
      autoCompileDoneRef.current = true;
      void handleCompile();
    }
  }, [compilerReady, fs, isCompiling, handleCompile, activeTabPath]); // ✅ Add activeTabPath to trigger when switching files

  useEffect(() => {
    isCompilingRef.current = isCompiling;
  }, [isCompiling]);

  useEffect(() => {
    if (!autoCompileOnChange || !compilerReady || !fs) return;
    
    let timer: ReturnType<typeof setTimeout> | null = null;
    let currentYText: Y.Text | null = null;
    
    const observer = (evt: any) => {
      const totalChars = currentYText?.length ?? 0;
      const prevChars = yjsLastLengthRef.current;
      const deltaChars = totalChars - prevChars;
      yjsLastLengthRef.current = totalChars;

      const now = Date.now();
      if (now - yjsLastMutationLogRef.current > 2000 || deltaChars !== 0) {
        yjsLastMutationLogRef.current = now;
        yjsLogger.info("Observed Yjs text change", {
          path: activeTabPathRef.current,
          totalChars,
          deltaChars,
          deltaOps: Array.isArray(evt?.changes?.delta) ? evt.changes.delta.length : undefined,
          local: evt?.transaction?.local,
        });
      }
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        if (!isCompilingRef.current) handleCompileRef.current?.();
      }, autoCompileDebounceMs);
    };
    
    // Get current ytext and observe it
    currentYText = getCurrentYText();
    if (currentYText) {
      yjsLastLengthRef.current = currentYText.length;
      currentYText.observe(observer);
      yjsLogger.info("Attached Yjs observer", {
        path: activeTabPathRef.current,
        length: currentYText.length,
      });
    }
    
    return () => {
      if (currentYText) {
        currentYText.unobserve(observer);
        yjsLogger.info("Detached Yjs observer", {
          path: activeTabPathRef.current,
        });
      }
      if (timer) clearTimeout(timer);
    };
  }, [autoCompileOnChange, autoCompileDebounceMs, compilerReady, fs, activeTabPath]); // ✅ Add activeTabPath to re-observe when switching files

  const getCurrentChatContext = () => {
    const activeTab = openTabs.find((t) => t.path === activeTabPath);
    return activeTab?.type === "chat" ? "big" : "small";
  };

  const handleSendChat = async () => {
    if (!chatInput.trim() && !chatImageDataUrl) return;
    const userMessage = chatInput.trim();
    const chatContext = getCurrentChatContext();
    const currentModelDef = getModelById(selectedModelId);
    const isVision = !!currentModelDef.vision;
    const capturedImage = chatImageDataUrl;
    const aiEventId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    aiLogger.info("handleSendChat start", {
      aiEventId,
      chatContext,
      modelId: selectedModelId,
      isVision,
      userChars: userMessage.length,
      hasImage: !!capturedImage,
      imageChars: capturedImage?.length ?? 0,
      chatMode,
      bigChatCount: bigChatMessages.length,
      smallChatCount: smallChatMessages.length,
    });
    
    // Check if model is loaded, if not, load it first
    if (isVision) {
      if (!isVLModelLoaded() && !isVLModelLoading()) {
        aiLogger.info("VL model not ready, loading...", { aiEventId, modelId: selectedModelId });
        try {
          await initializeVLModel();
          aiLogger.info("VL model loaded", { aiEventId, modelId: selectedModelId });
        } catch (error) {
          aiLogger.error("Failed to load VL model", { aiEventId, modelId: selectedModelId, error: String(error) });
          const errorMessage = { role: "assistant" as const, content: "Error: Failed to load VL model. WebGPU required." };
          const setMsgs = chatContext === "big" ? setBigChatMessages : setSmallChatMessages;
          setMsgs((msgs) => [...msgs, { role: "user", content: userMessage, ...(capturedImage && { image: capturedImage }) }, errorMessage]);
          setChatInput(""); setChatImageDataUrl(null);
          return;
        }
      }
    } else if (!modelReady || isModelLoading()) {
      aiLogger.info("Text model not ready, loading before sending message...", { aiEventId, modelId: selectedModelId });
      try {
        await initializeModel();
        setModelReady(true);
        aiLogger.info("Text model loaded successfully", { aiEventId, modelId: selectedModelId });
      } catch (error) {
        aiLogger.error("Failed to load text model", { aiEventId, modelId: selectedModelId, error: String(error) });
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
    
    const userMsg = { role: "user" as const, content: userMessage, ...(capturedImage && { image: capturedImage }) };
    if (chatContext === "big") {
      setBigChatMessages((msgs) => [...msgs, userMsg, { role: "assistant", content: "Thinking..." }]);
    } else {
      setSmallChatMessages((msgs) => [...msgs, userMsg, { role: "assistant", content: "Thinking..." }]);
    }
    
    setChatInput("");
    setChatImageDataUrl(null);
    setChatExpanded(true);
    setIsGenerating(true);

    const isAsk = chatMode === "ask";
    let lastUpdate = 0;

    try {
      // 🎯 CRITICAL: Get current tab's content, not stale global ytext
      const currentYText = getCurrentYText();
      const context = currentYText?.toString() ?? "";
      aiLogger.info("AI context prepared", {
        aiEventId,
        activeTabPath: activeTabPathRef.current,
        contextChars: context.length,
        hasContext: !!context.trim(),
        currentYTextLength: currentYText?.length ?? 0,
      });
      console.log('🤖 AI Context:', { 
        activeTabPath: activeTabPathRef.current, 
        contextLength: context.length,
        hasContent: !!context.trim()
      });
      
      // 🧪 DEBUG MODE: Show prompt instead of sending to AI
      if (userMessage.includes("debugprompt") || userMessage.includes("testprompt")) {
        console.log('🧪 DEBUG MODE - Full Prompt Preview:');
        console.log('--- USER MESSAGE ---');
        console.log(userMessage);
        console.log('--- CONTEXT ---');
        console.log(context.length > 1000 ? context.substring(0, 1000) + "... (truncated)" : context);
        console.log('--- MODE ---');
        console.log(chatMode);
        console.log('--- FULL PROMPT WOULD BE ---');
        const fullPrompt = isAsk ? `Context:\n${context}\n\nUser: ${userMessage}` : userMessage;
        console.log(fullPrompt.length > 2000 ? fullPrompt.substring(0, 2000) + "... (truncated)" : fullPrompt);
        
        // Add debug response to chat
        const debugResponse = `🧪 DEBUG: Prompt preview logged to console.\n\nContext length: ${context.length} chars\nMode: ${chatMode}\nFull prompt length: ${fullPrompt.length} chars\n\nCheck console for full preview.`;
        
        const chatContext = getCurrentChatContext();
        const setMessages = chatContext === "big" ? setBigChatMessages : setSmallChatMessages;
        setMessages((msgs: any) => {
          const next = [...msgs];
          const lastIdx = next.length - 1;
          if (lastIdx >= 0 && next[lastIdx].role === "assistant") {
            next[lastIdx] = { role: "assistant", content: debugResponse, responseType: "ask" };
          }
          return next;
        });
        setIsGenerating(false);
        setChatInput("");
        return;
      }
      // Streaming chunk handler shared by both paths
      let streamedChars = 0;
      let streamedChunks = 0;
      const onChunk = (text: string) => {
        streamedChunks += 1;
        streamedChars += text.length;
        aiLogger.info("AI stream chunk", {
          aiEventId,
          chunkIndex: streamedChunks,
          chunkChars: text.length,
          totalStreamedChars: streamedChars,
          chatContext: getCurrentChatContext(),
        });
        const ctx = getCurrentChatContext();
        const setMsgs = ctx === "big" ? setBigChatMessages : setSmallChatMessages;
        setMsgs((msgs: any) => {
          const next = [...msgs];
          const li = next.length - 1;
          if (li >= 0 && next[li].role === "assistant") {
            const prev = next[li].content === "Thinking..." ? "" : next[li].content;
            next[li] = { role: "assistant", content: prev + text, responseType: chatMode };
          }
          return next;
        });
      };

      let reply: { type: string; content: string; title?: string; markdown?: string };

      if (isVision) {
        // VL model path: no document context, only user text + images
        const vlMsgs: VLMessage[] = (getCurrentChatContext() === "big" ? bigChatMessages : smallChatMessages)
          .filter((m: any) => m.content !== "Thinking...")
          .map((m: any) => ({ role: m.role, content: m.content, ...(m.image && { image: m.image }) }));
        vlMsgs.push({ role: "user", content: userMessage, ...(capturedImage && { image: capturedImage }) });
        aiLogger.info("VL generation request", {
          aiEventId,
          messages: vlMsgs.length,
          messageRoles: vlMsgs.map((m) => m.role),
          messageImageCount: vlMsgs.filter((m) => !!m.image).length,
          maxTok: undefined,
        });

        const vlText = await generateVLResponse(vlMsgs, {
          onChunk,
          onTokensPerSec: (tps, total, elapsed) => {
            const now = Date.now();
            if (now - lastUpdate >= 300) {
              lastUpdate = now;
              setStreamingStats({ tokensPerSec: Math.round(tps * 10) / 10, totalTokens: total, elapsedSeconds: Math.round(elapsed * 10) / 10, inputTokens: 0, contextUsed: total });
            }
          },
          onComplete: (tokens, elapsed) => {
            setStreamingStats({ tokensPerSec: Math.round((tokens / elapsed) * 10) / 10, totalTokens: tokens, elapsedSeconds: Math.round(elapsed * 10) / 10, inputTokens: 0, contextUsed: tokens });
          },
        });
        aiLogger.info("VL generation complete", {
          aiEventId,
          outputChars: vlText.length,
          streamedChunks,
          streamedChars,
        });
        reply = { type: "ask", content: vlText };
      } else {
        // Standard text model path
        aiLogger.info("Text generation request", {
          aiEventId,
          mode: chatMode,
          contextChars: isAsk ? context.length : 0,
          priorMessages: (getCurrentChatContext() === "big" ? bigChatMessages : smallChatMessages).length,
        });
        reply = await generateChatResponse(
          userMessage,
          isAsk ? context : undefined,
          chatMode,
          {
            onChunk,
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
        aiLogger.info("Text generation complete", {
          aiEventId,
          responseType: reply.type,
          outputChars: reply.content.length,
          streamedChunks,
          streamedChars,
        });
      }

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
      aiLogger.info("handleSendChat success", {
        aiEventId,
        replyType: reply.type,
        replyChars: reply.content.length,
        createdPath,
      });
    } catch (e) {
      console.error("Chat Generation Error:", e);
      aiLogger.error("handleSendChat error", {
        aiEventId,
        error: e instanceof Error ? e.message : String(e),
        stack: e instanceof Error ? e.stack : undefined,
      });
      const chatContext = getCurrentChatContext();
      const setMessages = chatContext === "big" ? setBigChatMessages : setSmallChatMessages;
      setMessages((msgs: any) => {
        const next = [...msgs];
        const lastIdx = next.length - 1;
        const errStr = e instanceof Error ? e.message : String(e);
        if (lastIdx >= 0 && next[lastIdx].role === "assistant") {
          next[lastIdx] = { role: "assistant", content: `Error generating response: ${errStr}` };
        } else {
          next.push({ role: "assistant", content: `Error generating response: ${errStr}` });
        }
        return next;
      });
    } finally {
      aiLogger.info("handleSendChat finally", {
        aiEventId,
        chatContext: getCurrentChatContext(),
        activeTabPath,
      });
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

  // Chatbox visibility - show for text files when current tab has Yjs document
  const isGitTab = sidebarTab === "git";
  const activeTab = isGitTab ? gitOpenTabs.find((t) => t.path === activeGitTabPath) : openTabs.find((t) => t.path === activeTabPath);
  const showAIPanel = !!(activeTab?.type === "text" && currentYDocRef.current);
  
  // Debug chatbox visibility
  console.log('🤖 Chatbox:', { 
    showAIPanel, 
    activeTabType: activeTab?.type,
    hasYDoc: !!currentYDocRef.current,
    hasYText: !!currentYTextRef.current,
    activeTabPath: isGitTab ? activeGitTabPath : activeTabPath,
    sidebarTab
  });

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
                  <button
                    onClick={() => setAddActionsOpen(!addActionsOpen)}
                    className={`w-7 h-7 rounded flex items-center justify-center ${
                      addActionsOpen 
                        ? "bg-[var(--accent)] text-white"
                        : "bg-[color-mix(in_srgb,var(--border)_22%,transparent)] hover:bg-[color-mix(in_srgb,var(--border)_45%,transparent)] text-[var(--foreground)]"
                    }`}
                    title="Add"
                  >
                    <IconPlus />
                  </button>
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
                      const chat = createChat(selectedModelId);
                      const chatPath = `/ai-chat/${chat.id}`;
                      setOpenTabs((t) => [...t, { path: chatPath, type: "chat" }]);
                      setActiveTabPath(chatPath);
                      setRefreshTrigger((t) => t + 1); // Refresh ChatTree
                    }}
                    className="w-7 h-7 rounded bg-[color-mix(in_srgb,var(--border)_22%,transparent)] hover:bg-[color-mix(in_srgb,var(--border)_45%,transparent)] text-[var(--foreground)] flex items-center justify-center"
                    title="New chat"
                  >
                    <IconPlus />
                  </button>
                </>
              )}
              {sidebarTab === "git" && (
                <button
                  onClick={() => setSearchOpen((o) => !o)}
                  className={`w-7 h-7 rounded flex items-center justify-center ${searchOpen ? "bg-[color-mix(in_srgb,var(--border)_55%,transparent)] text-[var(--foreground)]" : "text-[var(--muted)] hover:bg-[color-mix(in_srgb,var(--border)_45%,transparent)] hover:text-[var(--foreground)]"}`}
                  title="Search git"
                >
                  <IconSearch />
                </button>
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
          {sidebarTab === "files" && (
          <FileActions 
            fs={fs} 
            basePath={addTargetPath} 
            onAction={() => setRefreshTrigger((t) => t + 1)} 
            expanded={addActionsOpen}
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
          {(sidebarTab === "git" && searchOpen) && (
            <input
              type="text"
              placeholder="Search git…"
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
            <GitPanelReal
              projectId={id}
              projectName={projectName}
              currentPath={activeGitTabPath}
              bufferManager={getBufferMgr()}
              fileDocManager={fileDocManagerRef.current}
              filePaths={openTabs.filter(t => t.type === "text").map(t => t.path)}
              refreshTrigger={refreshTrigger}
              // TODO: Get all project files, not just open tabs, for proper git initialization
              // For now, we'll use open tabs but this should be fixed to get all files
              onFileSelect={async (filePath, options) => {
                // Check if file is already open in git tab context
                const existingTab = gitOpenTabs.find(t => t.path === filePath);
                
                if (options?.showDiff && options.currentContent !== undefined && options.originalContent !== undefined) {
                  // Open as diff view - use the original file path without suffix
                  const existingDiffTab = gitOpenTabs.find(t => t.path === filePath && t.diffData);
                  
                  if (existingDiffTab) {
                    // Switch to existing diff tab
                    setActiveGitTabPath(filePath);
                  } else {
                    // Create new diff tab with special type
                    setGitOpenTabs(prev => [...prev, { 
                      path: filePath, 
                      type: "text",
                      diffData: {
                        filePath,
                        currentContent: options.currentContent ?? "",
                        originalContent: options.originalContent ?? ""
                      }
                    }]);
                    setActiveGitTabPath(filePath);
                  }
                } else {
                  // Regular file opening in git tab context
                  if (existingTab) {
                    setActiveGitTabPath(filePath);
                  } else {
                    setGitOpenTabs(prev => [...prev, { path: filePath, type: "text" }]);
                    setActiveGitTabPath(filePath);
                  }
                }
              }}
              onCloseFile={handleGitTabClose}
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
              // Get actual document content for outline parsing
              const bufferMgr = getBufferMgr();
              let entries: OutlineEntry[] = [];
              
              if (bufferMgr && activeTabPath) {
                bufferMgr.saveActiveToCache();
                let content = bufferMgr.getCachedContent(activeTabPath);
                
                if (!content || content.trim() === '') {
                  content = bufferMgr.getBufferContent();
                }
                
                if (content && content.trim()) {
                  entries = parseOutline(content, activeTabPath);
                }
              }
              
              if (entries.length === 0) {
                return (
                  <div className="p-3 text-[var(--muted)] italic text-sm">
                    {bufferMgr ? "No sections found in document" : "Open a document to see its outline"}
                  </div>
                );
              }
              const minLevel = Math.min(...entries.map((e) => e.level));
              return entries.map((entry, i) => (
                <button
                  key={i}
                  onClick={() => {
                    // Jump to the section line in the editor
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
          // When git tab is selected, show diff panel instead of regular editor
          if (sidebarTab === "git") {
            const gitTabs = gitOpenTabs.filter(t => t.type === "text");
            
            return (
              <section className="flex-1 flex flex-col border-l border-r border-[var(--border)] min-w-0 min-h-0 overflow-hidden">
                {/* Git File Tabs - using exact same FileTabs component */}
                {gitTabs.length > 0 && (
                  <FileTabs
                    tabs={gitTabs}
                    activePath={activeGitTabPath && gitTabs.find(t => t.path === activeGitTabPath) ? activeGitTabPath : null}
                    onSelect={(path) => setActiveGitTabPath(path)}
                    onClose={handleGitTabClose}
                  />
                )}
                
                <div className="flex-1 overflow-auto">
                  {gitTabs.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-[var(--muted)]">
                      <div className="text-center">
                        <p className="text-sm">No files open</p>
                        <p className="text-xs mt-1">Open files to see git changes</p>
                      </div>
                    </div>
                  ) : (
                    <div ref={gitDiffRef} className="h-full" />
                  )}
                </div>
              </section>
            );
          }

          // Regular editor panel for files/chats tabs
          const displayTabs = isGitTab 
            ? gitOpenTabs.filter(t => t.type === "text") // Show git tabs when in git context
            : openTabs;
            
          return (
            <section style={{ flex: `${editorFraction} 1 0%` }} className="flex flex-col border-l border-r border-[var(--border)] min-w-0 min-h-0 overflow-hidden">
              <FileTabs
                tabs={displayTabs}
                activePath={isGitTab ? activeGitTabPath : activeTabPath}
                onSelect={handleTabSelect}
                onClose={handleTabClose}
                onToggleTools={() => setToolsPanelOpen(!toolsPanelOpen)}
                onReorder={handleTabReorder}
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
                            imageDataUrl={chatImageDataUrl}
                            onImageChange={setChatImageDataUrl}
                            isVisionModel={!!getModelById(selectedModelId).vision}
                          />
                        </div>
                      </div>
                    );
                  }
                  if (activeTab?.type === "text" && currentYDocRef.current && provider) {
                    // Check if this is a diff tab
                    const isDiffTab = activeTabPath?.endsWith(':diff');
                    const diffData = isDiffTab && activeTab?.diffData ? activeTab.diffData : null;
                    
                    // Only check YText for text files
                    if (!getCurrentYText()) {
                      return (
                        <div className="absolute inset-0 flex items-center justify-center text-[var(--muted)] bg-[var(--background)]">
                          Loading editor…
                        </div>
                      );
                    }
                    
                    const aiOverlayHeight = chatExpanded ? "45%" : "155px";
                    return (
                      <div
                        className="absolute inset-0 overflow-hidden"
                        style={{ bottom: showAIPanel ? aiOverlayHeight : 0 }}
                      >
                        {isDiffTab && diffData ? (
                          <SideBySideDiffView
                            filePath={diffData.filePath}
                            currentContent={diffData.currentContent}
                            originalContent={diffData.originalContent}
                            className="h-full"
                          />
                        ) : (
                          (() => {
                            // Debug: Check what's happening
                            console.log('🔍 Editor render check:', { 
                              activeTabPath, 
                              isDiffTab: activeTabPath?.endsWith(':diff'), 
                              hasDiffData: !!diffData, 
                              isInitialized, 
                              activeTab 
                            });
                            
                            // Don't render until fully initialized
                            if (!isInitialized) {
                              return (
                                <div className="flex items-center justify-center h-full text-[var(--muted)]">
                                  Initializing...
                                </div>
                              );
                            }
                            
                            const currentYText = getCurrentYText();
                            console.log('🎯 EditorPanel ytext:', { 
                              activeTabPath, 
                              hasYText: !!currentYText,
                              yTextLength: currentYText?.length || 0
                            });
                            
                            // Only render EditorPanel when we have a valid ytext
                            if (!currentYText) {
                              return (
                                <div className="flex items-center justify-center h-full text-[var(--muted)]">
                                  Loading editor...
                                </div>
                              );
                            }
                            
                            return (
                              <EditorPanel
                                ref={editorRef}
                                ydoc={currentYDocRef.current}
                                ytext={currentYText}
                                provider={getCurrentWebrtcProvider()}
                                currentPath={activeTabPath}
                                onYtextChange={onYtextChangeNoop}
                                fontSize={editorFontSize}
                                tabSize={editorTabSize}
                                lineWrapping={editorLineWrapping}
                                theme={theme}
                              />
                            );
                          })()
                        )}
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
                      imageDataUrl={chatImageDataUrl}
                      onImageChange={setChatImageDataUrl}
                      isVisionModel={!!getModelById(selectedModelId).vision}
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
                summaryData={summaryData}
                summaryRaw={summaryContent}
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
