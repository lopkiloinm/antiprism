"use client";

import * as Y from "yjs";
import { IndexeddbPersistence } from "y-indexeddb";
import { WebrtcProvider } from "y-webrtc";
import { yjsLogger } from "./logger";

export interface FileDocument {
  doc: Y.Doc;
  text: Y.Text;
  persistence: IndexeddbPersistence;
  webrtcProvider?: WebrtcProvider;
  lastAccessed: number;
  whenLoaded: Promise<void>;
}

export class FileDocumentManager {
  private documents = new Map<string, FileDocument>();
  private projectId: string;
  private globalWebrtcProvider: WebrtcProvider;

  constructor(projectId: string, globalWebrtcProvider: WebrtcProvider) {
    this.projectId = projectId;
    this.globalWebrtcProvider = globalWebrtcProvider;
    yjsLogger.info("FileDocumentManager initialized", {
      projectId,
      hasGlobalProvider: !!globalWebrtcProvider,
    });
  }

  /**
   * Get or create a Yjs document for a specific file
   */
  getDocument(filePath: string, silent = false): FileDocument {
    let doc = this.documents.get(filePath);
    const existed = !!doc;
    
    if (!doc) {
      doc = this.createDocument(filePath);
      this.documents.set(filePath, doc);
    }
    
    doc.lastAccessed = Date.now();
    if (!silent) {
      yjsLogger.info("Get file document", {
        filePath,
        existed,
        totalOpenDocuments: this.documents.size,
        docGuid: doc.doc.guid,
        textLength: doc.text.length,
        indexedDbLoaded: !!(doc.doc as any)._indexedDbLoaded,
      });
    }
    return doc;
  }

  /**
   * Create a new Yjs document with persistence for a file
   */
  private createDocument(filePath: string): FileDocument {
    // Create unique document name based on project and file path
    const docName = `${this.projectId}-${filePath}`;
    
    console.log(`🆕 Creating document for: ${filePath}`);
    console.log(`📝 Document name: ${docName}`);
    yjsLogger.info("Creating file document", { filePath, docName });
    
    const doc = new Y.Doc();
    const text = doc.getText("content");
    const persistence = new IndexeddbPersistence(docName, doc);
    
    // Create WebRTC provider for this specific file
    const webrtcProvider = new WebrtcProvider(`${docName}-webrtc`, doc);
    
    // Create a promise that resolves when the IndexedDB has finished loading
    let loaded = false;
    const whenLoaded = new Promise<void>((resolve) => {
      const done = () => {
        if (loaded) return;
        loaded = true;
        (doc as any)._indexedDbLoaded = true;
        resolve();
      };

      // Resolve on 'synced' — the 'load' event is unreliable and often never fires
      persistence.on('synced', () => {
        console.log(`🔄 File persistence synced: ${filePath}`);
        console.log(`📊 Current content length: ${text.toString().length} chars`);
        yjsLogger.info("IndexedDB synced", {
          filePath,
          docName,
          contentLength: text.toString().length,
          hasContent: text.toString().length > 0,
        });
        done();
      });

      persistence.on('load', () => {
        console.log(`📂 File persistence loaded: ${filePath}`);
        yjsLogger.info("IndexedDB load event", {
          filePath,
          docName,
          contentLength: text.toString().length,
        });
        done();
      });

      // Timeout fallback — never hang forever
      setTimeout(() => {
        if (!loaded) {
          console.warn(`⏰ IndexedDB load timeout for ${filePath}, proceeding`);
          yjsLogger.warn("IndexedDB load timeout", {
            filePath,
            docName,
            contentLength: text.toString().length,
            timeoutMs: 3000,
          });
          done();
        }
      }, 3000);
    });
    
    // Log WebRTC connection status
    webrtcProvider.on('status', (event: any) => {
      console.log(`🌐 WebRTC status for ${filePath}:`, event.status);
      yjsLogger.info("File WebRTC status", {
        filePath,
        docName,
        status: event?.status,
      });
    });
    
    webrtcProvider.on('peers', (event: any) => {
      console.log(`👥 WebRTC peers for ${filePath}:`, event.peers?.length ?? 0);
      yjsLogger.info("File WebRTC peers", {
        filePath,
        docName,
        peersConnected: event?.peers?.length ?? 0,
        peers: event?.peers ?? [],
      });
    });
    
    doc.on('update', (update: any, origin: any) => {
      const contentLength = text.toString().length;
      const originLabel =
        typeof origin === 'string'
          ? origin
          : origin?.constructor?.name || (origin == null ? 'unknown' : typeof origin);
      console.log(`💾 File updated: ${filePath}`, { 
        origin, 
        updateLength: update.length,
        contentLength,
        timestamp: new Date().toISOString()
      });
      yjsLogger.info("Yjs document update", {
        filePath,
        docName,
        origin: originLabel,
        rawOriginType: typeof origin,
        updateBytes: update?.length ?? 0,
        contentLength,
        timestamp: new Date().toISOString(),
      });
      
      // Log when IndexedDB persistence writes
      if (origin !== 'IndexeddbPersistence') {
        console.log(`📝 Writing to IndexedDB: ${filePath} (${contentLength} chars)`);
        yjsLogger.info("IndexedDB write scheduled", {
          filePath,
          docName,
          contentLength,
          origin: originLabel,
        });
      } else {
        console.log(`📥 IndexedDB sync update: ${filePath} (${contentLength} chars)`);
        yjsLogger.info("IndexedDB sync update", {
          filePath,
          docName,
          contentLength,
          origin: originLabel,
        });
      }
      
      // Log WebRTC sync
      if (origin === 'webrtc') {
        console.log(`🌐 WebRTC sync received: ${filePath} (${contentLength} chars)`);
        yjsLogger.info("WebRTC sync received", {
          filePath,
          docName,
          contentLength,
          origin: originLabel,
        });
      }
    });

    return {
      doc,
      text,
      persistence,
      webrtcProvider,
      lastAccessed: Date.now(),
      whenLoaded
    };
  }

