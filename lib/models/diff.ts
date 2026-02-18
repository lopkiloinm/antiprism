/**
 * Models for representing diff data structures
 */

export enum DiffLineType {
  Hunk = 'hunk',
  Add = 'add',
  Delete = 'delete',
  Context = 'context',
}

export class DiffLine {
  constructor(
    public readonly text: string,
    public readonly type: DiffLineType,
    public readonly diffLineNumber: number,
    public readonly oldLineNumber: number | null,
    public readonly newLineNumber: number | null,
    public readonly noTrailingNewLine: boolean = false
  ) {}

  withNoTrailingNewLine(value: boolean): DiffLine {
    return new DiffLine(
      this.text,
      this.type,
      this.diffLineNumber,
      this.oldLineNumber,
      this.newLineNumber,
      value
    );
  }
}

export class DiffHunkHeader {
  constructor(
    public readonly oldStartLine: number,
    public readonly oldLineCount: number,
    public readonly newStartLine: number,
    public readonly newLineCount: number
  ) {}
}

export enum HunkExpansionType {
  First = 'first',
  Last = 'last',
  Middle = 'middle',
  Single = 'single',
}

export class DiffHunk {
  constructor(
    public readonly header: DiffHunkHeader,
    public readonly lines: readonly DiffLine[],
    public readonly startLine: number,
    public readonly endLine: number,
    public readonly expansionType: HunkExpansionType
  ) {}
}

export interface IRawDiff {
  readonly header: string;
  readonly contents: string;
  readonly hunks: readonly DiffHunk[];
  readonly isBinary: boolean;
  readonly maxLineNumber: number;
  readonly hasHiddenBidiChars: boolean;
}
