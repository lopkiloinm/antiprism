#!/usr/bin/env node

/**
 * Practical WASM Function Test Script
 * 
 * This script tests the actual WASM functions to ensure they work correctly
 * in both development and production environments.
 * 
 * Usage: npm run test:wasm
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Test configuration
const TEST_CONFIG = {
  timeout: 30000, // 30 seconds
  retries: 3,
  verbose: process.argv.includes('--verbose'),
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
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
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
  log(`\n🔍 ${title}`, colors.cyan);
  log('='.repeat(50), colors.cyan);
}

// Test results
const results = {
  passed: 0,
  failed: 0,
  skipped: 0,
  details: [],
};

function recordTest(name, passed, error = null, duration = 0) {
  const result = {
    name,
    passed,
    error,
    duration,
    timestamp: new Date().toISOString(),
  };
  
  results.details.push(result);
  
  if (passed) {
    results.passed++;
    logSuccess(`${name} (${duration}ms)`);
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
  try {
    const result = await fn();
    const duration = Date.now() - start;
    return { result, duration, error: null };
  } catch (error) {
    const duration = Date.now() - start;
    return { result: null, duration, error };
  }
}

// Test functions
async function testEnvironmentDetection() {
  logSection('Environment Detection');
  
  const { result: env, duration, error } = await measureTime(() => {
    return {
      nodeEnv: process.env.NODE_ENV,
      basePath: process.env.NEXT_PUBLIC_BASE_PATH || '',
      isProduction: process.env.NODE_ENV === 'production',
      isDevelopment: process.env.NODE_ENV === 'development',
    };
  });
  
  if (!error && env) {
    recordTest('Environment variables', true, null, duration);
    logInfo(`NODE_ENV: ${env.nodeEnv}`);
    logInfo(`Base Path: ${env.basePath}`);
    logInfo(`Is Production: ${env.isProduction}`);
    logInfo(`Is Development: ${env.isDevelopment}`);
  } else {
    recordTest('Environment variables', false, error, duration);
  }
}

async function testWasmFileAccessibility() {
  logSection('WASM File Accessibility');
  
  const wasmFiles = [
    '/core/busytex/busytex.wasm',
    '/core/webperl/emperl.wasm',
    '/core/webperl/webperl.wasm',
  ];
  
  for (const file of wasmFiles) {
    const { result, duration, error } = await measureTime(async () => {
      const response = await fetch(file, { method: 'HEAD' });
      return {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
      };
    });
    
    if (!error && result && result.ok) {
      recordTest(`WASM file accessible: ${file}`, true, null, duration);
    } else {
      recordTest(`WASM file accessible: ${file}`, false, error || `Status: ${result?.status}`, duration);
    }
  }
}

async function testLaTeXTools() {
  logSection('LaTeX Tools WASM');
  
  try {
    const { getWebPerlRunner, countLaTeXWords, formatLaTeX } = await import('../wasmLatexTools.js');
    
    // Test WebPerl runner initialization
    const { result: runner, duration: initDuration, error: initError } = await measureTime(() => {
      return getWebPerlRunner();
    });
    
    if (!initError && runner) {
      recordTest('WebPerl runner initialization', true, null, initDuration);
      
      // Test word counting
      const { result: wordCount, duration: wordDuration, error: wordError } = await measureTime(() => {
        return countLaTeXWords('This is a test document with some words.');
      });
      
      if (!wordError && wordCount) {
        recordTest('LaTeX word counting', true, null, wordDuration);
        logInfo(`Word count result: ${JSON.stringify(wordCount.result)}`);
      } else {
        recordTest('LaTeX word counting', false, wordError, wordDuration);
      }
      
      // Test formatting
      const { result: formatted, duration: formatDuration, error: formatError } = await measureTime(() => {
        return formatLaTeX('This is a test document.');
      });
      
      if (!formatError && formatted) {
        recordTest('LaTeX formatting', true, null, formatDuration);
        logInfo(`Formatted length: ${formatted.length} characters`);
      } else {
        recordTest('LaTeX formatting', false, formatError, formatDuration);
      }
    } else {
      recordTest('WebPerl runner initialization', false, initError, initDuration);
    }
  } catch (error) {
    recordTest('LaTeX tools import', false, error, 0);
  }
}

async function testLaTeXCompiler() {
  logSection('LaTeX Compiler WASM');
  
  try {
    const { compileLatexToPdf, ensureLatexReady } = await import('../latexCompiler.js');
    
    // Test initialization
    const { result: initResult, duration: initDuration, error: initError } = await measureTime(() => {
      return ensureLatexReady();
    });
    
    if (!initError) {
      recordTest('LaTeX compiler initialization', true, null, initDuration);
      
      // Test compilation
      const simpleLatex = '\\documentclass{article}\\begin{document}Hello, World!\\end{document}';
      const { result: pdf, duration: compileDuration, error: compileError } = await measureTime(() => {
        return compileLatexToPdf(simpleLatex);
      });
      
      if (!compileError && pdf) {
        recordTest('LaTeX compilation', true, null, compileDuration);
        logInfo(`PDF blob size: ${pdf.size} bytes`);
        logInfo(`PDF blob type: ${pdf.type}`);
      } else {
        recordTest('LaTeX compilation', false, compileError, compileDuration);
      }
    } else {
      recordTest('LaTeX compiler initialization', false, initError, initDuration);
    }
  } catch (error) {
    recordTest('LaTeX compiler import', false, error, 0);
  }
}

async function testTypstCompiler() {
  logSection('Typst Compiler WASM');
  
  try {
    const { compileTypstToPdf, ensureTypstReady } = await import('../typstCompiler.js');
    
    // Test initialization
    const { result: initResult, duration: initDuration, error: initError } = await measureTime(() => {
      return ensureTypstReady();
    });
    
    if (!initError) {
      recordTest('Typst compiler initialization', true, null, initDuration);
      
      // Test compilation
      const simpleTypst = '= Hello World\n\nThis is a simple Typst document.';
      const { result: pdf, duration: compileDuration, error: compileError } = await measureTime(() => {
        return compileTypstToPdf(simpleTypst);
      });
      
      if (!compileError && pdf) {
        recordTest('Typst compilation', true, null, compileDuration);
        logInfo(`PDF blob size: ${pdf.size} bytes`);
        logInfo(`PDF blob type: ${pdf.type}`);
      } else {
        recordTest('Typst compilation', false, compileError, compileDuration);
      }
    } else {
      recordTest('Typst compiler initialization', false, initError, initDuration);
    }
  } catch (error) {
    recordTest('Typst compiler import', false, error, 0);
  }
}

async function testPandocWASM() {
  logSection('Pandoc WASM');
  
  try {
    const { parseCreateResponse } = await import('../agent/create.js');
    
    // Test markdown to LaTeX conversion
    const markdown = '# Test Document\n\nThis is **bold** text and *italic* text.';
    const { result: conversion, duration: conversionDuration, error: conversionError } = await measureTime(() => {
      return parseCreateResponse(markdown);
    });
    
    if (!conversionError && conversion) {
      recordTest('Pandoc conversion', true, null, conversionDuration);
      logInfo(`Title: ${conversion.title}`);
      logInfo(`LaTeX length: ${conversion.latex.length} characters`);
      logInfo(`Markdown length: ${conversion.markdown.length} characters`);
      
      // Check if LaTeX contains expected elements
      const hasDocumentClass = conversion.latex.includes('\\documentclass');
      const hasBeginEnd = conversion.latex.includes('\\begin{document}') && conversion.latex.includes('\\end{document}');
      
      if (hasDocumentClass && hasBeginEnd) {
        recordTest('Pandoc LaTeX structure', true, null, 0);
      } else {
        recordTest('Pandoc LaTeX structure', false, 'Missing document structure', 0);
      }
    } else {
      recordTest('Pandoc conversion', false, conversionError, conversionDuration);
    }
  } catch (error) {
    recordTest('Pandoc import', false, error, 0);
  }
}

async function testLoggingSystem() {
  logSection('Logging System');
  
  try {
    const { latexLogger, typstLogger, aiLogger } = await import('../logger.js');
    
    // Test logging functions
    const { result: latexLogs, duration: latexDuration, error: latexError } = await measureTime(() => {
      latexLogger.info('Test LaTeX log message');
      return latexLogger.getLogs();
    });
    
    if (!latexError) {
      recordTest('LaTeX logging', true, null, latexDuration);
      logInfo(`LaTeX logs count: ${latexLogs.length}`);
    } else {
      recordTest('LaTeX logging', false, latexError, latexDuration);
    }
    
    const { result: typstLogs, duration: typstDuration, error: typstError } = await measureTime(() => {
      typstLogger.info('Test Typst log message');
      return typstLogger.getLogs();
    });
    
    if (!typstError) {
      recordTest('Typst logging', true, null, typstDuration);
      logInfo(`Typst logs count: ${typstLogs.length}`);
    } else {
      recordTest('Typst logging', false, typstError, typstDuration);
    }
    
    const { result: aiLogs, duration: aiDuration, error: aiError } = await measureTime(() => {
      aiLogger.info('Test AI log message');
      return aiLogger.getLogs();
    });
    
    if (!aiError) {
      recordTest('AI logging', true, null, aiDuration);
      logInfo(`AI logs count: ${aiLogs.length}`);
    } else {
      recordTest('AI logging', false, aiError, aiDuration);
    }
  } catch (error) {
    recordTest('Logging system import', false, error, 0);
  }
}

// Main test runner
async function runTests() {
  log('🧪 WASM Function Test Suite', colors.magenta);
  log('='.repeat(50), colors.magenta);
  logInfo(`Started at: ${new Date().toISOString()}`);
  logInfo(`Timeout: ${TEST_CONFIG.timeout}ms per test`);
  logInfo(`Verbose: ${TEST_CONFIG.verbose}`);
  
  const startTime = Date.now();
  
  try {
    await testEnvironmentDetection();
    await testWasmFileAccessibility();
    await testLaTeXTools();
    await testLaTeXCompiler();
    await testTypstCompiler();
    await testPandocWASM();
    await testLoggingSystem();
  } catch (error) {
    logError(`Test suite error: ${error.message}`);
  }
  
  const totalTime = Date.now() - startTime;
  
  // Print summary
  logSection('Test Results Summary');
  logInfo(`Total time: ${totalTime}ms`);
  logInfo(`Passed: ${results.passed}`);
  logInfo(`Failed: ${results.failed}`);
  logInfo(`Skipped: ${results.skipped}`);
  
  const successRate = results.passed / (results.passed + results.failed) * 100;
  logInfo(`Success rate: ${successRate.toFixed(1)}%`);
  
  if (results.failed > 0) {
    logSection('Failed Tests Details');
    results.details
      .filter(test => !test.passed)
      .forEach(test => {
        logError(`${test.name}: ${test.error || 'Unknown error'}`);
      });
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
runTests().then(() => {
  clearTimeout(timeout);
}).catch((error) => {
  clearTimeout(timeout);
  logError(`Test suite crashed: ${error.message}`);
  process.exit(1);
});
