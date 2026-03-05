/**
 * Drop-in replacement for FileDocumentManager using the ultra-fast RxDB connector
 * Maintains the same interface for seamless integration
 */

"use client";

import * as Y from "yjs";
import { WebrtcProvider } from "y-webrtc";
import { yjsLogger } from "./logger";
import { FastFileDocumentManager } from "./rxDBFastConnector";

export interface FastFileDocument {
  doc: Y.Doc;
  text: Y.Text;
  webrtcProvider?: WebrtcProvider;
  lastAccessed: number;
  whenLoaded: Promise<void>;
}

/**
 * Enhanced FileDocumentManager using RxDB fast connector
 * Maintains exact same interface as original for drop-in replacement
 */
export class FileDocumentManager {
  private fastManager: FastFileDocumentManager;
  private projectId: string;
  private globalWebrtcProvider: WebrtcProvider;
  private providerOptions: any;
  private documents = new Map<string, FastFileDocument>();

  constructor(projectId: string, globalWebrtcProvider: WebrtcProvider, providerOptions: any = {}) {
    this.projectId = projectId;
    this.globalWebrtcProvider = globalWebrtcProvider;
    this.providerOptions = providerOptions;
    this.fastManager = new FastFileDocumentManager(projectId);
    
    yjsLogger.info("FastFileDocumentManager initialized", {
      projectId,
      hasGlobalProvider: !!globalWebrtcProvider,
    });
  }

  async initialize(): Promise<void> {
    await this.fastManager.initialize();
    yjsLogger.info("FastFileDocumentManager initialized successfully");
  }

  /**
   * Get or create a Yjs document for a specific file
   * Maintains exact same interface as original
   */
  getDocument(filePath: string, silent = false): FastFileDocument {
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
      });
    }
    return doc;
  }

  /**
   * Create a new document using fast connector
   */
  private createDocument(filePath: string): FastFileDocument {
    const docName = `${this.projectId}-${filePath}`;
    
    console.log(`🆕 Creating fast document for: ${filePath}`);
    console.log(`📝 Document name: ${docName}`);
    yjsLogger.info("Creating fast file document", { filePath, docName });
    
    // Get document from fast manager
    const { doc, text, whenLoaded } = this.fastManager.getDocument(filePath, false);
    
    // Create WebRTC provider for this specific file with inherited configuration
    const webrtcProvider = new WebrtcProvider(`${docName}-webrtc`, doc, this.providerOptions);
    
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
      doc.webrtcProvider?.destroy();
      doc.doc.destroy();
    }
    this.documents.clear();
    
    // Destroy fast manager
    this.fastManager.destroy();
    
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

  /**
   * Get performance metrics from fast connector
   */
  getMetrics() {
    return this.fastManager.getMetrics();
  }
}

// Export alias for compatibility
export { FileDocumentManager as FastFileDocumentManager };
