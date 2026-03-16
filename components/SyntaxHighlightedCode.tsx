"use client";

import { useEffect, useRef, useState } from "react";
import { EditorState, type Extension } from "@codemirror/state";
import { HighlightStyle, syntaxHighlighting, type LanguageSupport } from "@codemirror/language";
import { EditorView } from "@codemirror/view";
import { tags as t } from "@lezer/highlight";
import { latex } from "codemirror-lang-latex";
import { json } from "@codemirror/lang-json";
import { useTheme } from "@/contexts/ThemeContext";

interface SyntaxHighlightedCodeProps {
  content: string;
  filePath?: string;
  className?: string;
}

function getHighlight(theme: "light" | "dark") {
  const isLightTheme = theme === "light";

  return HighlightStyle.define(
    isLightTheme
      ? [
          { tag: [t.keyword, t.modifier, t.operatorKeyword], color: "#7c3aed" },
          { tag: [t.string, t.special(t.string)], color: "#b45309" },
          { tag: [t.number, t.bool, t.null], color: "#2563eb" },
          { tag: [t.function(t.variableName), t.function(t.propertyName)], color: "#0f766e" },
          { tag: [t.definition(t.variableName), t.variableName], color: "#111827" },
          { tag: [t.typeName, t.className], color: "#0f766e" },
          { tag: [t.comment], color: "#6b7280", fontStyle: "italic" },
          { tag: [t.name, t.tagName, t.attributeName, t.labelName, t.namespace, t.macroName], color: "#111827" },
          { tag: [t.propertyName], color: "#0f766e" },
          { tag: [t.character, t.attributeValue, t.docString], color: "#b45309" },
          { tag: [t.integer, t.float], color: "#2563eb" },
          { tag: [t.regexp], color: "#b45309" },
          { tag: [t.escape], color: "#dc2626" },
          { tag: [t.color, t.url], color: "#2563eb", textDecoration: "underline" },
          { tag: [t.self, t.atom, t.unit], color: "#7c3aed" },
          { tag: [t.controlKeyword, t.definitionKeyword, t.moduleKeyword], color: "#7c3aed" },
          { tag: [t.operator], color: "#6b7280" },
          { tag: [t.derefOperator, t.arithmeticOperator, t.logicOperator, t.bitwiseOperator, t.compareOperator, t.updateOperator, t.definitionOperator, t.typeOperator, t.controlOperator], color: "#6b7280" },
          { tag: [t.punctuation, t.separator], color: "#6b7280" },
          { tag: [t.bracket, t.angleBracket, t.squareBracket, t.paren, t.brace], color: "#6b7280" },
          { tag: [t.content], color: "#111827" },
          { tag: [t.heading, t.heading1, t.heading2, t.heading3, t.heading4, t.heading5, t.heading6], color: "#111827", fontWeight: "600" },
          { tag: [t.contentSeparator], color: "#6b7280" },
          { tag: [t.list, t.quote], color: "#111827" },
          { tag: [t.monospace], color: "#111827", fontFamily: "ui-monospace, SFMono-Regular, 'SF Mono', Consolas, 'Liberation Mono', Menlo, monospace" },
          { tag: [t.strikethrough], color: "#6b7280", textDecoration: "line-through" },
          { tag: [t.inserted], color: "#166534", backgroundColor: "rgba(34, 197, 94, 0.1)" },
          { tag: [t.deleted], color: "#dc2626", backgroundColor: "rgba(239, 68, 68, 0.1)" },
          { tag: [t.changed], color: "#ca8a04", backgroundColor: "rgba(250, 204, 21, 0.1)" },
          { tag: [t.invalid], color: "#dc2626", backgroundColor: "rgba(239, 68, 68, 0.1)" },
          { tag: [t.meta, t.documentMeta, t.annotation, t.processingInstruction], color: "#6b7280", fontStyle: "italic" },
          { tag: [t.definition(t.name)], color: "#0f766e", fontWeight: "600" },
          { tag: [t.constant(t.name)], color: "#2563eb" },
          { tag: [t.standard(t.name)], color: "#7c3aed" },
          { tag: [t.local(t.name)], color: "#111827" },
          { tag: [t.special(t.name), t.special(t.string)], color: "#ca8a04" },
        ]
      : [
          { tag: [t.keyword, t.modifier, t.operatorKeyword], color: "#93c5fd" },
          { tag: [t.string, t.special(t.string)], color: "#fca5a5" },
          { tag: [t.number, t.bool, t.null], color: "#a7f3d0" },
          { tag: [t.function(t.variableName), t.function(t.propertyName)], color: "#67e8f9" },
          { tag: [t.definition(t.variableName), t.variableName], color: "#e5e7eb" },
          { tag: [t.typeName, t.className], color: "#fcd34d" },
          { tag: [t.comment], color: "#9ca3af", fontStyle: "italic" },
          { tag: [t.heading, t.strong], color: "#e5e7eb", fontWeight: "600" },
          { tag: [t.link, t.url], color: "#93c5fd", textDecoration: "underline" },
          { tag: [t.name, t.tagName, t.attributeName, t.labelName, t.namespace, t.macroName], color: "#e5e7eb" },
          { tag: [t.propertyName], color: "#fcd34d" },
          { tag: [t.character, t.attributeValue, t.docString], color: "#fca5a5" },
          { tag: [t.integer, t.float], color: "#a7f3d0" },
          { tag: [t.regexp], color: "#fca5a5" },
          { tag: [t.escape], color: "#f87171" },
          { tag: [t.color, t.url], color: "#93c5fd", textDecoration: "underline" },
          { tag: [t.self, t.atom, t.unit], color: "#93c5fd" },
          { tag: [t.controlKeyword, t.definitionKeyword, t.moduleKeyword], color: "#93c5fd" },
          { tag: [t.operator], color: "#9ca3af" },
          { tag: [t.derefOperator, t.arithmeticOperator, t.logicOperator, t.bitwiseOperator, t.compareOperator, t.updateOperator, t.definitionOperator, t.typeOperator, t.controlOperator], color: "#9ca3af" },
          { tag: [t.punctuation, t.separator], color: "#9ca3af" },
          { tag: [t.bracket, t.angleBracket, t.squareBracket, t.paren, t.brace], color: "#9ca3af" },
          { tag: [t.content], color: "#e5e7eb" },
          { tag: [t.heading, t.heading1, t.heading2, t.heading3, t.heading4, t.heading5, t.heading6], color: "#e5e7eb", fontWeight: "600" },
          { tag: [t.contentSeparator], color: "#9ca3af" },
          { tag: [t.list, t.quote], color: "#e5e7eb" },
          { tag: [t.monospace], color: "#e5e7eb", fontFamily: "ui-monospace, SFMono-Regular, 'SF Mono', Consolas, 'Liberation Mono', Menlo, monospace" },
          { tag: [t.strikethrough], color: "#9ca3af", textDecoration: "line-through" },
          { tag: [t.inserted], color: "#86efac", backgroundColor: "rgba(34, 197, 94, 0.15)" },
          { tag: [t.deleted], color: "#fca5a5", backgroundColor: "rgba(239, 68, 68, 0.15)" },
          { tag: [t.changed], color: "#fde047", backgroundColor: "rgba(250, 204, 21, 0.15)" },
          { tag: [t.invalid], color: "#fca5a5", backgroundColor: "rgba(239, 68, 68, 0.15)" },
          { tag: [t.meta, t.documentMeta, t.annotation, t.processingInstruction], color: "#9ca3af", fontStyle: "italic" },
          { tag: [t.definition(t.name)], color: "#fcd34d", fontWeight: "600" },
          { tag: [t.constant(t.name)], color: "#a7f3d0" },
          { tag: [t.standard(t.name)], color: "#93c5fd" },
          { tag: [t.local(t.name)], color: "#e5e7eb" },
          { tag: [t.special(t.name), t.special(t.string)], color: "#fde047" },
        ]
  );
}

