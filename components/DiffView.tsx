'use client'

import React from 'react'
import { IRawDiff, DiffLine, DiffLineType, DiffHunk } from '../lib/models/diff'

interface DiffViewProps {
  diff: IRawDiff
}

export const DiffView: React.FC<DiffViewProps> = ({ diff }) => {
  if (diff.isBinary) {
    return (
      <div className="diff-binary">
        <p>Binary file diff not displayed</p>
      </div>
    )
  }

  if (diff.hunks.length === 0) {
    return (
      <div className="diff-empty">
        <p>No changes to display</p>
      </div>
    )
  }

  return (
    <div className="diff-view">
      <div className="diff-header">
        <pre className="diff-header-text">{diff.header}</pre>
      </div>
      <div className="diff-content">
        {diff.hunks.map((hunk, hunkIndex) => (
          <DiffHunkView key={hunkIndex} hunk={hunk} />
        ))}
      </div>
    </div>
  )
}

interface DiffHunkViewProps {
  hunk: DiffHunk
}

const DiffHunkView: React.FC<DiffHunkViewProps> = ({ hunk }) => {
  return (
    <div className="diff-hunk">
      <div className="diff-hunk-content">
        {hunk.lines.map((line, lineIndex) => (
          <DiffLineView key={lineIndex} line={line} />
        ))}
      </div>
    </div>
  )
}

interface DiffLineViewProps {
  line: DiffLine
}

const DiffLineView: React.FC<DiffLineViewProps> = ({ line }) => {
  const getLineClassName = (type: DiffLineType): string => {
    switch (type) {
      case DiffLineType.Hunk:
        return 'diff-line-hunk'
      case DiffLineType.Add:
        return 'diff-line-add'
      case DiffLineType.Delete:
        return 'diff-line-delete'
      case DiffLineType.Context:
        return 'diff-line-context'
      default:
        return 'diff-line-unknown'
    }
  }

  const formatLineNumber = (num: number | null): string => {
    return num !== null ? num.toString() : ''
  }

  const getLineContent = (line: DiffLine): string => {
    if (line.type === DiffLineType.Hunk) {
      return line.text
    }
    
    // Remove the diff prefix for display
    if (line.text.length > 0) {
      return line.text.substring(1)
    }
    return line.text
  }

  return (
    <div className={`diff-line ${getLineClassName(line.type)}`}>
      <div className="diff-line-numbers">
        <span className="diff-line-old-number">
          {formatLineNumber(line.oldLineNumber)}
        </span>
        <span className="diff-line-new-number">
          {formatLineNumber(line.newLineNumber)}
        </span>
      </div>
      <div className="diff-line-content">
        <pre className="diff-line-text">
          {getLineContent(line)}
          {line.noTrailingNewLine && (
            <span className="diff-no-newline"> No newline at end of file</span>
          )}
        </pre>
      </div>
    </div>
  )
}
