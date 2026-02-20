"use client";

import { useState, useEffect } from "react";

interface DiffLine {
  type: 'added' | 'removed' | 'unchanged';
  content: string;
  lineNumber: number;
  originalLineNumber?: number;
  newLineNumber?: number;
}

interface SideBySideDiffViewProps {
  filePath: string;
  currentContent: string;
  originalContent: string;
  className?: string;
}

export function SideBySideDiffView({ 
  filePath, 
  currentContent, 
  originalContent, 
  className = "" 
}: SideBySideDiffViewProps) {
  const [leftLines, setLeftLines] = useState<DiffLine[]>([]);
  const [rightLines, setRightLines] = useState<DiffLine[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    generateSideBySideDiff();
  }, [currentContent, originalContent]);

  const generateSideBySideDiff = () => {
    setIsLoading(true);
    
    try {
      const { left, right } = calculateSideBySideDiff(originalContent, currentContent);
      setLeftLines(left);
      setRightLines(right);
    } catch (error) {
      console.error("Failed to generate side-by-side diff:", error);
      // Fallback: show both contents as unchanged
      const currentLines = currentContent.split('\n').map((line, index) => ({
        type: 'unchanged' as const,
        content: line,
        lineNumber: index + 1,
        originalLineNumber: index + 1,
        newLineNumber: index + 1
      }));
      const originalLines = originalContent.split('\n').map((line, index) => ({
        type: 'unchanged' as const,
        content: line,
        lineNumber: index + 1,
        originalLineNumber: index + 1,
        newLineNumber: index + 1
      }));
      setLeftLines(originalLines);
      setRightLines(currentLines);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateSideBySideDiff = (oldContent: string, newContent: string) => {
    const oldLines = oldContent.split('\n');
    const newLines = newContent.split('\n');
    
    const left: DiffLine[] = [];
    const right: DiffLine[] = [];
    
    let oldIndex = 0;
    let newIndex = 0;
    let originalLineNum = 1;
    let newLineNum = 1;

    while (oldIndex < oldLines.length || newIndex < newLines.length) {
      const oldLine = oldLines[oldIndex];
      const newLine = newLines[newIndex];

      if (oldIndex >= oldLines.length) {
        // Lines were added
        left.push({
          type: 'unchanged',
          content: '',
          lineNumber: newLineNum,
          originalLineNumber: undefined,
          newLineNumber: newLineNum
        });
        right.push({
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
        left.push({
          type: 'removed',
          content: oldLine,
          lineNumber: originalLineNum,
          originalLineNumber: originalLineNum,
          newLineNumber: undefined
        });
        right.push({
          type: 'unchanged',
          content: '',
          lineNumber: originalLineNum,
          originalLineNumber: originalLineNum,
          newLineNumber: undefined
        });
        oldIndex++;
        originalLineNum++;
      } else if (oldLine === newLine) {
        // Lines are the same
        left.push({
          type: 'unchanged',
          content: oldLine,
          lineNumber: originalLineNum,
          originalLineNumber: originalLineNum,
          newLineNumber: newLineNum
        });
        right.push({
          type: 'unchanged',
          content: newLine,
          lineNumber: newLineNum,
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
            left.push({
              type: 'removed',
              content: oldLines[i],
              lineNumber: originalLineNum,
              originalLineNumber: originalLineNum,
              newLineNumber: undefined
            });
            right.push({
              type: 'unchanged',
              content: '',
              lineNumber: originalLineNum,
              originalLineNumber: originalLineNum,
              newLineNumber: undefined
            });
            originalLineNum++;
          }
          
          // Add added lines
          for (let i = newIndex; i < match.newIndex; i++) {
            left.push({
              type: 'unchanged',
              content: '',
              lineNumber: newLineNum,
              originalLineNumber: undefined,
              newLineNumber: newLineNum
            });
            right.push({
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
          left.push({
            type: 'removed',
            content: oldLine,
            lineNumber: originalLineNum,
            originalLineNumber: originalLineNum,
            newLineNumber: undefined
          });
          right.push({
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

    return { left, right };
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

  const getLineClass = (line: DiffLine, side: 'left' | 'right') => {
    if (line.type === 'unchanged') return '';
    
    if (side === 'left') {
      return line.type === 'removed' ? 'bg-red-50' : '';
    } else {
      return line.type === 'added' ? 'bg-green-50' : '';
    }
  };

  const getLineNumberClass = (line: DiffLine, side: 'left' | 'right') => {
    if (line.type === 'unchanged') return 'text-gray-500';
    
    if (side === 'left') {
      return line.type === 'removed' ? 'text-red-600 font-semibold' : '';
    } else {
      return line.type === 'added' ? 'text-green-600 font-semibold' : '';
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

  return (
    <div className={`side-by-side-diff ${className}`}>
      {/* Header */}
      <div className="bg-[var(--border)] px-4 py-2 text-xs font-mono text-[var(--muted)] border-b">
        <div className="grid grid-cols-2 gap-4">
          <div>--- a/{filePath} (Previous Commit)</div>
          <div>+++ b/{filePath} (Current)</div>
        </div>
      </div>

      {/* Diff content */}
      <div className="grid grid-cols-2 divide-x divide-[var(--border)]">
        {/* Left side - Original */}
        <div className="font-mono text-xs overflow-auto">
          <div className="sticky top-0 bg-[var(--background)] border-b border-[var(--border)] px-2 py-1 text-[var(--muted)]">
            Previous Commit
          </div>
          {leftLines.map((line, index) => (
            <div
              key={index}
              className={`flex ${getLineClass(line, 'left')} border-b border-gray-100`}
            >
              <div className={`flex-shrink-0 w-12 text-right pr-2 ${getLineNumberClass(line, 'left')}`}>
                {line.originalLineNumber || ''}
              </div>
              <div className="flex-1 px-2 py-1 whitespace-pre-wrap break-all">
                {line.content || ' '}
              </div>
            </div>
          ))}
        </div>

        {/* Right side - Current */}
        <div className="font-mono text-xs overflow-auto">
          <div className="sticky top-0 bg-[var(--background)] border-b border-[var(--border)] px-2 py-1 text-[var(--muted)]">
            Current
          </div>
          {rightLines.map((line, index) => (
            <div
              key={index}
              className={`flex ${getLineClass(line, 'right')} border-b border-gray-100`}
            >
              <div className={`flex-shrink-0 w-12 text-right pr-2 ${getLineNumberClass(line, 'right')}`}>
                {line.newLineNumber || ''}
              </div>
              <div className="flex-1 px-2 py-1 whitespace-pre-wrap break-all">
                {line.content || ' '}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
