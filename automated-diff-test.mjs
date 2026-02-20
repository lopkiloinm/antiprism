import { diffLines } from "diff";
import { readFileSync, writeFileSync } from "fs";
import { execSync } from "child_process";

// Automated Git Diff Test Suite
class AutomatedDiffTester {
  constructor() {
    this.testFiles = {
      original: 'public/main.tex',
      modified: 'public/main-test.tex',
      reverse: 'public/main-reverse.tex'
    };
    this.results = [];
  }

  // Step 1: Read original file
  readOriginal() {
    console.log('🔍 Step 1: Reading original file...');
    this.originalContent = readFileSync(this.testFiles.original, 'utf8');
    console.log(`   Original: ${this.originalContent.length} chars, ${this.originalContent.split('\n').length} lines`);
    return this.originalContent;
  }

  // Step 2: Make automated edits
  makeAutomatedEdits(content) {
    console.log('✏️  Step 2: Making automated edits...');
    
    let modifiedContent = content;
    const edits = [];

    // Edit 1: Add a timestamp comment
    const timestamp = new Date().toISOString();
    const timestampComment = `% Automated edit timestamp: ${timestamp}`;
    modifiedContent = timestampComment + '\n\n' + modifiedContent;
    edits.push({ type: 'add', content: timestampComment, line: 1 });

    // Edit 2: Modify the title section
    const titleRegex = /\\section\*\{What is Prism\?\}/;
    if (titleRegex.test(modifiedContent)) {
      modifiedContent = modifiedContent.replace(titleRegex, '\\section*{What is Prism? (Updated)}');
      edits.push({ type: 'modify', content: 'Section title updated', line: 14 });
    }

    // Edit 3: Add a new subsection
    const collaborationSection = '\\section*{Collaboration}';
    const newSubsection = `\\subsection*{Automated Testing}

This subsection was automatically added to test the diff calculation system. It demonstrates how the system handles structural changes to LaTeX documents.

\\begin{itemize}
\\item Automated diff generation
\\item Forward and reverse engineering
\\item Real-time highlighting
\\end{itemize}

`;
    if (modifiedContent.includes(collaborationSection)) {
      modifiedContent = modifiedContent.replace(
        collaborationSection,
        newSubsection + collaborationSection
      );
      edits.push({ type: 'add', content: 'New subsection added', line: 117 });
    }

    // Edit 4: Remove a specific line (if it exists)
    const lineToRemove = "``Generate a Beamer presentation with each slide in its own file.''";
    if (modifiedContent.includes(lineToRemove)) {
      modifiedContent = modifiedContent.replace(lineToRemove + '\n', '');
      edits.push({ type: 'remove', content: lineToRemove, line: 114 });
    }

    // Edit 5: Modify a mathematical equation
    const equationRegex = /\\mathcal\{L\\left\\{ t \\cos\(a t\) \\right\\}/;
    if (equationRegex.test(modifiedContent)) {
      modifiedContent = modifiedContent.replace(equationRegex, '\\mathcal{L}\\{t \\sin(a t)\\}');
      edits.push({ type: 'modify', content: 'Equation modified: cos → sin', line: 55 });
    }

    console.log(`   Made ${edits.length} automated edits`);
    console.log('   Edits:', edits.map(e => `${e.type}: ${e.content}`).join(', '));

    this.modifiedContent = modifiedContent;
    this.edits = edits;
    return modifiedContent;
  }

  // Step 3: Calculate forward diff
  calculateForwardDiff() {
    console.log('🔄 Step 3: Calculating forward diff...');
    
    const diffResult = diffLines(this.originalContent, this.modifiedContent);
    
    console.log(`   Diff parts: ${diffResult.length}`);
    
    // Analyze the diff
    let additions = 0, deletions = 0, unchanged = 0;
    const diffSummary = [];

    diffResult.forEach((part, index) => {
      const lines = part.value.split('\n').filter(l => l.length > 0);
      
      if (part.added) {
        additions += lines.length;
        diffSummary.push(`Part ${index}: +${lines.length} lines`);
      } else if (part.removed) {
        deletions += lines.length;
        diffSummary.push(`Part ${index}: -${lines.length} lines`);
      } else {
        unchanged += lines.length;
        diffSummary.push(`Part ${index}: ${lines.length} unchanged lines`);
      }
    });

    console.log(`   Additions: ${additions}, Deletions: ${deletions}, Unchanged: ${unchanged}`);
    console.log('   Summary:', diffSummary.join(', '));

    this.forwardDiff = diffResult;
    this.diffStats = { additions, deletions, unchanged };
    return diffResult;
  }

  // Step 4: Apply diff to create reverse engineered content
  reverseEngineer() {
    console.log('🔧 Step 4: Reverse engineering from diff...');
    
    let reconstructedContent = '';
    
    this.forwardDiff.forEach((part) => {
      if (part.added) {
        // Skip additions for reverse engineering
        return;
      } else if (part.removed) {
        // Include removed lines
        reconstructedContent += part.value;
      } else {
        // Include unchanged lines
        reconstructedContent += part.value;
      }
    });

    console.log(`   Reconstructed: ${reconstructedContent.length} chars, ${reconstructedContent.split('\n').length} lines`);
    
    this.reconstructedContent = reconstructedContent;
    return reconstructedContent;
  }

  // Step 5: Calculate reverse diff
  calculateReverseDiff() {
    console.log('⏪ Step 5: Calculating reverse diff...');
    
    const reverseDiff = diffLines(this.modifiedContent, this.reconstructedContent);
    
    console.log(`   Reverse diff parts: ${reverseDiff.length}`);
    
    let reverseAdditions = 0, reverseDeletions = 0;
    
    reverseDiff.forEach((part) => {
      const lines = part.value.split('\n').filter(l => l.length > 0);
      
      if (part.added) {
        reverseAdditions += lines.length;
      } else if (part.removed) {
        reverseDeletions += lines.length;
      }
    });

    console.log(`   Reverse additions: ${reverseAdditions}, Reverse deletions: ${reverseDeletions}`);
    
    // Verify reverse diff matches forward diff
    const isConsistent = reverseAdditions === this.diffStats.additions && 
                         reverseDeletions === this.diffStats.deletions;
    
    console.log(`   Consistency check: ${isConsistent ? '✅ PASS' : '❌ FAIL'}`);

    this.reverseDiff = reverseDiff;
    this.isConsistent = isConsistent;
    return reverseDiff;
  }

  // Step 6: Generate formatted diff for display
  generateFormattedDiff() {
    console.log('📝 Step 6: Generating formatted diff...');
    
    const formattedLines = [];
    
    this.forwardDiff.forEach((part) => {
      const lines = part.value.split('\n');
      
      lines.forEach((line) => {
        if (part.added) {
          formattedLines.push(`+${line}`);
        } else if (part.removed) {
          formattedLines.push(`-${line}`);
        } else {
          formattedLines.push(` ${line}`);
        }
      });
    });

    this.formattedDiff = formattedLines.join('\n');
    console.log(`   Formatted diff: ${formattedLines.length} lines`);
    
    // Show sample of formatted diff
    const sampleLines = formattedLines.slice(0, 10);
    console.log('   Sample:');
    sampleLines.forEach((line, i) => {
      if (line.startsWith('+')) {
        console.log(`   ${line}`); // Green in actual display
      } else if (line.startsWith('-')) {
        console.log(`   ${line}`); // Red in actual display
      } else {
        console.log(`   ${line}`);
      }
    });

    return this.formattedDiff;
  }

  // Step 7: Save test files
  saveTestFiles() {
    console.log('💾 Step 7: Saving test files...');
    
    // Save modified content
    writeFileSync(this.testFiles.modified, this.modifiedContent);
    console.log(`   Saved: ${this.testFiles.modified}`);
    
    // Save reverse engineered content
    writeFileSync(this.testFiles.reverse, this.reconstructedContent);
    console.log(`   Saved: ${this.testFiles.reverse}`);
    
    // Save formatted diff
    writeFileSync('public/diff-result.txt', this.formattedDiff);
    console.log('   Saved: public/diff-result.txt');
  }

  // Step 8: Generate test report
  generateReport() {
    console.log('📊 Step 8: Generating test report...');
    
    const report = {
      timestamp: new Date().toISOString(),
      testFiles: this.testFiles,
      originalStats: {
        characters: this.originalContent.length,
        lines: this.originalContent.split('\n').length
      },
      modifiedStats: {
        characters: this.modifiedContent.length,
        lines: this.modifiedContent.split('\n').length
      },
      reconstructedStats: {
        characters: this.reconstructedContent.length,
        lines: this.reconstructedContent.split('\n').length
      },
      diffStats: this.diffStats,
      edits: this.edits,
      consistency: this.isConsistent,
      forwardDiffParts: this.forwardDiff.length,
      reverseDiffParts: this.reverseDiff.length
    };

    const reportJson = JSON.stringify(report, null, 2);
    writeFileSync('public/diff-test-report.json', reportJson);
    console.log('   Saved: public/diff-test-report.json');
    
    console.log('\n📋 TEST REPORT SUMMARY:');
    console.log(`   Original: ${report.originalStats.characters} chars, ${report.originalStats.lines} lines`);
    console.log(`   Modified: ${report.modifiedStats.characters} chars, ${report.modifiedStats.lines} lines`);
    console.log(`   Reconstructed: ${report.reconstructedStats.characters} chars, ${report.reconstructedStats.lines} lines`);
    console.log(`   Edits made: ${report.edits.length}`);
    console.log(`   Diff changes: +${report.diffStats.additions} -${report.diffStats.deletions}`);
    console.log(`   Consistency: ${report.consistency ? '✅ PASS' : '❌ FAIL'}`);

    return report;
  }

  // Run complete test suite
  runCompleteTest() {
    console.log('🚀 Starting Automated Diff Test Suite...\n');
    
    try {
      this.readOriginal();
      this.makeAutomatedEdits(this.originalContent);
      this.calculateForwardDiff();
      this.reverseEngineer();
      this.calculateReverseDiff();
      this.generateFormattedDiff();
      this.saveTestFiles();
      const report = this.generateReport();
      
      console.log('\n✅ Automated diff test completed successfully!');
      return report;
    } catch (error) {
      console.error('❌ Test failed:', error.message);
      throw error;
    }
  }
}

// Run the automated test
const tester = new AutomatedDiffTester();
tester.runCompleteTest();
