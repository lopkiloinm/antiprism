import { diffLines } from "diff";
import { readFileSync } from "fs";

// Read both files
const originalContent = readFileSync('public/main.tex', 'utf8');
const modifiedContent = readFileSync('public/main-test.tex', 'utf8');

// Calculate diff
const diffResult = diffLines(originalContent, modifiedContent);

console.log('=== DIFF CALCULATION TEST ===');
console.log(`Original file: ${originalContent.length} characters, ${originalContent.split('\n').length} lines`);
console.log(`Modified file: ${modifiedContent.length} characters, ${modifiedContent.split('\n').length} lines`);
console.log(`Diff parts: ${diffResult.length}`);

// Show the diff results
diffResult.forEach((part, index) => {
  console.log(`\n--- Part ${index} ---`);
  console.log(`Added: ${part.added}`);
  console.log(`Removed: ${part.removed}`);
  console.log(`Count: ${part.count}`);
  console.log(`Value preview: ${part.value.substring(0, 100)}...`);
  
  // Show the lines with proper formatting
  const lines = part.value.split('\n');
  lines.forEach((line, lineIndex) => {
    if (part.added) {
      console.log(`+${line}`);
    } else if (part.removed) {
      console.log(`-${line}`);
    } else {
      console.log(` ${line}`);
    }
  });
});

console.log('\n=== TEST COMPLETE ===');
