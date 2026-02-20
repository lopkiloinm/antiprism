import { diffLines } from "diff";

// Test the diff package output structure
const oldContent = '';
const newContent = `\\documentclass{article}
\\usepackage{amsmath}
\\begin{document}
Hello world
\\end{document}`;

const result = diffLines(oldContent, newContent);
console.log('Diff result structure:', JSON.stringify(result, null, 2));

// Check the structure
console.log('Is array:', Array.isArray(result));
console.log('Length:', result.length);

// Check each part
result.forEach((part, index) => {
  console.log(`Part ${index}:`, {
    hasValue: 'value' in part,
    valueType: typeof part.value,
    valueLength: part.value ? part.value.length : 0,
    valuePreview: part.value ? part.value.substring(0, 100) : 'no value'
  });
});
