#!/usr/bin/env node

// Debug script to understand the diff issue
console.log('🔍 Debugging Git Diff Issue...\n');

// Simulate the problematic scenario
const testScenarios = [
  {
    name: "New file (no commits)",
    originalContent: "",
    currentContent: "Line 1\nLine 2\nLine 3",
    showDiffLogic: () => {
      let originalContent = "";
      let showDiff = true;
      
      // Simulate the logic from GitPanelReal
      const repo = { commits: [] }; // No commits
      if (repo && repo.commits.length > 0) {
        // This won't execute
      } else {
        showDiff = false;
      }
      
      console.log(`Scenario: ${arguments.callee.name}`);
      console.log(`  originalContent: "${originalContent}"`);
      console.log(`  currentContent: "${currentContent}"`);
      console.log(`  showDiff: ${showDiff}`);
      return showDiff;
    }
  },
  {
    name: "File not in last commit",
    originalContent: "",
    currentContent: "Line 1\nLine 2\nLine 3", 
    showDiffLogic: () => {
      let originalContent = "";
      let showDiff = true;
      
      const repo = { commits: [{ files: [] }] }; // Has commits but no files
      if (repo && repo.commits.length > 0) {
        const lastCommit = repo.commits[0];
        const fileInCommit = lastCommit.files.find((f) => f.path === "test.txt");
        if (fileInCommit) {
          originalContent = fileInCommit.content;
        } else {
          showDiff = false;
        }
      } else {
        showDiff = false;
      }
      
      console.log(`Scenario: ${arguments.callee.name}`);
      console.log(`  originalContent: "${originalContent}"`);
      console.log(`  currentContent: "${currentContent}"`);
      console.log(`  showDiff: ${showDiff}`);
      return showDiff;
    }
  },
  {
    name: "Modified file",
    originalContent: "Original content",
    currentContent: "Modified content",
    showDiffLogic: () => {
      let originalContent = "";
      let showDiff = true;
      
      const repo = { 
        commits: [{ 
          files: [{ 
            path: "test.txt", 
            content: "Original content",
            hash: "abc123" 
          }] 
        }] 
      };
      
      if (repo && repo.commits.length > 0) {
        const lastCommit = repo.commits[0];
        const fileInCommit = lastCommit.files.find((f) => f.path === "test.txt");
        if (fileInCommit) {
          originalContent = fileInCommit.content;
        } else {
          showDiff = false;
        }
      } else {
        showDiff = false;
      }
      
      console.log(`Scenario: ${arguments.callee.name}`);
      console.log(`  originalContent: "${originalContent}"`);
      console.log(`  currentContent: "${currentContent}"`);
      console.log(`  showDiff: ${showDiff}`);
      console.log(`  Hashes match: ${originalContent === "Original content"}`);
      return showDiff;
    }
  }
];

// Test each scenario
testScenarios.forEach((scenario, index) => {
  console.log(`\n--- Test ${index + 1}: ${scenario.name} ---`);
  const shouldShowDiff = scenario.showDiffLogic();
  console.log(`Should show diff: ${shouldShowDiff}`);
  
  if (shouldShowDiff) {
    console.log("❌ PROBLEM: This would show a diff when it shouldn't!");
    console.log("   Result: Every line would show '+' sign");
  } else {
    console.log("✅ CORRECT: No diff shown");
  }
});

console.log('\n🎯 Summary:');
console.log('The issue is that showDiff is being set to false correctly');
console.log('but the GitDiffView component might still be receiving showDiff: true');
console.log('Check the ProjectPageClient.tsx onFileSelect handler!');
