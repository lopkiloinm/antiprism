/**
 * Web Worker for RxDB operation processing
 * Handles compression, decompression, and bulk operations off main thread
 */

// Import compression polyfill if needed
// importScripts('https://cdn.jsdelivr.net/npm/compression-streams-polyfill@3.1.0/dist/index.js');

class WorkerCompressor {
  async compress(data) {
    try {
      const compressionStream = new CompressionStream('deflate');
      const writer = compressionStream.writable.getWriter();
      const reader = compressionStream.readable.getReader();
      
      writer.write(data);
      writer.close();
      
      const chunks = [];
      let done = false;
      
      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) chunks.push(value);
      }
      
      const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
      const result = new Uint8Array(totalLength);
      let offset = 0;
      
      for (const chunk of chunks) {
        result.set(chunk, offset);
        offset += chunk.length;
      }
      
      return result;
    } catch (error) {
      console.error('Worker compression error:', error);
      return data; // Fallback to uncompressed
    }
  }

  async decompress(data) {
    try {
      const decompressionStream = new DecompressionStream('deflate');
      const writer = decompressionStream.writable.getWriter();
      const reader = decompressionStream.readable.getReader();
      
      writer.write(data);
      writer.close();
      
      const chunks = [];
      let done = false;
      
      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) chunks.push(value);
      }
      
      const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
      const result = new Uint8Array(totalLength);
      let offset = 0;
      
      for (const chunk of chunks) {
        result.set(chunk, offset);
        offset += chunk.length;
      }
      
      return result;
    } catch (error) {
      console.error('Worker decompression error:', error);
      return data; // Fallback to original
    }
  }
}

const compressor = new WorkerCompressor();

// Handle messages from main thread
self.onmessage = async (event) => {
  const { type, data } = event.data;
  
  try {
    switch (type) {
      case 'PROCESS_OPERATION':
        const compressed = await compressor.compress(data.data);
        self.postMessage({
          type: 'PROCESS_OPERATION',
          data: {
            ...data,
            compressedData: compressed
          }
        });
        break;
        
      case 'DECOMPRESS_OPERATION':
        const decompressed = await compressor.decompress(data.data);
        self.postMessage({
          type: 'DECOMPRESS_OPERATION',
          data: decompressed
        });
        break;
        
      case 'BULK_COMPRESS':
        const results = await Promise.all(
          data.operations.map(async (op) => ({
            ...op,
            compressedData: await compressor.compress(op.data)
          }))
        );
        self.postMessage({
          type: 'BULK_COMPRESS',
          data: results
        });
        break;
        
      default:
        throw new Error(`Unknown task type: ${type}`);
    }
  } catch (error) {
    self.postMessage({
      type,
      error: error.message
    });
  }
};

console.log('RxDB Worker initialized');
