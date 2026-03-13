"use client";

import { GitMergeView } from "./GitMergeView";
import { DiffLineType, type IRawDiff } from "../lib/models/diff";

interface DiffViewProps {
  diff: IRawDiff;
}

function stripPrefix(text: string) {
  return text.length > 0 ? text.slice(1) : text;
}

function extractFilePath(header: string) {
  const plusMatch = header.match(/^\+\+\+ b\/(.+)$/m);
  if (plusMatch?.[1]) {
    return plusMatch[1];
  }

  const diffMatch = header.match(/^diff --git a\/(.+?) b\//m);
  return diffMatch?.[1] ?? "diff.txt";
}

function buildMergeDocuments(diff: IRawDiff) {
  const originalLines: string[] = [];
  const currentLines: string[] = [];

  for (const hunk of diff.hunks) {
    for (const line of hunk.lines) {
      if (line.type === DiffLineType.Context) {
        const value = stripPrefix(line.text);
        originalLines.push(value);
        currentLines.push(value);
      } else if (line.type === DiffLineType.Delete) {
        originalLines.push(stripPrefix(line.text));
      } else if (line.type === DiffLineType.Add) {
        currentLines.push(stripPrefix(line.text));
      }
    }
  }

  return {
    originalContent: originalLines.join("\n"),
    currentContent: currentLines.join("\n"),
  };
}

export const DiffView = ({ diff }: DiffViewProps) => {
  if (diff.isBinary) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-[var(--muted)]">
        Binary file diff not displayed
      </div>
    );
  }

  const { originalContent, currentContent } = buildMergeDocuments(diff);

  return (
    <GitMergeView
      filePath={extractFilePath(diff.header)}
      currentContent={currentContent}
      originalContent={originalContent}
      className="h-full"
    />
  );
};
