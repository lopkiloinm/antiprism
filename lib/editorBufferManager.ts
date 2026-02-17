/**
 * Manages the mapping between multiple file paths and a single shared text buffer.
 *
 * The editor uses one Y.Text (or any mutable string buffer) for the active file.
 * When switching files, the current buffer content is saved to an in-memory cache
 * and the new file's content is loaded into the buffer.
 *
 * Extracted from ProjectPageClient so the save/load/switch logic can be unit-tested
 * without React.
 */

const BINARY_EXT = /\.(jpg|jpeg|png|gif|webp|bmp|svg|pdf|woff|woff2|ttf|otf|zip|gz|tar)$/i;

export interface TextBuffer {
  get(): string;
  set(content: string): void;
}

export class EditorBufferManager {
  private activePath: string;
  private cache: Map<string, string>;
  private buffer: TextBuffer;

  constructor(buffer: TextBuffer, initialPath: string) {
    this.buffer = buffer;
    this.activePath = initialPath;
    this.cache = new Map();
  }

  getActivePath(): string {
    return this.activePath;
  }

  getCache(): Map<string, string> {
    return this.cache;
  }

  getCachedContent(path: string): string | undefined {
    return this.cache.get(path);
  }

  /** Save the current buffer content to the cache under the active path. */
  saveActiveToCache(): void {
    if (this.activePath && !BINARY_EXT.test(this.activePath)) {
      this.cache.set(this.activePath, this.buffer.get());
    }
  }

  /**
   * Switch to a different file.
   * 1. Saves current buffer → cache (under current active path)
   * 2. Updates active path
   * 3. Loads new content into the buffer
   *
   * @param newPath  The file path to switch to
   * @param content  The content to load (from cache, fs, etc.)
   */
  switchTo(newPath: string, content: string): void {
    // Save current content BEFORE changing the active path
    this.saveActiveToCache();
    this.activePath = newPath;
    this.buffer.set(content);
  }

  /**
   * Switch to an image tab (no buffer content to load).
   * Saves current buffer and updates active path.
   */
  switchToImage(newPath: string): void {
    this.saveActiveToCache();
    this.activePath = newPath;
  }

  /** Get the current buffer content (e.g. for compiling). */
  getBufferContent(): string {
    return this.buffer.get();
  }
}
