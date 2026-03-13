"use client";

import type { Theme } from "@/lib/settings";
import { GitMergeView } from "./GitMergeView";

interface GitDiffViewProps {
  filePath: string;
  currentContent: string;
  originalContent?: string;
  className?: string;
  theme?: Theme;
  fontSize?: number;
  lineWrapping?: boolean;
}

export function GitDiffView({
  filePath,
  currentContent,
  originalContent,
  className = "",
  theme = "dark",
  fontSize,
  lineWrapping = true,
}: GitDiffViewProps) {
  return (
    <GitMergeView
      filePath={filePath}
      currentContent={currentContent}
      originalContent={originalContent}
      className={className}
      theme={theme}
      fontSize={fontSize}
      lineWrapping={lineWrapping}
    />
  );
}
