/**
 * Parse LaTeX/Typst documents to extract section structure for the outline view.
 */

export interface OutlineEntry {
  level: number;
  title: string;
  line: number;
  command: string;
}

const LATEX_SECTION_COMMANDS: Record<string, number> = {
  "\\part": 0,
  "\\chapter": 1,
  "\\section": 2,
  "\\subsection": 3,
  "\\subsubsection": 4,
  "\\paragraph": 5,
  "\\subparagraph": 6,
};

const TYPST_HEADING_RE = /^(=+)\s+(.+)$/;

export function parseLatexOutline(content: string): OutlineEntry[] {
  const entries: OutlineEntry[] = [];
  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    // Skip comments
    if (line.startsWith("%")) continue;

    for (const [cmd, level] of Object.entries(LATEX_SECTION_COMMANDS)) {
      // Match \section{Title}, \section*{Title}, \section[short]{Title}
      const escapedCmd = cmd.replace(/\\/g, '\\\\');
      const re = new RegExp(
        `${escapedCmd}\\*?(?:\\[[^\\]]*\\])?\\{([^}]+)\\}`
      );
      const match = line.match(re);
      if (match) {
        entries.push({ level, title: match[1].trim(), line: i + 1, command: cmd });
        break;
      }
    }
  }
  return entries;
}

export function parseTypstOutline(content: string): OutlineEntry[] {
  const entries: OutlineEntry[] = [];
  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith("//")) continue;

    const match = line.match(TYPST_HEADING_RE);
    if (match) {
      const level = match[1].length; // number of = signs
      entries.push({ level, title: match[2].trim(), line: i + 1, command: "=" .repeat(level) });
    }
  }
  return entries;
}

export function parseOutline(content: string, filePath: string): OutlineEntry[] {
  if (filePath.endsWith(".typ")) {
    return parseTypstOutline(content);
  }
  
  // Try LaTeX parsing first
  const latexEntries = parseLatexOutline(content);
  if (latexEntries.length > 0) {
    return latexEntries;
  }
  
  // Fallback: parse from summary data (TexCount Subcounts section)
  return parseOutlineFromSummary(content);
}

function parseOutlineFromSummary(content: string): OutlineEntry[] {
  const entries: OutlineEntry[] = [];
  const lines = content.split("\n");
  let inSubcounts = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (line === "Subcounts:") {
      inSubcounts = true;
      continue;
    }
    
    if (inSubcounts && line) {
      // Parse lines like: "33+3+0 (1/0/0/0) Section: What is Prism?"
      const match = line.match(/^\s*\d+\+\d+\+\d+\s+\([^)]+\)\s+(Section|Subsection|Subsubsection):\s*(.+)$/);
      if (match) {
        const sectionType = match[1];
        const title = match[2].trim();
        const level = {
          "Section": 2,
          "Subsection": 3,
          "Subsubsection": 4,
          "Chapter": 1,
          "Part": 0
        }[sectionType] ?? 2;
        
        entries.push({
          level,
          title,
          line: -1, // We don't have line numbers from summary
          command: `\\${sectionType.toLowerCase()}`
        });
      }
    } else if (inSubcounts && line.startsWith("File Information")) {
      break; // End of Subcounts section
    }
  }
  
  return entries;
}
