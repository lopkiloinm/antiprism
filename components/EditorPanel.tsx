"use client";

import { useEffect, useRef, useCallback, forwardRef, useImperativeHandle, useState } from "react";
import * as Y from "yjs";
import { WebrtcProvider } from "y-webrtc";
import { EditorView, basicSetup } from "codemirror";
import { keymap } from "@codemirror/view";
import { indentWithTab } from "@codemirror/commands";
import type { LanguageSupport } from "@codemirror/language";
import { indentUnit } from "@codemirror/language";
import { yCollab } from "y-codemirror.next";
import { EditorState } from "@codemirror/state";
import { scrollPastEnd } from "@codemirror/view";
import { latex } from "codemirror-lang-latex";
import { json } from "@codemirror/lang-json";
import type { Theme } from "@/lib/settings";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags as t } from "@lezer/highlight";
import { showMinimap } from "@replit/codemirror-minimap";
import { yjsLogger } from "@/lib/logger";

const DEFAULT_LATEX = `\\documentclass{article}
\\usepackage{amsmath}

\\begin{document}
\\section{Introduction}
Hello, Antiprism!

\\begin{equation}
E = mc^2
\\end{equation}
\\end{document}
`;

export interface EditorPanelHandle {
  insertAtCursor: (text: string) => void;
  gotoLine: (line: number) => void;
}

interface EditorPanelProps {
  ydoc: Y.Doc | null;
  ytext: Y.Text | null;
  provider: WebrtcProvider | null;
  currentPath: string;
  onYtextChange: (ytext: Y.Text | null) => void;
  /** Editor appearance (from settings). Takes effect when changed. */
  fontSize?: number;
  tabSize?: number;
  lineWrapping?: boolean;
  theme?: "light" | "dark";
  /** Whether the editor should be read-only */
  readOnly?: boolean;
}

const DEFAULT_FONT_SIZE = 14;
const DEFAULT_TAB_SIZE = 4;

