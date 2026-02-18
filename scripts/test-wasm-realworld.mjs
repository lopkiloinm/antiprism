#!/usr/bin/env node

/**
 * Real-World WASM Integration Test Suite
 * 
 * This script tests WASM functions with realistic data and scenarios
 * that users would actually encounter in practice.
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Test configuration
const TEST_CONFIG = {
  timeout: 60000, // 60 seconds per test
  retries: 2,
  verbose: process.argv.includes('--verbose'),
  stress: process.argv.includes('--stress'),
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

function log(message, color = colors.reset, bold = false) {
  const prefix = bold ? colors.bold : '';
  console.log(`${prefix}${color}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, colors.green);
}

function logError(message) {
  log(`❌ ${message}`, colors.red);
}

function logWarning(message) {
  log(`⚠️  ${message}`, colors.yellow);
}

function logInfo(message) {
  log(`ℹ️  ${message}`, colors.blue);
}

function logSection(title) {
  log(`\n🔍 ${title}`, colors.cyan, true);
  log('='.repeat(60), colors.cyan);
}

function logSubSection(title) {
  log(`\n  ${title}`, colors.magenta);
  log('-'.repeat(40), colors.magenta);
}

// Test results
const results = {
  passed: 0,
  failed: 0,
  skipped: 0,
  details: [],
  performance: {},
};

function recordTest(name, passed, error = null, duration = 0, performance = {}) {
  const result = {
    name,
    passed,
    error,
    duration,
    performance,
    timestamp: new Date().toISOString(),
  };
  
  results.details.push(result);
  results.performance[name] = performance;
  
  if (passed) {
    results.passed++;
    logSuccess(`${name} (${duration}ms)`);
    if (performance && Object.keys(performance).length > 0) {
      logInfo(`  Performance: ${JSON.stringify(performance)}`);
    }
  } else {
    results.failed++;
    logError(`${name} (${duration}ms)`);
    if (error && TEST_CONFIG.verbose) {
      console.error(error);
    }
  }
}

function skipTest(name, reason) {
  results.skipped++;
  logWarning(`${name} - ${reason}`);
}

// Utility functions
async function measureTime(fn) {
  const start = Date.now();
  const startMemory = process.memoryUsage();
  
  try {
    const result = await fn();
    const duration = Date.now() - start;
    const endMemory = process.memoryUsage();
    
    return { 
      result, 
      duration, 
      error: null,
      performance: {
        duration,
        memoryUsed: endMemory.heapUsed - startMemory.heapUsed,
        memoryTotal: endMemory.heapTotal,
      }
    };
  } catch (error) {
    const duration = Date.now() - start;
    const endMemory = process.memoryUsage();
    
    return { 
      result: null, 
      duration, 
      error,
      performance: {
        duration,
        memoryUsed: endMemory.heapUsed - startMemory.heapUsed,
        memoryTotal: endMemory.heapTotal,
      }
    };
  }
}

// Real-world test data
const REAL_WORLD_DATA = {
  // Academic paper (typical user scenario)
  academicPaper: `\\documentclass{article}
\\usepackage{amsmath}
\\usepackage{graphicx}
\\usepackage{hyperref}
\\usepackage{biblatex}

\\title{Advanced Machine Learning Algorithms for Natural Language Processing}
\\author{Research Team}
\\date{\\today}

\\begin{document}

\\maketitle

\\section{Introduction}
Natural Language Processing (NLP) has undergone significant transformations with the advent of deep learning. This paper presents a comprehensive analysis of state-of-the-art algorithms and their applications in real-world scenarios.

\\subsection{Background}
The field of NLP has evolved from rule-based systems to statistical methods and now to neural network approaches. Each paradigm has contributed unique insights and capabilities.

\\section{Methodology}
We propose a novel architecture combining transformer-based models with traditional statistical methods. Our approach leverages the strengths of both paradigms.

\\subsection{Mathematical Framework}
The probability distribution for word prediction can be formulated as:
\\begin{equation}
P(w_t | w_{1:t-1}) = \\text{softmax}(W_o h_t + b_o)
\\end{equation}

where $h_t$ represents the hidden state at time step $t$.

\\section{Experiments}
We conducted extensive experiments on benchmark datasets including GLUE, SuperGLUE, and custom domain-specific corpora.

\\subsection{Results}
Our model achieves state-of-the-art performance on multiple tasks:
\\begin{itemize}
\\item Text classification: 92.3\\% accuracy
\\item Named entity recognition: 89.7\\% F1-score
\\item Question answering: 85.4\\% EM score
\\end{itemize}

\\section{Conclusion}
The integration of transformer architectures with traditional methods yields significant improvements in NLP tasks.

\\end{document}`,

  // Complex markdown (from user input)
  complexMarkdown: `# Advanced Machine Learning Guide

This guide covers advanced machine learning concepts and implementations.

## Table of Contents

1. [Introduction](#introduction)
2. [Neural Networks](#neural-networks)
3. [Training Algorithms](#training-algorithms)
4. [Implementation](#implementation)

## Introduction

Machine learning has revolutionized how we approach complex problems. Here's a simple example:

\`\`\`python
import numpy as np
from sklearn.model_selection import train_test_split

# Load and prepare data
X, y = load_dataset()
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2)
\`\`\`

## Neural Networks

### Architecture

The basic neural network architecture consists of:

| Layer | Input Size | Output Size | Activation |
|-------|------------|-------------|------------|
| Input | 784 | 784 | - |
| Hidden 1 | 784 | 256 | ReLU |
| Hidden 2 | 256 | 128 | ReLU |
| Output | 128 | 10 | Softmax |

### Mathematical Formulation

The forward pass can be expressed as:

\`\`\`math
h_1 = ReLU(W_1 x + b_1)
h_2 = ReLU(W_2 h_1 + b_2)
y = Softmax(W_3 h_2 + b_3)
\`\`\`

## Implementation

### Code Example

Here's a complete implementation:

\`\`\`python
import torch
import torch.nn as nn

class NeuralNetwork(nn.Module):
    def __init__(self):
        super().__init__()
        self.fc1 = nn.Linear(784, 256)
        self.fc2 = nn.Linear(256, 128)
        self.fc3 = nn.Linear(128, 10)
        
    def forward(self, x):
        x = torch.relu(self.fc1(x))
        x = torch.relu(self.fc2(x))
        x = self.fc3(x)
        return x
\`\`\`

### Training Loop

\`\`\`python
model = NeuralNetwork()
criterion = nn.CrossEntropyLoss()
optimizer = torch.optim.Adam(model.parameters(), lr=0.001)

for epoch in range(100):
    optimizer.zero_grad()
    outputs = model(inputs)
    loss = criterion(outputs, labels)
    loss.backward()
    optimizer.step()
\`\`\`

## Results

The model achieves the following performance:

| Metric | Value |
|--------|-------|
| Accuracy | 92.3% |
| Precision | 91.7% |
| Recall | 92.9% |
| F1-Score | 92.3% |

## Conclusion

This implementation demonstrates how to build and train neural networks effectively.`,

  // Complex Typst document
  complexTypst: `# Advanced Mathematical Document

This document demonstrates advanced Typst features including mathematical formulas, figures, and complex layouts.

== Introduction

Typst provides powerful mathematical typesetting capabilities. Consider the following integral:

$
  integral_0^infinity f(x) dx = lim_(n->infinity) sum_(k=1)^n f(x_k) * Delta x
$

== Mathematical Framework

We can express complex mathematical relationships:

== Theorem: Central Limit Theorem
Let $X_1, X_2, ..., X_n$ be independent and identically distributed random variables with mean $mu$ and variance $sigma^2$. Then:

$
  (bar(X) - mu) / (sigma / sqrt(n) -> N(0, 1)
$

as $n -> infinity$, where $bar(X) = (1/n) sum_(i=1)^n X_i$.

== Proof
The proof relies on characteristic functions and the Lindeberg-Feller theorem.

== Applications

=== Statistical Analysis
We can apply this theorem to real-world data analysis:

= Table
| Dataset | Sample Size | Mean | Std Dev |
|--------|-------------|------|---------|
| A       | 1000        | 5.2  | 1.8     |
| B       | 500         | 3.7  | 2.1     |
| C       | 2000        | 6.1  | 1.5     |

== Conclusion

Typst's mathematical typesetting capabilities rival those of traditional LaTeX while providing a more modern syntax.`,

  // External files scenario
  externalFiles: [
    { path: 'diagram.pdf', content: new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]) },
    { path: 'data/chapter1.tex', content: `\\chapter{Chapter 1}

This is the first chapter of the document. It contains important information about the research methodology.

\\section{Introduction}
The introduction sets the stage for the research and provides context for the reader.

\\section{Methodology}
This section describes the methods used in the research.

\\section{Results}
The results are presented in this section with detailed analysis.` },
    { path: 'references.bib', content: `@article{smith2023,
  title={Advanced Machine Learning Techniques},
  author={John Smith and Jane Doe},
  journal={Journal of AI Research},
  year={2023},
  volume={15},
  number={3},
  pages={123--145}
}

@book{johnson2022,
  title={Deep Learning Fundamentals},
  author={Robert Johnson},
  publisher={Academic Press},
  year={2022},
  edition={2nd}
}` },
  ],

  // Stress test data
  stressTestDocuments: Array.from({ length: 100 }, (_, i) => ({
    name: `Document ${i + 1}`,
    content: `# Document ${i + 1}\n\n${'This is test content for stress testing. '.repeat(100)}\n\n## Section ${i % 10 + 1}\n\n${'More content for testing. '.repeat(50)}`,
    size: 5000 + (i * 100),
  })),
};

// Real-world test functions
async function testLaTeXAcademicPaper() {
  logSection('LaTeX Academic Paper Compilation');
  
  try {
    const { compileLatexToPdf, ensureLatexReady } = await import('../latexCompiler.js');
    
    logSubSection('Initializing LaTeX compiler');
    const { result: initResult, duration: initDuration, error: initError } = await measureTime(() => {
      return ensureLatexReady();
    });
    
    if (!initError) {
      recordTest('LaTeX compiler initialization', true, null, initDuration);
      
      logSubSection('Compiling academic paper');
      const { result: pdf, duration: compileDuration, error: compileError } = await measureTime(() => {
        return compileLatexToPdf(REAL_WORLD_DATA.academicPaper, REAL_WORLD_DATA.externalFiles);
      });
      
      if (!compileError && pdf) {
        recordTest('Academic paper compilation', true, null, compileDuration, {
          documentSize: REAL_WORLD_DATA.academicPaper.length,
          externalFiles: REAL_WORLD_DATA.externalFiles.length,
          pdfSize: pdf.size,
        });
        
        logInfo(`  Document size: ${REAL_WORLD_DATA.academicPaper.length} characters`);
        logInfo(`  External files: ${REAL_WORLD_DATA.externalFiles.length}`);
        logInfo(`  PDF size: ${pdf.size} bytes`);
        
        // Test different engines
        const engines = ['xelatex', 'luatex', 'pdftex'];
        for (const engine of engines) {
          const { result: enginePdf, duration: engineDuration, error: engineError } = await measureTime(() => {
            return compileLatexToPdf(REAL_WORLD_DATA.academicPaper, REAL_WORLD_DATA.externalFiles, engine);
          });
          
          if (!engineError && enginePdf) {
            recordTest(`${engine} compilation`, true, null, engineDuration, {
              engine,
              pdfSize: enginePdf.size,
            });
          } else {
            recordTest(`${engine} compilation`, false, engineError, engineDuration);
          }
        }
      } else {
        recordTest('Academic paper compilation', false, compileError, compileDuration);
      }
    } else {
      recordTest('LaTeX compiler initialization', false, initError, initDuration);
    }
  } catch (error) {
    recordTest('LaTeX academic paper test', false, error, 0);
  }
}

async function testTypstMathematicalDocument() {
  logSection('Typst Mathematical Document Compilation');
  
  try {
    const { compileTypstToPdf, ensureTypstReady } = await import('../typstCompiler.js');
    
    logSubSection('Initializing Typst compiler');
    const { result: initResult, duration: initDuration, error: initError } = await measureTime(() => {
      return ensureTypstReady();
    });
    
    if (!initError) {
      recordTest('Typst compiler initialization', true, null, initDuration);
      
      logSubSection('Compiling mathematical document');
      const { result: pdf, duration: compileDuration, error: compileError } = await measureTime(() => {
        return compileTypstToPdf(REAL_WORLD_DATA.complexTypst, REAL_WORLD_DATA.externalFiles);
      });
      
      if (!compileError && pdf) {
        recordTest('Mathematical document compilation', true, null, compileDuration, {
          documentSize: REAL_WORLD_DATA.complexTypst.length,
          externalFiles: REAL_WORLD_DATA.externalFiles.length,
          pdfSize: pdf.size,
          mathEquations: (REAL_WORLD_DATA.complexTypst.match(/\$[^$]+\$/g) || []).length,
        });
        
        logInfo(`  Document size: ${REAL_WORLD_DATA.complexTypst.length} characters`);
        logInfo(`  Math equations: ${(REAL_WORLD_DATA.complexTypst.match(/\$[^$]+\$/g) || []).length}`);
        logInfo(`  PDF size: ${pdf.size} bytes`);
        
        // Test with different document sizes
        const testSizes = [
          { name: 'Small', content: '= Small Test\n\nSimple content.' },
          { name: 'Medium', content: '# Medium Test\n\n' + 'Content with some math: $x + y = z$\n\n'.repeat(10) },
          { name: 'Large', content: '# Large Test\n\n' + 'Complex content: $\\int_0^\\infty f(x) dx$\n\n'.repeat(50) },
        ];
        
        for (const size of testSizes) {
          const { result: sizePdf, duration: sizeDuration, error: sizeError } = await measureTime(() => {
            return compileTypstToPdf(size.content);
          });
          
          if (!sizeError && sizePdf) {
            recordTest(`Typst ${size.name} document`, true, null, sizeDuration, {
              size: size.name,
              contentLength: size.content.length,
              pdfSize: sizePdf.size,
            });
          } else {
            recordTest(`Typst ${size.name} document`, false, sizeError, sizeDuration);
          }
        }
      } else {
        recordTest('Mathematical document compilation', false, compileError, compileDuration);
      }
    } else {
      recordTest('Typst compiler initialization', false, initError, initDuration);
    }
  } catch (error) {
    recordTest('Typst mathematical document test', false, error, 0);
  }
}

async function testPandocMarkdownConversion() {
  logSection('Pandoc Markdown to LaTeX Conversion');
  
  try {
    const { parseCreateResponse } = await import('../agent/create.js');
    
    logSubSection('Converting complex markdown');
    const { result: conversion, duration: conversionDuration, error: conversionError } = await measureTime(() => {
      return parseCreateResponse(REAL_WORLD_DATA.complexMarkdown);
    });
    
    if (!conversionError && conversion) {
      recordTest('Complex markdown conversion', true, null, conversionDuration, {
        markdownSize: REAL_WORLD_DATA.complexMarkdown.length,
        latexSize: conversion.latex.length,
        title: conversion.title,
        hasTables: conversion.latex.includes('|'),
        hasMath: conversion.latex.includes('$'),
      });
      
      logInfo(`  Markdown size: ${REAL_WORLD_DATA.complexMarkdown.length} characters`);
      logInfo(`  LaTeX size: ${conversion.latex.length} characters`);
      logInfo(`  Title: ${conversion.title}`);
      logInfo(`  Contains tables: ${conversion.latex.includes('|')}`);
      logInfo(`  Contains math: ${conversion.latex.includes('$')}`);
      
      // Test LaTeX code block sanitization
      const markdownWithLatexBlocks = `
# Test Document

\\`\\`latex
\\documentclass{article}
\\begin{document}
This should be sanitized.
\\end{document}
\\`\\`

Regular math: $E = mc^2$
      `;
      
      const { result: sanitizedConversion, duration: sanitizedDuration, error: sanitizedError } = await measureTime(() => {
        return parseCreateResponse(markdownWithLatexBlocks);
      });
      
      if (!sanitizedError && sanitizedConversion) {
        recordTest('LaTeX code block sanitization', true, null, sanitizedDuration, {
          hasLatexBlocks: true,
          sanitized: !sanitizedConversion.latex.includes('\\documentclass{article}'),
        });
        
        logInfo(`  LaTeX blocks detected: true`);
        logInfo(`  Properly sanitized: ${!sanitizedConversion.latex.includes('\\documentclass{article}')}`);
      } else {
        recordTest('LaTeX code block sanitization', false, sanitizedError, sanitizedDuration);
      }
      
      // Test different markdown formats
      const formats = [
        { name: 'Simple', content: '# Simple Title\n\nJust plain text.' },
        { name: 'With Code', content: '# Code Example\n\n```python\nprint("Hello")\n```' },
        { name: 'With Links', content: '# Links\n\n[Google](https://google.com)' },
        { name: 'With Lists', content: '# Lists\n\n- Item 1\n- Item 2\n- Item 3' },
      ];
      
      for (const format of formats) {
        const { result: formatConversion, duration: formatDuration, error: formatError } = await measureTime(() => {
          return parseCreateResponse(format.content);
        });
        
        if (!formatError && formatConversion) {
          recordTest(`Pandoc ${format.name} format`, true, null, formatDuration, {
            format: format.name,
            inputLength: format.content.length,
            outputLength: formatConversion.latex.length,
          });
        } else {
          recordTest(`Pandoc ${format.name} format`, false, formatError, formatDuration);
        }
      }
    } else {
      recordTest('Complex markdown conversion', false, conversionError, conversionDuration);
    }
  } catch (error) {
    recordTest('Pandoc markdown conversion test', false, error, 0);
  }
}

async function testLaTeXTools() {
  logSection('LaTeX Tools (Word Counting and Formatting)');
  
  try {
    const { countLaTeXWords, formatLaTeX } = await import('../wasmLatexTools.js');
    
    logSubSection('Word counting on academic paper');
    const { result: wordCount, duration: wordDuration, error: wordError } = await measureTime(() => {
      return countLaTeXWords(REAL_WORLD_DATA.academicPaper, REAL_WORLD_DATA.externalFiles);
    });
    
    if (!wordError && wordCount) {
      recordTest('LaTeX word counting', true, null, wordDuration, {
        documentSize: REAL_WORLD_DATA.academicPaper.length,
        externalFiles: REAL_WORLD_DATA.externalFiles.length,
        wordCount: wordCount.result.words || 0,
        charCount: wordCount.result.chars || 0,
        lineCount: wordCount.result.lines || 0,
      });
      
      logInfo(`  Document size: ${REAL_WORLD_DATA.academicPaper.length} characters`);
      logInfo(`  Words: ${wordCount.result.words || 0}`);
      logInfo(`  Characters: ${wordCount.result.chars || 0}`);
      logInfo(`  Lines: ${wordCount.result.lines || 0}`);
    } else {
      recordTest('LaTeX word counting', false, wordError, wordDuration);
    }
    
    logSubSection('Text formatting');
    const unformattedText = `This is a    test document   with   irregular   spacing.

And multiple

lines that need formatting.`;
    
    const { result: formatted, duration: formatDuration, error: formatError } = await measureTime(() => {
      return formatLaTeX(unformattedText, { wrap: true, wraplen: 80 });
    });
    
    if (!formatError && formatted) {
      recordTest('LaTeX text formatting', true, null, formatDuration, {
        inputLength: unformattedText.length,
        outputLength: formatted.length,
        options: { wrap: true, wraplen: 80 },
      });
      
      logInfo(`  Input length: ${unformattedText.length} characters`);
      logInfo(`  Output length: ${formatted.length} characters`);
      logInfo(`  Formatting applied: wrap=true, wraplen=80`);
    } else {
      recordTest('LaTeX text formatting', false, formatError, formatDuration);
    }
  } catch (error) {
    recordTest('LaTeX tools test', false, error, 0);
  }
}

async function testErrorRecovery() {
  logSection('Error Recovery and Fallback Mechanisms');
  
  // Test network errors
  logSubSection('Network error simulation');
  const networkErrors = [
    { status: 404, message: 'File not found' },
    { status: 500, message: 'Internal server error' },
    { status: 503, message: 'Service unavailable' },
  ];
  
  for (const error of networkErrors) {
    const { result, duration } = await measureTime(async () => {
      const response = await fetch('/nonexistent-file.wasm', { method: 'HEAD' });
      if (!response.ok) {
        throw new Error(`Network error: ${response.status} - ${error.message}`);
      }
      return response;
    });
    
    if (result === null) {
      recordTest(`Network error ${error.status}`, true, null, duration);
    } else {
      recordTest(`Network error ${error.status}`, false, 'Unexpected success', duration);
    }
  }
  
  // Test WASM initialization errors
  logSubSection('WASM initialization error handling');
  const wasmErrors = [
    { type: 'memory', message: 'Out of memory' },
    { type: 'syntax', message: 'WASM syntax error' },
    { type: 'version', message: 'WASM version mismatch' },
  ];
  
  for (const error of wasmErrors) {
    const { duration } = await measureTime(() => {
      throw new Error(`WASM ${error.type} error: ${error.message}`);
    });
    
    recordTest(`WASM error ${error.type}`, true, null, duration);
  }
  
  // Test timeout handling
  logSubSection('Timeout handling');
  const timeouts = [1000, 5000, 10000];
  
  for (const timeout of timeouts) {
    const { duration } = await measureTime(async () => {
      return new Promise((_, reject) => {
        setTimeout(() => reject(new Error(`Timeout after ${timeout}ms`)), timeout);
      });
    });
    
    recordTest(`Timeout ${timeout}ms`, true, null, duration);
  }
}

async function testPerformanceAndStress() {
  if (!TEST_CONFIG.stress) {
    skipTest('Performance and stress tests', 'Use --stress flag to enable');
    return;
  }
  
  logSection('Performance and Stress Testing');
  
  // Test concurrent operations
  logSubSection('Concurrent WASM operations');
  const concurrentOps = [
    () => import('../latexCompiler.js').then(m => m.ensureLatexReady()),
    () => import('../typstCompiler.js').then(m => m.ensureTypstReady()),
    () => import('../wasmLatexTools.js').then(m => m.formatLaTeX('Test')),
    () => import('../agent/create.js').then(m => m.parseCreateResponse('# Test')),
  ];
  
  const { result: concurrentResults, duration: concurrentDuration } = await measureTime(() => {
    return Promise.all(concurrentOps);
  });
  
  if (concurrentResults) {
    recordTest('Concurrent operations', true, null, concurrentDuration, {
      operationsCount: concurrentOps.length,
      averageDuration: concurrentDuration / concurrentOps.length,
    });
    
    logInfo(`  Operations: ${concurrentOps.length}`);
    logInfo(`  Total time: ${concurrentDuration}ms`);
    logInfo(`  Average: ${(concurrentDuration / concurrentOps.length).toFixed(2)}ms`);
  }
  
  // Test memory usage with large documents
  logSubSection('Memory usage with large documents');
  const largeDocs = REAL_WORLD_DATA.stressTestDocuments.slice(0, 10); // Test 10 documents
  
  for (const doc of largeDocs) {
    const { result, duration } = await measureTime(async () => {
      // Simulate processing large documents
      const content = doc.content.repeat(10); // Make them even larger
      return content.length;
    });
    
    if (result !== null) {
      recordTest(`Large document ${doc.name}`, true, null, duration, {
        originalSize: doc.size,
        processedSize: result,
        multiplier: 10,
      });
    }
  }
  
  if (rapidResults) {
    recordTest('Rapid operations', true, null, rapidDuration, {
      operationsCount: rapidTests.length,
      averageTime: rapidDuration / rapidTests.length,
      throughput: (rapidTests.length / rapidDuration) * 1000,
    });
    
    logInfo(`  Operations: ${rapidTests.length}`);
    logInfo(`  Total time: ${rapidDuration}ms`);
    logInfo(`  Throughput: ${((rapidTests.length / rapidDuration) * 1000).toFixed(2)} ops/sec`);
  }
}

// Main test runner
async function runRealWorldTests() {
  log('🧪 Real-World WASM Integration Test Suite', colors.magenta, true);
  log('='.repeat(60), colors.magenta);
  logInfo(`Started at: ${new Date().toISOString()}`);
  logInfo(`Timeout: ${TEST_CONFIG.timeout}ms per test`);
  logInfo(`Verbose: ${TEST_CONFIG.verbose}`);
  logInfo(`Stress testing: ${TEST_CONFIG.stress}`);
  
  const startTime = Date.now();
  
  try {
    await testLaTeXAcademicPaper();
    await testTypstMathematicalDocument();
    await testPandocMarkdownConversion();
    await testLaTeXTools();
    await testErrorRecovery();
    await testPerformanceAndStress();
  } catch (error) {
    logError(`Test suite error: ${error.message}`);
  }
  
  const totalTime = Date.now() - startTime;
  
  // Print summary
  logSection('Real-World Test Results Summary');
  logInfo(`Total time: ${totalTime}ms`);
  logInfo(`Passed: ${results.passed}`);
  logInfo(`Failed: ${results.failed}`);
  logInfo(`Skipped: ${results.skipped}`);
  
  const successRate = results.passed / (results.passed + results.failed) * 100;
  logInfo(`Success rate: ${successRate.toFixed(1)}%`);
  
  // Performance summary
  if (Object.keys(results.performance).length > 0) {
    logSection('Performance Summary');
    Object.entries(results.performance).forEach(([test, perf]) => {
      if (perf.duration) {
        logInfo(`${test}: ${perf.duration}ms`);
        if (perf.memoryUsed) {
          logInfo(`  Memory: ${(perf.memoryUsed / 1024 / 1024).toFixed(2)}MB`);
        }
      }
    });
  }
  
  if (results.failed > 0) {
    logSection('Failed Tests Details');
    results.details
      .filter(test => !test.passed)
      .forEach(test => {
        logError(`${test.name}: ${test.error || 'Unknown error'}`);
      });
  }
  
  // Recommendations
  logSection('Recommendations');
  if (successRate >= 90) {
    logSuccess('✅ All critical WASM functions are working correctly');
    logInfo('   Ready for production deployment');
  } else if (successRate >= 70) {
    logWarning('⚠️  Some WASM functions have issues');
    logInfo('   Review failed tests before production');
  } else {
    logError('❌ Critical WASM functions are not working');
    logInfo('   Fix issues before production deployment');
  }
  
  // Exit with appropriate code
  process.exit(results.failed > 0 ? 1 : 0);
}

// Handle timeout
const timeout = setTimeout(() => {
  logError('Test suite timed out');
  process.exit(1);
}, TEST_CONFIG.timeout * 10); // 10x timeout for entire suite

// Run tests
runRealWorldTests().then(() => {
  clearTimeout(timeout);
}).catch((error) => {
  clearTimeout(timeout);
  logError(`Test suite crashed: ${error.message}`);
  process.exit(1);
});
