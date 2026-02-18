/**
 * Synchronization primitives for preventing race conditions
 */

/**
 * Semaphore for limiting concurrent operations (e.g., AI generation)
 */
export class Semaphore {
  private queue: Array<{ resolve: Function; reject: Function }> = [];
  private running = 0;
  private maxConcurrent: number;

  constructor(maxConcurrent: number = 1) {
    this.maxConcurrent = maxConcurrent;
  }

  async acquire(): Promise<void> {
    if (this.running < this.maxConcurrent) {
      this.running++;
      return Promise.resolve();
    }
    
    return new Promise((resolve, reject) => {
      this.queue.push({ resolve, reject });
    });
  }

  release(): void {
    if (this.running > 0) {
      this.running--;
    }
    
    if (this.queue.length > 0) {
      const next = this.queue.shift()!;
      this.running++;
      next.resolve();
    }
  }

  async with<T>(fn: () => Promise<T>): Promise<T> {
    await this.acquire();
    try {
      return await fn();
    } finally {
      this.release();
    }
  }

  get available(): number {
    return this.maxConcurrent - this.running;
  }

  get queued(): number {
    return this.queue.length;
  }
}

/**
 * Mutex for exclusive access to resources (e.g., cache operations)
 */
export class Mutex {
  private locked = false;
  private queue: Array<{ resolve: Function; reject: Function }> = [];

  async acquire(): Promise<void> {
    if (!this.locked) {
      this.locked = true;
      return Promise.resolve();
    }
    
    return new Promise((resolve, reject) => {
      this.queue.push({ resolve, reject });
    });
  }

  release(): void {
    this.locked = false;
    
    if (this.queue.length > 0) {
      const next = this.queue.shift()!;
      this.locked = true;
      next.resolve();
    }
  }

  async with<T>(fn: () => Promise<T>): Promise<T> {
    await this.acquire();
    try {
      return await fn();
    } finally {
      this.release();
    }
  }

  get isLocked(): boolean {
    return this.locked;
  }

  get queued(): number {
    return this.queue.length;
  }
}

/**
 * Read-Write lock for allowing concurrent reads but exclusive writes
 */
export class ReadWriteLock {
  private readers = 0;
  private writer = false;
  private writerQueue: Array<() => void> = [];
  private readerQueue: Array<() => void> = [];

  async acquireRead(): Promise<void> {
    if (this.writer) {
      return new Promise(resolve => this.readerQueue.push(resolve));
    }
    this.readers++;
    return Promise.resolve();
  }

  async acquireWrite(): Promise<void> {
    if (this.writer || this.readers > 0) {
      return new Promise(resolve => this.writerQueue.push(resolve));
    }
    this.writer = true;
    return Promise.resolve();
  }

  releaseRead(): void {
    this.readers--;
    if (this.readers === 0 && this.writerQueue.length > 0) {
      this.writer = true;
      const next = this.writerQueue.shift()!;
      next();
    }
  }

  releaseWrite(): void {
    this.writer = false;
    // Wake up waiting readers first (reader-writer fairness)
    while (this.readerQueue.length > 0) {
      const next = this.readerQueue.shift()!;
      this.readers++;
      next();
    }
    // Then wake up next writer if no readers
    if (this.readerQueue.length === 0 && this.writerQueue.length > 0) {
      this.writer = true;
      const next = this.writerQueue.shift()!;
      next();
    }
  }

  async withRead<T>(fn: () => Promise<T>): Promise<T> {
    await this.acquireRead();
    try {
      return await fn();
    } finally {
      this.releaseRead();
    }
  }

  async withWrite<T>(fn: () => Promise<T>): Promise<T> {
    await this.acquireWrite();
    try {
      return await fn();
    } finally {
      this.releaseWrite();
    }
  }

  get state(): { readers: number; writer: boolean; writerQueue: number; readerQueue: number } {
    return {
      readers: this.readers,
      writer: this.writer,
      writerQueue: this.writerQueue.length,
      readerQueue: this.readerQueue.length,
    };
  }
}

/**
 * Key-based mutex for cache operations
 */
export class KeyedMutex {
  private locks = new Map<string, Promise<void>>();

  async lock(key: string): Promise<void> {
    // Wait for existing lock to resolve
    while (this.locks.has(key)) {
      await this.locks.get(key)!;
    }
    
    // Create new lock
    const lockPromise = Promise.resolve();
    this.locks.set(key, lockPromise);
  }

  unlock(key: string): void {
    this.locks.delete(key);
  }

  async with<T>(key: string, fn: () => Promise<T>): Promise<T> {
    await this.lock(key);
    try {
      return await fn();
    } finally {
      this.unlock(key);
    }
  }

  get lockedKeys(): string[] {
    return Array.from(this.locks.keys());
  }
}

/**
 * Request deduplication - prevents duplicate concurrent operations
 */
export class RequestDeduplicator<K, V> {
  private pending = new Map<K, Promise<V>>();

  async deduplicate(key: K, fn: () => Promise<V>): Promise<V> {
    if (this.pending.has(key)) {
      return this.pending.get(key)!;
    }

    const promise = fn().finally(() => {
      this.pending.delete(key);
    });
    
    this.pending.set(key, promise);
    return promise;
  }

  get pendingKeys(): K[] {
    return Array.from(this.pending.keys());
  }

  clear(): void {
    this.pending.clear();
  }
}

// Global instances for common use cases
export const generationSemaphore = new Semaphore(1); // Single AI generation at a time
export const cacheMutex = new KeyedMutex(); // Per-key cache locking
export const modelStateLock = new ReadWriteLock(); // Model state synchronization
export const wasmInitDeduplicator = new RequestDeduplicator<string, any>(); // Prevent duplicate WASM init
