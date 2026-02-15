"use client";

import { useEffect, useRef, useCallback } from "react";
import * as Y from "yjs";
import { WebrtcProvider } from "y-webrtc";
import { EditorView, basicSetup } from "codemirror";
import { oneDark } from "@codemirror/theme-one-dark";
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

interface EditorPanelProps {
  ydoc: Y.Doc | null;
  ytext: Y.Text | null;
  provider: WebrtcProvider | null;
  currentPath: string;
  onYtextChange: (ytext: Y.Text | null) => void;
}

export function EditorPanel({
  ydoc,
  ytext,
  provider,
  currentPath,
  onYtextChange,
}: EditorPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const ytextRef = useRef<Y.Text | null>(null);

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

    const state = EditorState.create({
      doc: ytext.toString(),
      extensions: [
        basicSetup,
        oneDark,
        EditorView.lineWrapping,
        latex(),
        yCollab(ytext, provider.awareness, { undoManager }),
      ],
    });

    const view = new EditorView({
      state,
      parent: containerRef.current,
    });

    viewRef.current = view;
    onYtextChange(ytext);
  }, [ydoc, ytext, provider, onYtextChange]);

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
}

export { DEFAULT_LATEX };