function getLanguageExtension(filePath: string, typstSupport: LanguageSupport | null): Extension | null {
  const lowerPath = filePath.toLowerCase();

  if (lowerPath.endsWith(".typ")) {
    return typstSupport;
  }

  if (lowerPath.endsWith(".json")) {
    return json();
  }

  return latex();
}

export function SyntaxHighlightedCode({ content, filePath = "untitled.tex", className = "" }: SyntaxHighlightedCodeProps) {
  const { effectiveTheme } = useTheme();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);
  const [typstSupport, setTypstSupport] = useState<LanguageSupport | null>(null);
  const [useFallback, setUseFallback] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    const lowerPath = filePath.toLowerCase();

    if (typeof window === "undefined" || !lowerPath.endsWith(".typ")) {
      setTypstSupport(null);
      return;
    }

    let cancelled = false;

    import("codemirror-lang-typst")
      .then((mod) => {
        if (!cancelled) {
          setTypstSupport(mod.typst());
        }
      })
      .catch(() => {
        if (!cancelled) {
          setTypstSupport(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [filePath]);

  useEffect(() => {
    if (!isMounted) {
      return;
    }

    const parent = containerRef.current;
    if (!parent) {
      return;
    }

    if (viewRef.current) {
      viewRef.current.destroy();
      viewRef.current = null;
    }

    parent.innerHTML = "";

    const extensions: Extension[] = [
      syntaxHighlighting(getHighlight(effectiveTheme)),
      EditorView.theme(
        {
          "&": {
            backgroundColor: "transparent",
            color: "var(--foreground)",
            fontFamily: "ui-monospace, SFMono-Regular, 'SF Mono', Consolas, 'Liberation Mono', Menlo, monospace",
          },
          ".cm-scroller": {
            fontFamily: "ui-monospace, SFMono-Regular, 'SF Mono', Consolas, 'Liberation Mono', Menlo, monospace",
            overflow: "auto",
          },
          ".cm-content": {
            padding: "0.75rem",
            caretColor: "transparent",
            whiteSpace: "pre-wrap",
          },
          ".cm-line": {
            padding: 0,
          },
          ".cm-activeLine": {
            backgroundColor: "transparent",
          },
          ".cm-selectionBackground, &.cm-focused .cm-selectionBackground": {
            backgroundColor: "color-mix(in srgb, var(--accent) 25%, transparent)",
          },
          ".cm-cursor, .cm-dropCursor": {
            display: "none",
          },
          ".cm-gutters": {
            display: "none",
          },
        },
        { dark: effectiveTheme !== "light" }
      ),
      EditorView.lineWrapping,
      EditorView.editable.of(false),
      EditorState.readOnly.of(true),
    ];

    const languageExtension = getLanguageExtension(filePath, typstSupport);
    if (languageExtension) {
      extensions.push(languageExtension);
    }

    try {
      viewRef.current = new EditorView({
        state: EditorState.create({
          doc: content,
          extensions,
        }),
        parent,
      });
      setUseFallback(false);
    } catch {
      setUseFallback(true);
      parent.innerHTML = "";
    }

    return () => {
      if (viewRef.current) {
        viewRef.current.destroy();
        viewRef.current = null;
      }
    };
  }, [content, effectiveTheme, filePath, isMounted, typstSupport]);

  if (!isMounted || useFallback) {
    return (
      <pre
        className={`text-sm overflow-x-auto whitespace-pre-wrap break-words font-mono p-3 ${className}`}
      >
        {content}
      </pre>
    );
  }

  return <div ref={containerRef} className={className} />;
}
