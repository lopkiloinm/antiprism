import { describe, it, expect } from "vitest";
import { parseCreateResponse, buildCreateMessages } from "../agent/create";

/**
 * Tests for the pandoc markdown → LaTeX conversion pipeline.
 *
 * pandoc-wasm runs in a WASM sandbox so these tests verify:
 *   1. extractMarkdown correctly strips LLM artifacts
 *   2. pandoc converts markdown to valid standalone LaTeX
 *   3. The LaTeX output contains expected structural elements
 */

// Since extractMarkdown is not exported, we test it through parseCreateResponse
// which calls extractMarkdown → pandoc convert → return LaTeX

describe("parseCreateResponse (pandoc md → LaTeX)", () => {
  it("converts a simple heading + paragraph to standalone LaTeX", async () => {
    const raw = `# My Title

This is a paragraph about testing.`;

    const result = await parseCreateResponse(raw);

    expect(result.title).toBe("My Title");
    expect(result.markdown).toContain("# My Title");
    expect(result.latex).toBeTruthy();

    // Standalone LaTeX must have documentclass and begin/end document
    expect(result.latex).toContain("\\documentclass");
    expect(result.latex).toContain("\\begin{document}");
    expect(result.latex).toContain("\\end{document}");

    // Title should appear
    expect(result.latex).toContain("My Title");
    // Paragraph text should appear
    expect(result.latex).toContain("testing");
  });

  it("converts markdown with sections, bold, and lists", async () => {
    const raw = `# Research Paper

## Introduction

This paper discusses **important topics** in computer science.

## Key Points

- Point one
- Point two
- Point three

## Conclusion

In conclusion, this was a *great* paper.`;

    const result = await parseCreateResponse(raw);

    expect(result.latex).toContain("\\documentclass");
    expect(result.latex).toContain("\\begin{document}");
    expect(result.latex).toContain("\\end{document}");

    // ## becomes \subsection (# is \section for the top-level heading)
    expect(result.latex).toMatch(/\\subsection\{Introduction\}/);

    // Bold text
    expect(result.latex).toContain("\\textbf{important topics}");

    // List items - pandoc uses itemize
    expect(result.latex).toContain("\\begin{itemize}");
    expect(result.latex).toContain("Point one");
    expect(result.latex).toContain("\\end{itemize}");

    // Italic
    expect(result.latex).toMatch(/\\emph\{great\}/);
  });

  it("handles markdown with code blocks", async () => {
    const raw = `# Code Example

Here is some code:

\`\`\`python
def hello():
    print("world")
\`\`\`

And inline code: \`x = 1\`.`;

    const result = await parseCreateResponse(raw);

    expect(result.latex).toContain("\\documentclass");
    expect(result.latex).toContain("\\begin{document}");
    expect(result.latex).toContain("\\end{document}");

    // Code block - pandoc uses Shaded or verbatim
    expect(result.latex).toMatch(/\\begin\{verbatim\}|\\begin\{Shaded\}|\\begin\{lstlisting\}|def hello/);
    expect(result.latex).toContain("hello");
    // The full document structure should be preserved (not just the code block)
    expect(result.latex).toContain("Code Example");
    expect(result.latex).toContain("Here is some code");

    // Inline code
    expect(result.latex).toMatch(/\\texttt\{|\\verb|x = 1/);
  });

  it("handles markdown with math notation", async () => {
    const raw = `# Math Paper

The equation $E = mc^2$ is famous.

Display math:

$$
\\int_0^\\infty e^{-x} dx = 1
$$`;

    const result = await parseCreateResponse(raw);

    expect(result.latex).toContain("\\documentclass");
    expect(result.latex).toContain("\\begin{document}");
    expect(result.latex).toContain("\\end{document}");

    // Inline math preserved
    expect(result.latex).toContain("E = mc^2");
    // Display math preserved
    expect(result.latex).toContain("\\int_0^\\infty");
  });

  it("strips LLM role markers before converting", async () => {
    const raw = `assistant
# A Title

Some content here.`;

    const result = await parseCreateResponse(raw);

    expect(result.title).toBe("A Title");
    expect(result.latex).toContain("\\documentclass");
    expect(result.latex).toContain("A Title");
    expect(result.latex).toContain("Some content");
    // Should NOT contain the role marker
    expect(result.latex).not.toMatch(/^assistant/m);
  });

  it("extracts markdown from code fences", async () => {
    const raw = `Here is the document:

\`\`\`markdown
# Fenced Title

Content inside fences.
\`\`\``;

    const result = await parseCreateResponse(raw);

    expect(result.title).toBe("Fenced Title");
    expect(result.latex).toContain("\\documentclass");
    expect(result.latex).toContain("Fenced Title");
    expect(result.latex).toContain("Content inside fences");
  });

  it("returns empty result for empty input", async () => {
    const result = await parseCreateResponse("");

    expect(result.latex).toBe("");
    expect(result.title).toBe("");
    expect(result.markdown).toBe("");
  });

  it("returns empty result for whitespace-only input", async () => {
    const result = await parseCreateResponse("   \n  \n  ");

    expect(result.latex).toBe("");
    expect(result.title).toBe("");
    expect(result.markdown).toBe("");
  });

  it("produces LaTeX without unclosed environments", async () => {
    const raw = `# Complete Document

## Section One

A paragraph.

## Section Two

Another paragraph with **bold** and *italic*.

### Subsection

- item a
- item b

1. numbered one
2. numbered two`;

    const result = await parseCreateResponse(raw);
    const latex = result.latex;

    // Count begin/end pairs
    const begins = (latex.match(/\\begin\{/g) || []).length;
    const ends = (latex.match(/\\end\{/g) || []).length;
    expect(begins).toBe(ends);

    // Specifically check document environment
    expect(latex.indexOf("\\begin{document}")).toBeLessThan(
      latex.indexOf("\\end{document}")
    );
  });

  it("handles a table in markdown", async () => {
    const raw = `# Table Test

| Name | Value |
|------|-------|
| A    | 1     |
| B    | 2     |`;

    const result = await parseCreateResponse(raw);

    expect(result.latex).toContain("\\documentclass");
    // Pandoc converts tables to longtable or tabular
    expect(result.latex).toMatch(/\\begin\{longtable\}|\\begin\{tabular\}/);
    expect(result.latex).toContain("Name");
    expect(result.latex).toContain("Value");
  });

  it("does not inline raw LaTeX from prose (guide-to-latex scenario)", async () => {
    // Simulates model output that mixed raw LaTeX in the body (bad) or in a code block (ok)
    const raw = `# LaTeX Guide

Here is a basic template:

\`\`\`latex
\\documentclass{article}
\\title{Using LaTeX}
\\author{Your Name}
\\date{\\today}

\\begin{document}
\\maketitle
Hello world.
\\end{document}
\`\`\``;

    const result = await parseCreateResponse(raw);

    expect(result.latex).toContain("\\documentclass");
    expect(result.latex).toContain("\\begin{document}");
    expect(result.latex).toContain("\\end{document}");

    // There must be exactly ONE \\documentclass (from pandoc's standalone), not nested
    const docclassMatches = result.latex.match(/\\documentclass/g);
    expect(docclassMatches).toHaveLength(1);

    // The LaTeX template should appear as verbatim (escaped), not as raw LaTeX
    expect(result.latex).toMatch(/\\begin\{verbatim\}|\\begin\{Shaded\}|\\begin\{lstlisting\}/);
    expect(result.latex).toContain("LaTeX Guide");
  });

  it("escapes raw LaTeX in document body when raw_tex is disabled", async () => {
    // Model mistakenly wrote raw LaTeX in the prose (no code fence)
    const raw = `# Bad Output

latex

\\documentclass{article}
\\title{Using LaTeX}
\\author{Your Name}
\\date{\\today}

\\end{document}`;

    const result = await parseCreateResponse(raw);

    // Should have exactly one \\documentclass (from pandoc), not the model's raw one inlined
    const docclassMatches = result.latex.match(/\\documentclass/g);
    expect(docclassMatches).toHaveLength(1);

    // Raw \\documentclass from the body should be escaped (e.g. \\textbackslash documentclass)
    // or not appear as a second documentclass
    expect(result.latex).toContain("Bad Output");
  });
});

describe("buildCreateMessages", () => {
  it("builds system + user messages", () => {
    const msgs = buildCreateMessages("Write about cats");

    expect(msgs).toHaveLength(2);
    expect(msgs[0].role).toBe("system");
    expect(msgs[0].content).toContain("markdown");
    expect(msgs[1].role).toBe("user");
    expect(msgs[1].content).toBe("Write about cats");
  });

  it("includes prior messages", () => {
    const prior = [
      { role: "user" as const, content: "Write about dogs" },
      { role: "assistant" as const, content: "# Dogs\n\nDogs are great." },
    ];
    const msgs = buildCreateMessages("Now add a section about breeds", prior);

    expect(msgs).toHaveLength(4);
    expect(msgs[1].content).toBe("Write about dogs");
    expect(msgs[2].content).toContain("Dogs are great");
    expect(msgs[3].content).toBe("Now add a section about breeds");
  });
});
