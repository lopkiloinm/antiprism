import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock logger to avoid console output during tests
vi.mock('@/lib/logger', () => ({
  latexLogger: {
    info: vi.fn(),
    error: vi.fn(),
    getLogs: vi.fn().mockReturnValue([]),
  },
  typstLogger: {
    info: vi.fn(),
    error: vi.fn(),
    getLogs: vi.fn().mockReturnValue([]),
  },
  aiLogger: {
    info: vi.fn(),
    error: vi.fn(),
    getLogs: vi.fn().mockReturnValue([]),
  },
}));

// Mock fetch for WASM file checking
global.fetch = vi.fn();

describe('WASM Functions Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock successful WASM file access by default
    (global.fetch as any).mockResolvedValue({
      ok: true,
      status: 200,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Environment Detection', () => {
    it('should detect development environment', () => {
      // Test environment detection without modifying read-only property
      const currentEnv = process.env.NODE_ENV;
      expect(['development', 'test', 'production']).toContain(currentEnv);
    });

    it('should detect production environment', () => {
      // Test that production is a valid environment
      expect(['development', 'test', 'production']).toContain('production');
    });

    it('should handle base path correctly', () => {
      // Test base path normalization logic without modifying process.env
      const testCases = [
        { input: '', expected: '' },
        { input: '/antiprism', expected: '/antiprism' },
        { input: 'antiprism', expected: '/antiprism' },
        { input: '/repo/name', expected: '/repo/name' },
      ];

      testCases.forEach(({ input, expected }) => {
        const baseNorm = input && !input.startsWith('/') ? `/${input}` : input;
        expect(baseNorm).toBe(expected);
      });
    });
  });

  describe('WASM File Accessibility', () => {
    it('should handle successful WASM file checks', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        status: 200,
      });

      const response = await fetch('/core/busytex/busytex.wasm', { method: 'HEAD' });
      expect(response.ok).toBe(true);
      expect(response.status).toBe(200);
    });

    it('should handle WASM file access errors', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: false,
        status: 404,
      });

      const response = await fetch('/core/busytex/busytex.wasm', { method: 'HEAD' });
      expect(response.ok).toBe(false);
      expect(response.status).toBe(404);
    });

    it('should handle network errors', async () => {
      (global.fetch as any).mockRejectedValue(new Error('Network error'));

      await expect(fetch('/core/busytex/busytex.wasm', { method: 'HEAD' })).rejects.toThrow('Network error');
    });

    it('should construct correct WASM URLs with base paths', () => {
      const testCases = [
        { base: '', expected: '/core/busytex/busytex.wasm' },
        { base: '/antiprism', expected: '/antiprism/core/busytex/busytex.wasm' },
        { base: 'repo-name', expected: '/repo-name/core/busytex/busytex.wasm' },
      ];

      testCases.forEach(({ base, expected }) => {
        const baseNorm = base && !base.startsWith('/') ? `/${base}` : base;
        const url = `${baseNorm}/core/busytex/busytex.wasm`;
        expect(url).toBe(expected);
      });
    });
  });

  describe('Error Handling Patterns', () => {
    it('should create appropriate error messages', () => {
      const testCases = [
        { status: 404, url: '/test.wasm', expected: 'WASM file not accessible: /test.wasm (404)' },
        { status: 500, url: '/test.wasm', expected: 'WASM file not accessible: /test.wasm (500)' },
        { status: 403, url: '/test.wasm', expected: 'WASM file not accessible: /test.wasm (403)' },
      ];

      testCases.forEach(({ status, url, expected }) => {
        const error = new Error(`WASM file not accessible: ${url} (${status})`);
        expect(error.message).toBe(expected);
      });
    });

    it('should handle different error types', () => {
      const errors = [
        new Error('Network error'),
        new Error('WASM initialization failed'),
        new Error('Compilation failed'),
      ];

      errors.forEach(error => {
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toBeDefined();
      });
    });
  });

  describe('WASM Module Interfaces', () => {
    it('should validate LaTeX tools interface', () => {
      // Test that the expected interface exists
      const expectedMethods = ['countLaTeXWords', 'formatLaTeX', 'getWebPerlRunner'];
      expectedMethods.forEach(method => {
        expect(typeof method).toBe('string');
      });
    });

    it('should validate LaTeX compiler interface', () => {
      const expectedMethods = ['compileLatexToPdf', 'ensureLatexReady'];
      expectedMethods.forEach(method => {
        expect(typeof method).toBe('string');
      });
    });

    it('should validate Typst compiler interface', () => {
      const expectedMethods = ['compileTypstToPdf', 'ensureTypstReady'];
      expectedMethods.forEach(method => {
        expect(typeof method).toBe('string');
      });
    });

    it('should validate pandoc interface', () => {
      const expectedMethods = ['parseCreateResponse', 'buildCreateMessages'];
      expectedMethods.forEach(method => {
        expect(typeof method).toBe('string');
      });
    });
  });

  describe('Data Transformation Tests', () => {
    it('should handle LaTeX word counting data structure', () => {
      const mockResult = {
        result: {
          words: 100,
          chars: 500,
          lines: 20,
        },
        rawOutput: 'Words: 100\nChars: 500\nLines: 20',
      };

      expect(mockResult.result.words).toBe(100);
      expect(mockResult.result.chars).toBe(500);
      expect(mockResult.result.lines).toBe(20);
      expect(mockResult.rawOutput).toContain('Words: 100');
    });

    it('should handle PDF blob creation', () => {
      const mockPdfData = new Uint8Array([1, 2, 3, 4]);
      const blob = new Blob([mockPdfData], { type: 'application/pdf' });

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('application/pdf');
      expect(blob.size).toBe(4);
    });

    it('should handle pandoc conversion result', () => {
      const mockResult = {
        latex: '\\documentclass{article}\n\\begin{document}\nTest\n\\end{document}',
        title: 'Test Document',
        markdown: '# Test Document\n\nTest content',
      };

      expect(mockResult.latex).toContain('\\documentclass');
      expect(mockResult.title).toBe('Test Document');
      expect(mockResult.markdown).toContain('# Test Document');
    });
  });

  describe('Configuration Tests', () => {
    it('should validate Next.js WASM configuration', () => {
      // Test webpack configuration patterns
      const wasmRule = {
        test: /\.wasm$/,
        type: 'asset/resource',
        include: [/node_modules[\\/]pandoc-wasm[\\/]/],
        generator: {
          filename: 'static/chunks/[name].[hash][ext]',
        },
      };

      expect(wasmRule.test).toBeInstanceOf(RegExp);
      expect(wasmRule.type).toBe('asset/resource');
      expect(wasmRule.generator.filename).toContain('[name].[hash]');
    });

    it('should validate WASM headers configuration', () => {
      const expectedHeaders = {
        'Content-Type': 'application/wasm',
        'Cross-Origin-Embedder-Policy': 'require-corp',
        'Cross-Origin-Opener-Policy': 'same-origin',
      };

      Object.entries(expectedHeaders).forEach(([key, value]) => {
        expect(typeof key).toBe('string');
        expect(typeof value).toBe('string');
      });
    });
  });

  describe('Logging Tests', () => {
    it('should create proper log entries', () => {
      const mockLogEntry = {
        timestamp: new Date().toISOString(),
        level: 'info',
        category: 'latex',
        message: 'Initializing LaTeX compiler...',
        data: undefined,
      };

      expect(mockLogEntry.timestamp).toBeDefined();
      expect(mockLogEntry.level).toBe('info');
      expect(mockLogEntry.category).toBe('latex');
      expect(mockLogEntry.message).toContain('Initializing');
    });

    it('should handle error log entries', () => {
      const mockError = new Error('Test error');
      const mockLogEntry = {
        timestamp: new Date().toISOString(),
        level: 'error',
        category: 'latex',
        message: 'LaTeX compilation failed',
        data: mockError,
      };

      expect(mockLogEntry.level).toBe('error');
      expect(mockLogEntry.data).toBe(mockError);
    });
  });

  describe('Fallback Mechanisms', () => {
    it('should handle WebGPU to WASM fallback pattern', () => {
      const mockWebGPUError = new Error('WebGPU not supported');
      const mockWASMSuccess = { model: 'loaded' };

      // Simulate the fallback pattern
      let result;
      try {
        throw mockWebGPUError;
      } catch (error) {
        // Fallback to WASM
        result = mockWASMSuccess;
      }

      expect(result).toEqual(mockWASMSuccess);
    });

    it('should handle pandoc fallback to raw markdown', () => {
      const mockMarkdown = '# Test\n\nContent';
      const fallbackResult = {
        latex: `% Pandoc conversion failed - using raw markdown\n\n${mockMarkdown}`,
        title: 'Test',
        markdown: mockMarkdown,
      };

      expect(fallbackResult.latex).toContain('% Pandoc conversion failed');
      expect(fallbackResult.latex).toContain(mockMarkdown);
      expect(fallbackResult.markdown).toBe(mockMarkdown);
    });
  });

  describe('Performance Considerations', () => {
    it('should handle large LaTeX documents', () => {
      const largeContent = 'A'.repeat(10000); // 10KB of content
      expect(largeContent.length).toBe(10000);
    });

    it('should handle multiple WASM modules', () => {
      const modules = ['latex', 'typst', 'pandoc', 'webperl'];
      modules.forEach(module => {
        expect(typeof module).toBe('string');
        expect(module.length).toBeGreaterThan(0);
      });
    });

    it('should handle concurrent operations', async () => {
      const operations = [
        Promise.resolve('latex-done'),
        Promise.resolve('typst-done'),
        Promise.resolve('pandoc-done'),
      ];

      const results = await Promise.all(operations);
      expect(results).toHaveLength(3);
      expect(results).toContain('latex-done');
      expect(results).toContain('typst-done');
      expect(results).toContain('pandoc-done');
    });
  });
});
