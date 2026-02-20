import { diffLines } from "diff";

// Test the diff package output structure
describe('Git Diff Structure', () => {
  test('diffLines should return correct structure', () => {
    const oldContent = '';
    const newContent = `\\documentclass{article}
\\usepackage{amsmath}
\\begin{document}
Hello world
\\end{document}`;

    const result = diffLines(oldContent, newContent);
    console.log('Diff result structure:', JSON.stringify(result, null, 2));
    
    // Check the structure
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    
    // Check if each part has the expected properties
    result.forEach((part, index) => {
      console.log(`Part ${index}:`, part);
      expect(part).toHaveProperty('value');
      expect(typeof part.value).toBe('string');
    });
  });

  test('diffLines should handle LaTeX content', () => {
    const oldContent = '';
    const newContent = `\\section{Introduction}
This is a test.
\\subsection{Background}
More content here.`;

    const result = diffLines(oldContent, newContent);
    
    // Should have one part since we're comparing with empty
    expect(result.length).toBe(1);
    
    // The value should contain the LaTeX content
    expect(result[0].value).toContain('\\section{Introduction}');
    expect(result[0].value).toContain('\\subsection{Background}');
  });
});