export const EditorPanel = forwardRef<EditorPanelHandle, EditorPanelProps>(function EditorPanel(
  {
    ydoc,
    ytext,
    provider,
    currentPath,
    onYtextChange,
    fontSize = DEFAULT_FONT_SIZE,
    tabSize = DEFAULT_TAB_SIZE,
    lineWrapping = true,
    theme = "dark",
    readOnly = false,
  }: EditorPanelProps,
  ref
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const ytextRef = useRef<Y.Text | null>(null);
  const [typstSupport, setTypstSupport] = useState<LanguageSupport | null>(null);

  // Load codemirror-lang-typst only on client when needed (avoids WASM in prerender/static export)
  useEffect(() => {
    if (typeof window === "undefined" || !currentPath.toLowerCase().endsWith(".typ")) return;
    let cancelled = false;
    import("codemirror-lang-typst")
      .then((mod) => {
        if (!cancelled) setTypstSupport(mod.typst());
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [currentPath]);

  useImperativeHandle(ref, () => ({
    insertAtCursor(text: string) {
      const view = viewRef.current;
      const y = ytextRef.current;
      if (!view || !y) return;
      const pos = view.state.selection.main.head;
      y.insert(pos, text);
    },
    gotoLine(line: number) {
      const view = viewRef.current;
      if (!view) return;
      const clampedLine = Math.max(1, Math.min(line, view.state.doc.lines));
      const lineInfo = view.state.doc.line(clampedLine);
      view.dispatch({
        selection: { anchor: lineInfo.from },
        scrollIntoView: true,
      });
      view.focus();
    },
  }), []);

  const initEditor = useCallback(() => {
    if (!containerRef.current || !ydoc || !ytext) return;

    if (viewRef.current) {
      viewRef.current.destroy();
      viewRef.current = null;
    }

    ytextRef.current = ytext;
    const undoManager = new Y.UndoManager(ytext);

    const ytextObserver = (update: any, origin: any) => {
      const originLabel =
        typeof origin === "string"
          ? origin
          : origin?.constructor?.name || (origin == null ? "unknown" : typeof origin);
      console.log(`⌨️ Editor update: ${currentPath}`, { 
        origin, 
        updateLength: update.changes.length,
        contentLength: ytext.toString().length,
        timestamp: new Date().toISOString()
      });
      yjsLogger.info("EditorPanel Y.Text mutation", {
        path: currentPath,
        docGuid: ydoc.guid,
        origin: originLabel,
        rawOriginType: typeof origin,
        totalChars: ytext.length,
        deltaOps: Array.isArray(update?.changes?.delta) ? update.changes.delta.length : undefined,
        selectionMainHead: viewRef.current?.state?.selection?.main?.head,
      });
    };
    ytext.observe(ytextObserver);
    yjsLogger.info("EditorPanel attached Y.Text observer", {
      path: currentPath,
      docGuid: ydoc.guid,
      totalChars: ytext.length,
      hasProvider: !!provider,
    });

    if (provider) {
      provider.awareness.setLocalStateField("user", {
        name: "User " + Math.floor(Math.random() * 100),
        color: "#3b82f6",
        colorLight: "#3b82f633",
      });
    }

    const indentStr = " ".repeat(Math.max(1, Math.min(8, Math.round(tabSize))));
    const isTypst = currentPath.toLowerCase().endsWith(".typ");
    const isJson = currentPath.toLowerCase().endsWith(".json");
    
    // Use appropriate language support
    let langSupport: LanguageSupport | undefined;
    if (isTypst && typstSupport) {
      langSupport = typstSupport;
    } else if (isJson) {
      langSupport = json();
    } else {
      langSupport = latex();
    }

    const isLightTheme = theme === "light";

    const highlight = HighlightStyle.define(
      isLightTheme
        ? [
            // Core syntax
            { tag: [t.keyword, t.modifier, t.operatorKeyword], color: "#7c3aed" },
            { tag: [t.string, t.special(t.string)], color: "#b45309" },
            { tag: [t.number, t.bool, t.null], color: "#2563eb" },
            { tag: [t.function(t.variableName), t.function(t.propertyName)], color: "#0f766e" },
            { tag: [t.definition(t.variableName), t.variableName], color: "#111827" },
            { tag: [t.typeName, t.className], color: "#0f766e" },
            { tag: [t.comment], color: "#6b7280", fontStyle: "italic" },
            
            // Additional name variants
            { tag: [t.name, t.tagName, t.attributeName, t.labelName, t.namespace, t.macroName], color: "#111827" },
            { tag: [t.propertyName], color: "#0f766e" },
            
            // Additional literals
            { tag: [t.character, t.attributeValue, t.docString], color: "#b45309" },
            { tag: [t.integer, t.float], color: "#2563eb" },
            { tag: [t.regexp], color: "#b45309" },
            { tag: [t.escape], color: "#dc2626" },
            { tag: [t.color, t.url], color: "#2563eb", textDecoration: "underline" },
            
            // Additional keywords
            { tag: [t.self, t.atom, t.unit], color: "#7c3aed" },
            { tag: [t.controlKeyword, t.definitionKeyword, t.moduleKeyword], color: "#7c3aed" },
            
            // Operators
            { tag: [t.operator], color: "#6b7280" },
            { tag: [t.derefOperator, t.arithmeticOperator, t.logicOperator, t.bitwiseOperator, t.compareOperator, t.updateOperator, t.definitionOperator, t.typeOperator, t.controlOperator], color: "#6b7280" },
            { tag: [t.punctuation, t.separator], color: "#6b7280" },
            
            // Brackets
            { tag: [t.bracket, t.angleBracket, t.squareBracket, t.paren, t.brace], color: "#6b7280" },
            
            // Content
            { tag: [t.content], color: "#111827" },
            { tag: [t.heading, t.heading1, t.heading2, t.heading3, t.heading4, t.heading5, t.heading6], color: "#111827", fontWeight: "600" },
            { tag: [t.contentSeparator], color: "#6b7280" },
            { tag: [t.list, t.quote], color: "#111827" },
            { tag: [t.monospace], color: "#111827", fontFamily: "ui-monospace, SFMono-Regular, 'SF Mono', Consolas, 'Liberation Mono', Menlo, monospace" },
            { tag: [t.strikethrough], color: "#6b7280", textDecoration: "line-through" },
            
            // Change tracking
            { tag: [t.inserted], color: "#166534", backgroundColor: "rgba(34, 197, 94, 0.1)" },
            { tag: [t.deleted], color: "#dc2626", backgroundColor: "rgba(239, 68, 68, 0.1)" },
            { tag: [t.changed], color: "#ca8a04", backgroundColor: "rgba(250, 204, 21, 0.1)" },
            
            // Special
            { tag: [t.invalid], color: "#dc2626", backgroundColor: "rgba(239, 68, 68, 0.1)" },
            { tag: [t.meta, t.documentMeta, t.annotation, t.processingInstruction], color: "#6b7280", fontStyle: "italic" },
            
            // Modifiers
            { tag: [t.definition(t.name)], color: "#0f766e", fontWeight: "600" },
            { tag: [t.constant(t.name)], color: "#2563eb" },
            { tag: [t.standard(t.name)], color: "#7c3aed" },
            { tag: [t.local(t.name)], color: "#111827" },
            { tag: [t.special(t.name), t.special(t.string)], color: "#ca8a04" },
          ]
          : [
              // Core syntax (dark mode)
              { tag: [t.keyword, t.modifier, t.operatorKeyword], color: "#93c5fd" },
              { tag: [t.string, t.special(t.string)], color: "#fca5a5" },
              { tag: [t.number, t.bool, t.null], color: "#a7f3d0" },
              { tag: [t.function(t.variableName), t.function(t.propertyName)], color: "#67e8f9" },
              { tag: [t.definition(t.variableName), t.variableName], color: "#e5e7eb" },
              { tag: [t.typeName, t.className], color: "#fcd34d" },
              { tag: [t.comment], color: "#9ca3af", fontStyle: "italic" },
              { tag: [t.heading, t.strong], color: "#e5e7eb", fontWeight: "600" },
              { tag: [t.link, t.url], color: "#93c5fd", textDecoration: "underline" },
              
              // Additional name variants (dark mode)
              { tag: [t.name, t.tagName, t.attributeName, t.labelName, t.namespace, t.macroName], color: "#e5e7eb" },
              { tag: [t.propertyName], color: "#fcd34d" },
              
              // Additional literals (dark mode)
              { tag: [t.character, t.attributeValue, t.docString], color: "#fca5a5" },
              { tag: [t.integer, t.float], color: "#a7f3d0" },
              { tag: [t.regexp], color: "#fca5a5" },
              { tag: [t.escape], color: "#f87171" },
              { tag: [t.color, t.url], color: "#93c5fd", textDecoration: "underline" },
              
              // Additional keywords (dark mode)
              { tag: [t.self, t.atom, t.unit], color: "#93c5fd" },
              { tag: [t.controlKeyword, t.definitionKeyword, t.moduleKeyword], color: "#93c5fd" },
              
              // Operators (dark mode)
              { tag: [t.operator], color: "#9ca3af" },
              { tag: [t.derefOperator, t.arithmeticOperator, t.logicOperator, t.bitwiseOperator, t.compareOperator, t.updateOperator, t.definitionOperator, t.typeOperator, t.controlOperator], color: "#9ca3af" },
              { tag: [t.punctuation, t.separator], color: "#9ca3af" },
              
              // Brackets (dark mode)
              { tag: [t.bracket, t.angleBracket, t.squareBracket, t.paren, t.brace], color: "#9ca3af" },
              
              // Content (dark mode)
              { tag: [t.content], color: "#e5e7eb" },
              { tag: [t.heading, t.heading1, t.heading2, t.heading3, t.heading4, t.heading5, t.heading6], color: "#e5e7eb", fontWeight: "600" },
              { tag: [t.contentSeparator], color: "#9ca3af" },
              { tag: [t.list, t.quote], color: "#e5e7eb" },
              { tag: [t.monospace], color: "#e5e7eb", fontFamily: "ui-monospace, SFMono-Regular, 'SF Mono', Consolas, 'Liberation Mono', Menlo, monospace" },
              { tag: [t.strikethrough], color: "#9ca3af", textDecoration: "line-through" },
              
              // Change tracking (dark mode)
              { tag: [t.inserted], color: "#86efac", backgroundColor: "rgba(34, 197, 94, 0.15)" },
              { tag: [t.deleted], color: "#fca5a5", backgroundColor: "rgba(239, 68, 68, 0.15)" },
              { tag: [t.changed], color: "#fde047", backgroundColor: "rgba(250, 204, 21, 0.15)" },
              
              // Special (dark mode)
              { tag: [t.invalid], color: "#fca5a5", backgroundColor: "rgba(239, 68, 68, 0.15)" },
              { tag: [t.meta, t.documentMeta, t.annotation, t.processingInstruction], color: "#9ca3af", fontStyle: "italic" },
              
              // Modifiers (dark mode)
              { tag: [t.definition(t.name)], color: "#fcd34d", fontWeight: "600" },
              { tag: [t.constant(t.name)], color: "#a7f3d0" },
              { tag: [t.standard(t.name)], color: "#93c5fd" },
              { tag: [t.local(t.name)], color: "#e5e7eb" },
              { tag: [t.special(t.name), t.special(t.string)], color: "#fde047" },
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
        },
        ".cm-gutters": {
          backgroundColor: "var(--cm-gutter-bg, color-mix(in srgb, var(--background) 92%, black))",
          color: "var(--muted)",
          borderRight: "1px solid var(--border)",
        },
        ".cm-activeLine": {
          backgroundColor: "color-mix(in srgb, var(--accent) 10%, transparent)",
        },
        ".cm-activeLineGutter": {
          backgroundColor: "color-mix(in srgb, var(--accent) 14%, transparent)",
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
      },
      { dark: !isLightTheme }
    );

    const extensions = [
      basicSetup,
      keymap.of([indentWithTab]),
      cmBaseTheme,
      syntaxHighlighting(highlight),
      indentUnit.of(indentStr),
      EditorView.theme({
        "&.cm-editor .cm-scroller": { fontSize: `${Math.max(10, Math.min(24, fontSize))}px` },
      }),
      ...(langSupport ? [langSupport] : []),
      ...(provider ? [yCollab(ytext, provider.awareness, { undoManager })] : []),
      ...(readOnly ? [EditorState.readOnly.of(true)] : []),
      scrollPastEnd(),
    ];
    if (lineWrapping) extensions.push(EditorView.lineWrapping);

    // Minimap
    extensions.push(
      showMinimap.compute(["doc"], () => ({
        create: () => {
          const dom = document.createElement("div");
          dom.style.cssText = "background: var(--background); opacity: 0.85;";
          return { dom };
        },
        displayText: "blocks",
        showOverlay: "always",
        gutters: [{ 1: "#888" }],
      }))
    );

    const state = EditorState.create({
      doc: ytext.toString(),
      extensions,
    });

    const view = new EditorView({
      state,
      parent: containerRef.current,
    });

    viewRef.current = view;
    onYtextChange(ytext);

    return () => {
      ytext.unobserve(ytextObserver);
      yjsLogger.info("EditorPanel detached Y.Text observer", {
        path: currentPath,
        docGuid: ydoc.guid,
      });
    };
  }, [ydoc, ytext, provider, onYtextChange, fontSize, tabSize, lineWrapping, currentPath, typstSupport, theme]);

  useEffect(() => {
    const cleanupInit = initEditor();
    return () => {
      if (typeof cleanupInit === "function") cleanupInit();
      if (viewRef.current) {
        viewRef.current.destroy();
        viewRef.current = null;
      }
    };
  }, [initEditor]);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 w-full min-h-0"
      style={{ minHeight: 0 }}
    />
  );
});

export { DEFAULT_LATEX };
