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
import { latex } from "codemirror-lang-latex";
import type { Theme } from "@/lib/settings";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags as t } from "@lezer/highlight";

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
  theme?: Theme;
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
  },
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
  }), []);

  const initEditor = useCallback(() => {
    if (!containerRef.current || !ydoc || !ytext || !provider) return;

    if (viewRef.current) {
      viewRef.current.destroy();
      viewRef.current = null;
    }

    ytextRef.current = ytext;
    const undoManager = new Y.UndoManager(ytext);

    provider.awareness.setLocalStateField("user", {
      name: "User " + Math.floor(Math.random() * 100),
      color: "#3b82f6",
      colorLight: "#3b82f633",
    });

    const indentStr = " ".repeat(Math.max(1, Math.min(8, Math.round(tabSize))));
    const isTypst = currentPath.toLowerCase().endsWith(".typ");
    const langSupport = isTypst && typstSupport ? typstSupport : latex();

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
              // Dark (default) palette tuned to match app dark surface (no oneDark background overrides)
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
      langSupport,
      yCollab(ytext, provider.awareness, { undoManager }),
    ];
    if (lineWrapping) extensions.push(EditorView.lineWrapping);

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
  }, [ydoc, ytext, provider, onYtextChange, fontSize, tabSize, lineWrapping, currentPath, typstSupport, theme]);

  useEffect(() => {
    initEditor();
    return () => {
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
