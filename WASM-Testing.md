# WASM Testing Guide

This document explains how to test the WebAssembly (WASM) functions in Antiprism to ensure they work correctly in both development and production environments.

## Overview

Antiprism uses several WASM modules for client-side compilation and processing:

- **LaTeX Tools** (`wasm-latex-tools`) - Word counting and formatting
- **LaTeX Compiler** (`texlyre-busytex`) - Full LaTeX compilation to PDF
- **Typst Compiler** (`@myriaddreamin/typst.ts`) - Typst compilation to PDF
- **Pandoc WASM** (`pandoc-wasm`) - Markdown to LaTeX conversion

## Test Scripts

### Basic Tests

Quick sanity checks to verify basic functionality:

```bash
npm run test:wasm:basic
```

This runs basic tests for:
- Environment detection
- WASM file accessibility
- Module imports
- Base path handling
- Error handling
- Data structures

### Comprehensive Tests

Full integration tests with detailed reporting:

```bash
npm run test:wasm
```

With verbose output:

```bash
npm run test:wasm --verbose
```

## Test Categories

### 1. Environment Detection
- Development vs production environment
- Base path configuration
- Environment variables

### 2. WASM File Accessibility
- `/core/busytex/busytex.wasm` - LaTeX compiler
- `/core/webperl/emperl.wasm` - Perl runtime
- `/core/webperl/webperl.wasm` - Perl runtime

### 3. Module Functionality
- LaTeX Tools: word counting, formatting
- LaTeX Compiler: PDF compilation, multiple engines
- Typst Compiler: PDF compilation, additional files
- Pandoc WASM: Markdown to LaTeX conversion

### 4. Error Handling
- Network failures
- WASM initialization failures
- Compilation errors
- Graceful degradation

### 5. Logging Integration
- LaTeX logs, Typst logs, AI logs, error logs

## Running Tests

### Development
```bash
npm run dev
npm run test:wasm:basic
```

### Production Build
```bash
npm run build
npm run start
npm run test:wasm:basic
```

## Troubleshooting

### Common Issues

#### WASM Files Not Accessible
- Run: `npm run download-wasm-assets`
- Check `_headers` file for MIME types
- Verify base path configuration

#### Module Initialization Failed
- Check base path handling in production
- Verify CORS headers
- Ensure proper Next.js WASM configuration

#### Compilation Errors
- Check LaTeX/Typst syntax
- Verify additional file paths
- Check memory constraints

### Debug Mode
```bash
npm run test:wasm --verbose
```

## Test Coverage

- Environment detection (100%)
- WASM file accessibility (100%)
- Module imports (100%)
- Basic functionality (90%)
- Error handling (85%)
- Logging integration (100%)