  /**
   * Get the Y.Text for a file
   */
  getText(filePath: string): Y.Text {
    return this.getDocument(filePath).text;
  }

  /**
   * Get the WebRTC provider for a file
   */
  getWebrtcProvider(filePath: string): WebrtcProvider | null {
    const doc = this.documents.get(filePath);
    return doc?.webrtcProvider || null;
  }

  /**
   * Check if a file has a document
   */
  hasDocument(filePath: string): boolean {
    return this.documents.has(filePath);
  }

  /**
   * Remove a document (cleanup)
   */
  removeDocument(filePath: string): void {
    const doc = this.documents.get(filePath);
    if (doc) {
      yjsLogger.info("Destroying file document", {
        filePath,
        docGuid: doc.doc.guid,
        textLength: doc.text.length,
        totalOpenDocumentsBefore: this.documents.size,
      });
      doc.persistence.destroy();
      doc.webrtcProvider?.destroy();
      doc.doc.destroy();
      this.documents.delete(filePath);
      console.log(`🗑️ File document destroyed: ${filePath}`);
      yjsLogger.info("File document destroyed", {
        filePath,
        totalOpenDocumentsAfter: this.documents.size,
      });
    }
  }

  /**
   * Cleanup old documents (optional - for memory management)
   */
  cleanup(maxAge: number = 30 * 60 * 1000): void { // 30 minutes default
    const now = Date.now();
    yjsLogger.info("Running file document cleanup", {
      maxAge,
      totalOpenDocumentsBefore: this.documents.size,
    });
    for (const [path, doc] of this.documents.entries()) {
      if (now - doc.lastAccessed > maxAge) {
        this.removeDocument(path);
      }
    }
    yjsLogger.info("File document cleanup complete", {
      maxAge,
      totalOpenDocumentsAfter: this.documents.size,
    });
  }

  /**
   * Destroy all documents
   */
  destroy(): void {
    yjsLogger.warn("Destroying all file documents", {
      totalOpenDocumentsBefore: this.documents.size,
      paths: Array.from(this.documents.keys()),
    });
    for (const [path, doc] of this.documents.entries()) {
      doc.persistence.destroy();
      doc.webrtcProvider?.destroy();
      doc.doc.destroy();
    }
    this.documents.clear();
    yjsLogger.warn("All file documents destroyed", {
      totalOpenDocumentsAfter: this.documents.size,
    });
  }

  /**
   * Get all document paths
   */
  getDocumentPaths(): string[] {
    return Array.from(this.documents.keys());
  }
}
