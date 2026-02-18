/**
 * WASM Loading Status and Verification Utilities
 */

export interface WasmStatus {
  webAssemblySupported: boolean;
  streamingSupported: boolean;
  filesAccessible: boolean;
  initialized: boolean;
  errors: string[];
}

export class WasmStatusChecker {
  private static instance: WasmStatusChecker;
  private status: WasmStatus = {
    webAssemblySupported: false,
    streamingSupported: false,
    filesAccessible: false,
    initialized: false,
    errors: []
  };

  static getInstance(): WasmStatusChecker {
    if (!WasmStatusChecker.instance) {
      WasmStatusChecker.instance = new WasmStatusChecker();
    }
    return WasmStatusChecker.instance;
  }

  async checkWebAssemblySupport(): Promise<boolean> {
    try {
      if (typeof WebAssembly === 'undefined') {
        this.status.errors.push('WebAssembly is not supported in this browser');
        return false;
      }

      // Test basic WebAssembly functionality
      const wasmCode = new Uint8Array([0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00]);
      const wasmModule = await WebAssembly.compile(wasmCode);
      
      this.status.webAssemblySupported = true;
      return true;
    } catch (error) {
      this.status.errors.push(`WebAssembly support check failed: ${error}`);
      return false;
    }
  }

  async checkStreamingSupport(): Promise<boolean> {
    try {
      this.status.streamingSupported = !!WebAssembly.compileStreaming;
      return this.status.streamingSupported;
    } catch (error) {
      this.status.errors.push(`WebAssembly streaming support check failed: ${error}`);
      return false;
    }
  }

  async checkWasmFiles(urls: string[]): Promise<boolean> {
    const results = await Promise.allSettled(
      urls.map(async (url) => {
        try {
          const response = await fetch(url, { method: 'HEAD' });
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }
          
          const contentType = response.headers.get('content-type');
          if (!contentType?.includes('application/wasm')) {
            console.warn(`WASM file has incorrect content type: ${url} (${contentType})`);
          }
          
          return { url, success: true };
        } catch (error) {
          return { url, success: false, error: String(error) };
        }
      })
    );

    const failed = results.filter(r => r.status === 'rejected' || !r.value?.success);
    if (failed.length > 0) {
      failed.forEach(f => {
        const error = f.status === 'rejected' ? f.reason : f.value?.error;
        this.status.errors.push(`WASM file check failed: ${error}`);
      });
      return false;
    }

    this.status.filesAccessible = true;
    return true;
  }

  async verifyWasmModule(module: any, testName: string): Promise<boolean> {
    try {
      // Basic functionality test
      if (typeof module?.isInitialized === 'function') {
        if (!module.isInitialized()) {
          this.status.errors.push(`${testName} module is not properly initialized`);
          return false;
        }
      }

      this.status.initialized = true;
      return true;
    } catch (error) {
      this.status.errors.push(`${testName} module verification failed: ${error}`);
      return false;
    }
  }

  getStatus(): WasmStatus {
    return { ...this.status };
  }

  reset(): void {
    this.status = {
      webAssemblySupported: false,
      streamingSupported: false,
      filesAccessible: false,
      initialized: false,
      errors: []
    };
  }

  async runFullCheck(wasmUrls: string[]): Promise<WasmStatus> {
    this.reset();
    
    await this.checkWebAssemblySupport();
    await this.checkStreamingSupport();
    await this.checkWasmFiles(wasmUrls);
    
    return this.getStatus();
  }
}

// Global instance
export const wasmStatusChecker = WasmStatusChecker.getInstance();
