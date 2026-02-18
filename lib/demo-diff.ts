import { IRawDiff, DiffLineType, DiffHunkHeader, DiffLine, DiffHunk } from './models/diff'

/**
 * Sample diff data for demonstration purposes
 */
export const createDemoDiff = (): IRawDiff => {
  const header = `diff --git a/src/components/DiffView.tsx b/src/components/DiffView.tsx
index e1d4871..3bd3ee0 100644
--- a/src/components/DiffView.tsx
+++ b/src/components/DiffView.tsx`

  const hunkHeader = new DiffHunkHeader(10, 5, 10, 7)
  
  const lines = [
    new DiffLine('@@ -10,5 +10,7 @@', DiffLineType.Hunk, 1, null, null),
    new DiffLine(' export const DiffView: React.FC<DiffViewProps> = ({ diff }) => {', DiffLineType.Context, 2, 10, 10),
    new DiffLine('   if (diff.isBinary) {', DiffLineType.Context, 3, 11, 11),
    new DiffLine('-    return <div>Binary file diff</div>', DiffLineType.Delete, 4, 12, null),
    new DiffLine('+    return (', DiffLineType.Add, 5, null, 12),
    new DiffLine('+      <div className="diff-binary">', DiffLineType.Add, 6, null, 13),
    new DiffLine('+        <p>Binary file diff not displayed</p>', DiffLineType.Add, 7, null, 14),
    new DiffLine('+      </div>', DiffLineType.Add, 8, null, 15),
    new DiffLine('+    )', DiffLineType.Add, 9, null, 16),
    new DiffLine('   }', DiffLineType.Context, 10, 13, 17),
  ]

  const hunk = new DiffHunk(
    hunkHeader,
    lines,
    0,
    lines.length - 1,
    'single' as any
  )

  return {
    header,
    contents: lines.slice(1).map(line => line.text).join('\n'),
    hunks: [hunk],
    isBinary: false,
    maxLineNumber: 17,
    hasHiddenBidiChars: false,
  }
}

export const createDemoDiffs = (): IRawDiff[] => {
  const diff1 = createDemoDiff()
  
  // Create a second demo diff
  const header2 = `diff --git a/src/lib/diff-parser.ts b/src/lib/diff-parser.ts
index a2b3c4d..e5f6g7h 100644
--- a/src/lib/diff-parser.ts
+++ b/src/lib/diff-parser.ts`

  const hunkHeader2 = new DiffHunkHeader(25, 3, 25, 4)
  
  const lines2 = [
    new DiffLine('@@ -25,3 +25,4 @@', DiffLineType.Hunk, 1, null, null),
    new DiffLine('   private parseHunkHeader(line: string): DiffHunkHeader {', DiffLineType.Context, 2, 25, 25),
    new DiffLine('     const m = diffHeaderRe.exec(line)', DiffLineType.Context, 3, 26, 26),
    new DiffLine('     if (!m) {', DiffLineType.Context, 4, 27, 27),
    new DiffLine('-      throw new Error(\'Invalid hunk header\')', DiffLineType.Delete, 5, 28, null),
    new DiffLine('+      throw new Error(`Invalid hunk header format: ${line}`)', DiffLineType.Add, 6, null, 28),
    new DiffLine('     }', DiffLineType.Context, 7, 29, 29),
  ]

  const hunk2 = new DiffHunk(
    hunkHeader2,
    lines2,
    0,
    lines2.length - 1,
    'single' as any
  )

  const diff2 = {
    header: header2,
    contents: lines2.slice(1).map(line => line.text).join('\n'),
    hunks: [hunk2],
    isBinary: false,
    maxLineNumber: 29,
    hasHiddenBidiChars: false,
  }

  return [diff1, diff2]
}
