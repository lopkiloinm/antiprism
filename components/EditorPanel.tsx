"use client";

import { useEffect, useRef, useCallback, forwardRef, useImperativeHandle, useState } from "react";
import * as Y from "yjs";
import { WebrtcProvider } from "y-webrtc";
import { EditorView, basicSetup } from "codemirror";
import { keymap } from "@codemirror/view";
import { indentWithTab } from "@codemirror/commands";
import { oneDark } from "@codemirror/theme-one-dark";
import type { LanguageSupport } from "@codemirror/language";
import { indentUnit } from "@codemirror/language";
import { yCollab } from "y-codemirror.next";
import { EditorState } from "@codemirror/state";
import { latex } from "codemirror-lang-latex";

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
}

const DEFAULT_FONT_SIZE = 14;
const DEFAULT_TAB_SIZE = 4;

export const EditorPanel = forwardRef<EditorPanelHandle, EditorPanelProps>(function EditorPanel(
  { ydoc, ytext, provider, currentPath, onYtextChange, fontSize = DEFAULT_FONT_SIZE, tabSize = DEFAULT_TAB_SIZE, lineWrapping = true },
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
    const extensions = [
      basicSetup,
      keymap.of([indentWithTab]),
      oneDark,
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
  }, [ydoc, ytext, provider, onYtextChange, fontSize, tabSize, lineWrapping, currentPath, typstSupport]);

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
