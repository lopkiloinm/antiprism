"use client";

import { useState, useEffect } from "react";

interface DiffLine {
  type: 'added' | 'removed' | 'unchanged' | 'context';
  content: string;
  lineNumber: number;
  originalLineNumber?: number;
  newLineNumber?: number;
}

interface GitDiffViewProps {
  filePath: string;
  currentContent: string;
  originalContent?: string;
  className?: string;
}

export function GitDiffView({ 
  filePath, 
  currentContent, 
  originalContent, 
  className = "" 
}: GitDiffViewProps) {
  const [diffLines, setDiffLines] = useState<DiffLine[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    generateDiff();
  }, [currentContent, originalContent]);

  const generateDiff = () => {
    setIsLoading(true);
    
    try {
      const lines = calculateGitDiff(originalContent || "", currentContent);
      setDiffLines(lines);
    } catch (error) {
      console.error("Failed to generate diff:", error);
      // Fallback: show current content as unchanged
      const fallbackLines = currentContent.split('\n').map((line, index) => ({
        type: 'unchanged' as const,
        content: line,
        lineNumber: index + 1,
        originalLineNumber: index + 1,
        newLineNumber: index + 1
      }));
      setDiffLines(fallbackLines);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateGitDiff = (oldContent: string, newContent: string): DiffLine[] => {
    const oldLines = oldContent.split('\n');
    const newLines = newContent.split('\n');
    
    const diff: DiffLine[] = [];
    let oldIndex = 0;
    let newIndex = 0;
    let originalLineNum = 1;
    let newLineNum = 1;

    while (oldIndex < oldLines.length || newIndex < newLines.length) {
      const oldLine = oldLines[oldIndex];
      const newLine = newLines[newIndex];

      if (oldIndex >= oldLines.length) {
        // Lines were added
        diff.push({
          type: 'added',
          content: newLine,
          lineNumber: newLineNum,
          originalLineNumber: undefined,
          newLineNumber: newLineNum
        });
        newIndex++;
        newLineNum++;
      } else if (newIndex >= newLines.length) {
        // Lines were removed
        diff.push({
          type: 'removed',
          content: oldLine,
          lineNumber: originalLineNum,
          originalLineNumber: originalLineNum,
          newLineNumber: undefined
        });
        oldIndex++;
        originalLineNum++;
      } else if (oldLine === newLine) {
        // Lines are the same
        diff.push({
          type: 'unchanged',
          content: oldLine,
          lineNumber: originalLineNum,
          originalLineNumber: originalLineNum,
          newLineNumber: newLineNum
        });
        oldIndex++;
        newIndex++;
        originalLineNum++;
        newLineNum++;
      } else {
        // Lines are different - find the best match
        const match = findBestMatch(oldLines, newLines, oldIndex, newIndex);
        
        if (match.found) {
          // Add removed lines
          for (let i = oldIndex; i < match.oldIndex; i++) {
            diff.push({
              type: 'removed',
              content: oldLines[i],
              lineNumber: originalLineNum,
              originalLineNumber: originalLineNum,
              newLineNumber: undefined
            });
            originalLineNum++;
          }
          
          // Add added lines
          for (let i = newIndex; i < match.newIndex; i++) {
            diff.push({
              type: 'added',
              content: newLines[i],
              lineNumber: newLineNum,
              originalLineNumber: undefined,
              newLineNumber: newLineNum
            });
            newLineNum++;
          }
          
          oldIndex = match.oldIndex;
          newIndex = match.newIndex;
        } else {
          // No good match found, treat as replacement
          diff.push({
            type: 'removed',
            content: oldLine,
            lineNumber: originalLineNum,
            originalLineNumber: originalLineNum,
            newLineNumber: undefined
          });
          diff.push({
            type: 'added',
            content: newLine,
            lineNumber: newLineNum,
            originalLineNumber: undefined,
            newLineNumber: newLineNum
          });
          oldIndex++;
          newIndex++;
          originalLineNum++;
          newLineNum++;
        }
      }
    }

    return diff;
  };

  const findBestMatch = (oldLines: string[], newLines: string[], oldStart: number, newStart: number) => {
    const searchRadius = 3;
    let found = false;
    let oldIndex = -1;
    let newIndex = -1;

    // Search for matching lines within radius
    for (let oldOffset = 0; oldOffset <= searchRadius; oldOffset++) {
      for (let newOffset = 0; newOffset <= searchRadius; newOffset++) {
        const oldIdx = oldStart + oldOffset;
        const newIdx = newStart + newOffset;
        
        if (oldIdx < oldLines.length && newIdx < newLines.length) {
          if (oldLines[oldIdx] === newLines[newIdx] && oldLines[oldIdx].trim().length > 0) {
            found = true;
            oldIndex = oldIdx;
            newIndex = newIdx;
            break;
          }
        }
      }
      if (found) break;
    }

    return { found, oldIndex, newIndex };
  };

  const getLineClass = (line: DiffLine) => {
    switch (line.type) {
      case 'added':
        return 'bg-green-50 border-l-4 border-green-500 text-green-900';
      case 'removed':
        return 'bg-red-50 border-l-4 border-red-500 text-red-900';
      case 'unchanged':
        return 'bg-gray-50 border-l-4 border-gray-300 text-gray-700';
      default:
        return 'bg-gray-50 border-l-4 border-gray-300 text-gray-700';
    }
  };

  const getLinePrefix = (line: DiffLine) => {
    switch (line.type) {
      case 'added':
        return '+';
      case 'removed':
        return '-';
      case 'unchanged':
        return ' ';
      default:
        return ' ';
    }
  };

  const getLineNumberDisplay = (line: DiffLine) => {
    if (line.type === 'added') {
      return line.newLineNumber ? line.newLineNumber.toString() : '';
    } else if (line.type === 'removed') {
      return line.originalLineNumber ? line.originalLineNumber.toString() : '';
    } else {
      return line.originalLineNumber ? line.originalLineNumber.toString() : '';
    }
  };

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <div className="animate-spin w-4 h-4 border-2 border-[var(--accent)] border-t-transparent rounded-full mr-2"></div>
        <span className="text-sm text-[var(--muted)]">Generating diff...</span>
      </div>
    );
  }

  const hasChanges = diffLines.some(line => line.type === 'added' || line.type === 'removed');

  if (!hasChanges) {
    return (
      <div className={`p-4 ${className}`}>
        <div className="text-center text-[var(--muted)]">
          <div className="text-sm mb-2">No changes detected</div>
          <div className="text-xs">This file is identical to the last committed version</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`git-diff-view ${className}`}>
      {/* Diff header */}
      <div className="bg-[var(--border)] px-4 py-2 text-xs font-mono text-[var(--muted)] border-b">
        <div>diff --git a/{filePath} b/{filePath}</div>
        {originalContent && (
          <div>
            --- a/{filePath}
            <br />
            +++ b/{filePath}
          </div>
        )}
      </div>

      {/* Diff content */}
      <div className="font-mono text-xs overflow-auto">
        {diffLines.map((line, index) => (
          <div
            key={index}
            className={`flex ${getLineClass(line)} border-b border-gray-200`}
          >
            {/* Line numbers */}
            <div className="flex-shrink-0 w-12 text-right pr-2 text-gray-500 border-r border-gray-200">
              {getLineNumberDisplay(line)}
            </div>
            
            {/* Diff indicator */}
            <div className="flex-shrink-0 w-4 text-center font-bold">
              {getLinePrefix(line)}
            </div>
            
            {/* Line content */}
            <div className="flex-1 px-2 py-1 whitespace-pre-wrap break-all">
              {line.content || ' '}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
